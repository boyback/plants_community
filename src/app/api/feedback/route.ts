/**
 * POST /api/feedback
 *
 * 用户提交反馈,作为一条私信发到超级管理员邮箱(User.isSuperAdmin = true)。
 *
 * Body: { content: string, category?: 'bug' | 'feature' | 'content' | 'other' }
 *
 * 限频:同用户 60s/条,1h 内最多 5 条
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

const Body = z.object({
  content: z.string().min(5, '反馈至少 5 个字').max(2000, '反馈不超过 2000 字'),
  category: z.enum(['bug', 'feature', 'content', 'other']).optional(),
});

const CATEGORY_LABEL: Record<string, string> = {
  bug: '🐛 缺陷',
  feature: '✨ 建议',
  content: '📝 内容',
  other: '💬 其他',
};

// 进程内限频(单容器够用)
const lastSent = new Map<string, number>();
const sentLog = new Map<string, number[]>();
const COOLDOWN = 60 * 1000;
const HOUR = 60 * 60 * 1000;
const HOUR_MAX = 5;

export const POST = handler(async (req) => {
  const me = await requireUser();
  const { content, category } = Body.parse(await req.json());

  // 限频
  const now = Date.now();
  const last = lastSent.get(me.id);
  if (last && now - last < COOLDOWN) {
    return fail(429, `请 ${Math.ceil((COOLDOWN - (now - last)) / 1000)} 秒后再试`);
  }
  const arr = (sentLog.get(me.id) || []).filter((t) => now - t < HOUR);
  if (arr.length >= HOUR_MAX) {
    return fail(429, `1 小时内最多反馈 ${HOUR_MAX} 条`);
  }

  // 找超级管理员(全站唯一)
  const sa = await prisma.user.findFirst({
    where: { isSuperAdmin: true },
    select: { id: true },
  });
  if (!sa) {
    return fail(503, '系统超级管理员未配置,请稍后再试');
  }

  // 拼私信内容
  const tag = category ? CATEGORY_LABEL[category] || '' : '';
  const text = `[${tag || '反馈'}]\n${content}`;

  await prisma.message.create({
    data: {
      fromId: me.id,
      toId: sa.id,
      text,
    },
  });

  lastSent.set(me.id, now);
  arr.push(now);
  sentLog.set(me.id, arr);

  return { ok: true };
});
