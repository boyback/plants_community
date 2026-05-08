import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser, isVipActive } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const skin = await prisma.skinItem.findUnique({ where: { id } });
  if (!skin || !skin.enabled) return fail(404, '皮肤不存在');
  if (skin.vipOnly && !isVipActive(me)) return fail(403, '该皮肤仅大会员可解锁');

  // 已拥有
  const owned = await prisma.userSkin.findUnique({
    where: { userId_skinId: { userId: me.id, skinId: skin.id } },
  });
  if (owned) return fail(400, '你已经拥有该皮肤');

  if (skin.pricePoints > me.pointsBalance) {
    return fail(400, '积分不足');
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
