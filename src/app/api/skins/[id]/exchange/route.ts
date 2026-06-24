import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

function parseMeta(meta?: string | null) {
  if (!meta) return {};
  try {
    const parsed = JSON.parse(meta) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const skin = await prisma.skinItem.findUnique({ where: { id } });
  if (!skin || !skin.enabled) return fail(404, '皮肤不存在');
  const meta = parseMeta(skin.meta);
  if (skin.kind === 'pendant' && meta.unlockType !== 'points') {
    return fail(403, '该头像挂饰需要通过社区玩法解锁');
  }

  // 已拥有
  const owned = await prisma.userSkin.findUnique({
    where: { userId_skinId: { userId: me.id, skinId: skin.id } },
  });
  if (owned) return fail(400, '你已经拥有该皮肤');

  if (skin.pricePoints > me.pointsBalance) {
    return fail(400, '钻石不足');
  }

  await prisma.$transaction(async (tx) => {
    if (skin.pricePoints > 0) {
      const u = await tx.user.update({
        where: { id: me.id },
        data: { pointsBalance: { decrement: skin.pricePoints } },
        select: { pointsBalance: true },
      });
      await tx.pointsLedger.create({
        data: {
          userId: me.id,
          type: 'exchange_skin',
          delta: -skin.pricePoints,
          balance: u.pointsBalance,
          refType: 'skin',
          refId: skin.id,
          remark: `兑换皮肤「${skin.name}」`,
        },
      });
    }
    await tx.userSkin.create({
      data: {
        userId: me.id,
        skinId: skin.id,
        obtainedFrom: 'exchange',
      },
    });
  });

  return { ok: true };
});
