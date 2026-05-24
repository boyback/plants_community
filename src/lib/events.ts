/**
 * 事件总线:用户行为发生时触发副作用(加积分/EXP/活跃度、推任务进度、自动升级、发通知)。
 *
 * 用法:在业务 API 里调 `emitEvent(...)`,这里负责把所有副作用一次性写入数据库。
 *
 * 设计取舍:
 * - 同步事务,不引入消息队列
 * - 每条事件落 ledger,便于追溯与排行榜聚合
 */

import { prisma } from './db';
import type { Prisma } from '@prisma/client';
import { LEVELS } from './levels';
import { levelByConfiguredExp } from './permissions';

// 事件统一类型
export type AppEvent =
  | { kind: 'signin'; userId: string }
  | { kind: 'post_create'; userId: string; postId: string }
  | { kind: 'post_liked'; userId: string; postId: string; fromId: string }
  | { kind: 'post_collected'; userId: string; postId: string; fromId: string }
  | { kind: 'comment_create'; userId: string; commentId: string; postId: string }
  | { kind: 'followed'; userId: string; followerId: string }
  | { kind: 'vote_cast'; userId: string; postId: string }
  | { kind: 'purchase_paid'; userId: string; orderId: string; amountCent: number; pointsBack: number }
  | { kind: 'vip_open'; userId: string; days: number };

// 各事件的「奖励配方」
const REWARD_CONFIG: Record<
  AppEvent['kind'],
  { points: number; exp: number; activity: number }
> = {
  signin:         { points: 10, exp: 5,  activity: 1 },
  post_create:    { points: 20, exp: 20, activity: 5 },
  post_liked:     { points: 1,  exp: 1,  activity: 1 },
  post_collected: { points: 2,  exp: 2,  activity: 3 },
  comment_create: { points: 3,  exp: 3,  activity: 2 },
  followed:       { points: 5,  exp: 5,  activity: 0 },
  vote_cast:      { points: 0,  exp: 0,  activity: 1 },
  purchase_paid:  { points: 0,  exp: 10, activity: 5 }, // points 由 pointsBack 决定
  vip_open:       { points: 0,  exp: 50, activity: 0 },
};

const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

// 事件 → 默认 reward 计算 + VIP 加成
async function getMultiplier(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipExpireAt: true, vipLifetime: true },
  });
  if (!u) return 1;
  const isVip = u.vipLifetime || (u.vipExpireAt && u.vipExpireAt.getTime() > Date.now());
  return isVip ? 10 : 1; // VIP 10x 活跃度加成(对全部奖励生效)
}

/**
 * 主入口:发出事件 → 写所有副作用
 *
 * 返回:此次事件实际落账的奖励数据。
 */
export async function emitEvent(ev: AppEvent): Promise<{
  pointsAdded: number;
  expAdded: number;
  activityAdded: number;
  newLevel?: number;
  unlockedPerms?: string[];
}> {
  const baseCfg = REWARD_CONFIG[ev.kind];
  const multiplier = await getMultiplier(ev.userId);

  let pts = baseCfg.points * multiplier;
  let exp = baseCfg.exp * multiplier;
  let act = baseCfg.activity * multiplier;
  const computedLevelForExp = exp !== 0 ? await levelByConfiguredExp : null;

  // 特殊情况:purchase 的 points 来自商品的 pointsBack
  if (ev.kind === 'purchase_paid') pts = ev.pointsBack * multiplier;

  // 自反过滤:被点赞的是自己,不要给自己发通知/加分(实际由调用方传 fromId 时处理)
  if (
    (ev.kind === 'post_liked' || ev.kind === 'post_collected') &&
    ev.fromId === ev.userId
  ) {
    return { pointsAdded: 0, expAdded: 0, activityAdded: 0 };
  }

  return await prisma.$transaction(async (tx) => {
    let pointsAdded = 0;
    let expAdded = 0;
    let activityAdded = 0;
    let newLevel: number | undefined;
    let unlockedPerms: string[] | undefined;

    // 1) 积分
    if (pts !== 0) {
      const u = await tx.user.update({
        where: { id: ev.userId },
        data: { pointsBalance: { increment: pts } },
        select: { pointsBalance: true },
      });
      await tx.pointsLedger.create({
        data: {
          userId: ev.userId,
          type: pointsTypeFor(ev.kind),
          delta: pts,
          balance: u.pointsBalance,
          refType: refTypeFor(ev),
          refId: refIdFor(ev),
          remark: remarkFor(ev),
        },
      });
      pointsAdded = pts;
    }

    // 2) 经验值 + 自动升级
    if (exp !== 0) {
      const u = await tx.user.update({
        where: { id: ev.userId },
        data: { exp: { increment: exp } },
        select: { exp: true, level: true },
      });
      await tx.expLedger.create({
        data: {
          userId: ev.userId,
          type: expTypeFor(ev.kind),
          delta: exp,
          total: u.exp,
          refType: refTypeFor(ev),
          refId: refIdFor(ev),
        },
      });
      expAdded = exp;

      const computedLevel = computedLevelForExp ? await computedLevelForExp(u.exp) : u.level;
      if (computedLevel > u.level) {
        await tx.user.update({
          where: { id: ev.userId },
          data: { level: computedLevel },
        });
        newLevel = computedLevel;
        unlockedPerms = (LEVELS.find((l) => l.level === computedLevel)?.permissions ?? []).map(
          String
        );

        // 升级通知
        await tx.notification.create({
          data: {
            recipientId: ev.userId,
            type: 'system',
            text: `🎉 恭喜升级到 Lv.${computedLevel}「${LEVELS.find((l) => l.level === computedLevel)?.name}」!解锁权限:${
              unlockedPerms.join('、') || '无'
            }`,
          },
        });
      }
    }

    // 3) 活跃度
    if (act !== 0) {
      const ym = monthKey();
      await tx.activityLedger.create({
        data: {
          userId: ev.userId,
          type: activityTypeFor(ev.kind),
          delta: act,
          yearMonth: ym,
          refType: refTypeFor(ev),
          refId: refIdFor(ev),
        },
      });
      // 同步月度快照
      await tx.monthlyActivity.upsert({
        where: { userId_yearMonth: { userId: ev.userId, yearMonth: ym } },
        update: { score: { increment: act } },
        create: { userId: ev.userId, yearMonth: ym, score: act },
      });
      activityAdded = act;
    }

    // 4) 任务进度
    await advanceTasks(tx, ev);

    return { pointsAdded, expAdded, activityAdded, newLevel, unlockedPerms };
  });
}

