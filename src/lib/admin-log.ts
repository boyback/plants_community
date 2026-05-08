import { prisma } from './db';

/**
 * 记录管理员操作。尽量 fire-and-forget,失败不影响主流程。
 */
export async function logAdmin(args: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  reason?: string;
  meta?: unknown;
  ip?: string;
}) {
  try {
    await prisma.adminLog.create({
      data: {
        actorId: args.actorId,
        action: args.action,
        targetType: args.targetType,
        targetId: args.targetId ?? null,
        reason: args.reason ?? null,
        meta: (args.meta ?? null) as unknown as object,
        ip: args.ip ?? null,
      },
    });
  } catch (err) {
    console.warn('[admin-log] failed:', err);
  }
}
