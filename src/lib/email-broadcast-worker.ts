/**
 * 邮件群发任务消费者(单进程内置 worker)
 *
 * 流程:
 *   1. admin 后台创建 EmailBroadcast (status=draft)
 *   2. admin 启动 → status=sending,触发 worker
 *   3. worker 从 EmailRecipient (broadcastId, status=pending) 取下一个,发送
 *   4. 节流:每条间隔 throttleMs(默认 4s,免费版 SMTP 200/天上限)
 *   5. recipient.status = sent / failed,broadcast.sent / failed 计数 +1
 *   6. 全部 done → broadcast.status = done
 *
 * 单进程,worker 启动后挂在 setInterval 上,持续从 db 抓任务。
 *
 * 多副本风险:目前生产 next 是单容器,不会并发消费导致重复发。
 * 如未来扩多副本,需在 EmailRecipient 加 lock 字段(claim/release)。
 */
import { prisma } from './db';
import { sendMail } from './email-mailer';
import { makeUnsubscribeUrl } from './email-unsubscribe';

const UNSUB_PLACEHOLDER = 'https://__UNSUBSCRIBE_URL__/';

const POLL_INTERVAL_MS = 5000; // 5s 检查一次有没有 sending 任务
const globalForWorker = globalThis as unknown as {
  emailBroadcastWorkerTimer?: ReturnType<typeof setInterval>;
};

/** 应用启动时调用一次,启动后台 polling */
export function startEmailBroadcastWorker() {
  if (globalForWorker.emailBroadcastWorkerTimer) return;
  // eslint-disable-next-line no-console
  console.log('[email-broadcast] worker started, polling every 5s');
  globalForWorker.emailBroadcastWorkerTimer = setInterval(tick, POLL_INTERVAL_MS);
}

/** 每个 tick 执行一次 — 找一个 sending 任务,发一条 */
async function tick() {
  try {
    const broadcast = await prisma.emailBroadcast.findFirst({
      where: { status: 'sending' },
      orderBy: { startedAt: 'asc' }, // 先来的先发
    });
    if (!broadcast) return;

    // 节流:距上次发送不到 throttleMs 跳过
    const lastRecip = await prisma.emailRecipient.findFirst({
      where: { broadcastId: broadcast.id, sentAt: { not: null } },
      orderBy: { sentAt: 'desc' },
    });
    if (lastRecip?.sentAt) {
      const elapsed = Date.now() - lastRecip.sentAt.getTime();
      if (elapsed < broadcast.throttleMs) return;
    }

    // 取下一个 pending recipient
    const recip = await prisma.emailRecipient.findFirst({
      where: { broadcastId: broadcast.id, status: 'pending' },
    });
    if (!recip) {
      // 没有了 → 标记 done
      await prisma.emailBroadcast.update({
        where: { id: broadcast.id },
        data: { status: 'done', completedAt: new Date() },
      });
      // eslint-disable-next-line no-console
      console.log(`[email-broadcast] ✓ broadcast ${broadcast.id} done`);
      return;
    }

    // 检查是否被取消订阅
    const user = await prisma.user.findUnique({
      where: { id: recip.userId },
      select: { emailUnsubscribed: true, email: true },
    });
    if (!user || user.emailUnsubscribed) {
      await prisma.emailRecipient.update({
        where: { id: recip.id },
        data: { status: 'skipped', error: '用户已取消订阅或邮箱不存在' },
      });
      return;
    }

    // 把模板里的取消订阅 placeholder 替换为该用户的真实 token URL
    const unsubUrl = await makeUnsubscribeUrl(recip.userId);
    const html = broadcast.html.split(UNSUB_PLACEHOLDER).join(unsubUrl);
    const text = broadcast.text
      ? broadcast.text.split(UNSUB_PLACEHOLDER).join(unsubUrl)
      : undefined;

    // 实际发送
    const r = await sendMail({
      to: recip.email,
      subject: broadcast.subject,
      html,
      text,
    });

    if (r.ok) {
      await prisma.$transaction([
        prisma.emailRecipient.update({
          where: { id: recip.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
            attempts: { increment: 1 },
          },
        }),
        prisma.emailBroadcast.update({
          where: { id: broadcast.id },
          data: { sent: { increment: 1 } },
        }),
      ]);
      // eslint-disable-next-line no-console
      console.log(`[email-broadcast] ✓ ${recip.email} (broadcast=${broadcast.id})`);
    } else {
      await prisma.$transaction([
        prisma.emailRecipient.update({
          where: { id: recip.id },
          data: {
            status: 'failed',
            error: r.error || 'unknown',
            attempts: { increment: 1 },
          },
        }),
        prisma.emailBroadcast.update({
          where: { id: broadcast.id },
          data: { failed: { increment: 1 }, lastError: r.error || null },
        }),
      ]);
      console.warn(`[email-broadcast] ✗ ${recip.email}: ${r.error}`);
    }
  } catch (e) {
    console.error('[email-broadcast] tick error:', e);
  }
}