/* ----------- 任务进度推进 ------------ */

async function advanceTasks(
  tx: Prisma.TransactionClient,
  ev: AppEvent
) {
  const tasks = await tx.task.findMany({
    where: { enabled: true, triggerEvent: ev.kind },
  });
  if (tasks.length === 0) return;

  for (const t of tasks) {
    const cycleKey =
      t.kind === 'daily'
        ? dayKey()
        : t.kind === 'monthly'
        ? monthKey()
        : 'always';

    const tp = await tx.taskProgress.upsert({
      where: {
        userId_taskId_cycleKey: {
          userId: ev.userId,
          taskId: t.id,
          cycleKey,
        },
      },
      update: { progress: { increment: 1 } },
      create: {
        userId: ev.userId,
        taskId: t.id,
        cycleKey,
        progress: 1,
      },
    });

    // 达成时只更新 completed 标志,奖励发放走 /api/tasks/claim
    if (!tp.completed && tp.progress >= t.target) {
      await tx.taskProgress.update({
        where: {
          userId_taskId_cycleKey: {
            userId: ev.userId,
            taskId: t.id,
            cycleKey,
          },
        },
        data: { completed: true, completedAt: new Date() },
      });

      // 提醒可领取
      await tx.notification.create({
        data: {
          recipientId: ev.userId,
          type: 'system',
          text: `${t.icon} 任务「${t.title}」已完成,前往「活跃度中心」领取奖励`,
          link: '/tasks',
        },
      });
    }
  }
}

/* ----------- 类型映射工具 ------------ */

function pointsTypeFor(kind: AppEvent['kind']):
  | 'signin'
  | 'post_create'
  | 'post_liked'
  | 'comment_create'
  | 'comment_liked'
  | 'followed'
  | 'task_complete'
  | 'activity_reward'
  | 'purchase_back'
  | 'recharge'
  | 'exchange_skin'
  | 'exchange_vip'
  | 'refund'
  | 'admin' {
  switch (kind) {
    case 'signin':         return 'signin';
    case 'post_create':    return 'post_create';
    case 'post_liked':     return 'post_liked';
    case 'comment_create': return 'comment_create';
    case 'followed':       return 'followed';
    case 'purchase_paid':  return 'purchase_back';
    default:               return 'admin';
  }
}

function expTypeFor(kind: AppEvent['kind']):
  | 'signin'
  | 'post_create'
  | 'post_liked'
  | 'post_collected'
  | 'comment_create'
  | 'followed'
  | 'purchase'
  | 'vip_open'
  | 'admin' {
  switch (kind) {
    case 'signin':         return 'signin';
    case 'post_create':    return 'post_create';
    case 'post_liked':     return 'post_liked';
    case 'post_collected': return 'post_collected';
    case 'comment_create': return 'comment_create';
    case 'followed':       return 'followed';
    case 'purchase_paid':  return 'purchase';
    case 'vip_open':       return 'vip_open';
    default:               return 'admin';
  }
}

function activityTypeFor(kind: AppEvent['kind']):
  | 'signin'
  | 'post_create'
  | 'post_liked'
  | 'post_collected'
  | 'comment_create'
  | 'vote_cast'
  | 'purchase'
  | 'task_complete' {
  switch (kind) {
    case 'signin':         return 'signin';
    case 'post_create':    return 'post_create';
    case 'post_liked':     return 'post_liked';
    case 'post_collected': return 'post_collected';
    case 'comment_create': return 'comment_create';
    case 'vote_cast':      return 'vote_cast';
    case 'purchase_paid':  return 'purchase';
    default:               return 'task_complete';
  }
}

function refTypeFor(ev: AppEvent): string | null {
  switch (ev.kind) {
    case 'post_create':
    case 'post_liked':
    case 'post_collected':
    case 'vote_cast':
      return 'post';
    case 'comment_create':
      return 'comment';
    case 'followed':
      return 'follow';
    case 'purchase_paid':
      return 'order';
    default:
      return null;
  }
}
function refIdFor(ev: AppEvent): string | null {
  switch (ev.kind) {
    case 'post_create':
    case 'post_liked':
    case 'post_collected':
    case 'vote_cast':
      return ev.postId;
    case 'comment_create':
      return ev.commentId;
    case 'followed':
      return ev.followerId;
    case 'purchase_paid':
      return ev.orderId;
    default:
      return null;
  }
}
function remarkFor(ev: AppEvent): string {
  switch (ev.kind) {
    case 'signin':         return '每日签到';
    case 'post_create':    return '发布帖子';
    case 'post_liked':     return '帖子被点赞';
    case 'post_collected': return '帖子被收藏';
    case 'comment_create': return '发布评论';
    case 'followed':       return '被关注';
    case 'vote_cast':      return '参与投票';
    case 'purchase_paid':  return '订单返利';
    case 'vip_open':       return '开通大会员';
  }
}
