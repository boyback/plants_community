import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeAddress } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

const Body = z.object({
  name: z.string().min(1).max(40).optional(),
  phone: z.string().min(5).max(20).optional(),
  detail: z.string().min(2).max(200).optional(),
  province: z.string().max(40).nullable().optional(),
  city: z.string().max(40).nullable().optional(),
  district: z.string().max(40).nullable().optional(),
  zip: z.string().max(20).nullable().optional(),
  tag: z.string().max(20).nullable().optional(),
  isDefault: z.boolean().optional(),
});

function pickId(req: Request) {
  return new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
}

async function ensureMine(id: string, meId: string) {
  const a = await prisma.address.findUnique({ where: { id } });
  if (!a) throw new Error('NOT_FOUND');
  if (a.userId !== meId) throw new Error('FORBIDDEN');
  return a;
}

export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  try {
    await ensureMine(id, me.id);
  } catch (e) {
    return fail(e instanceof Error && e.message === 'NOT_FOUND' ? 404 : 403, '地址不存在或无权操作');
  }
  const body = Body.parse(await req.json());

  const updated = await prisma.$transaction(async (tx) => {
    if (body.isDefault === true) {
      await tx.address.updateMany({
        where: { userId: me.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.update({
      where: { id },
      data: body,
    });
  });
  return serializeAddress(updated);
});

export const DELETE = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  let target;
  try {
    target = await ensureMine(id, me.id);
  } catch (e) {
    return fail(e instanceof Error && e.message === 'NOT_FOUND' ? 404 : 403, '地址不存在或无权操作');
  }

  await prisma.address.delete({ where: { id } });

  // 如果删除的是默认地址,把最新的一条设为默认
  if (target.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId: me.id },
      orderBy: { updatedAt: 'desc' },
    });
    if (next) {
      await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }
  return { ok: true };
});
