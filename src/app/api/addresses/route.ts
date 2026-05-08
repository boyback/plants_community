import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeAddress } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

const Body = z.object({
  name: z.string().min(1).max(40),
  phone: z.string().min(5).max(20),
  detail: z.string().min(2).max(200),
  province: z.string().max(40).optional(),
  city: z.string().max(40).optional(),
  district: z.string().max(40).optional(),
  zip: z.string().max(20).optional(),
  tag: z.string().max(20).optional(),
  isDefault: z.boolean().optional(),
});

export const GET = handler(async () => {
  const me = await requireUser();
  const list = await prisma.address.findMany({
    where: { userId: me.id },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  });
  return list.map(serializeAddress);
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());

  // 第一条地址自动设为默认
  const count = await prisma.address.count({ where: { userId: me.id } });
  const isDefault = body.isDefault ?? count === 0;

  const created = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({
        where: { userId: me.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.create({
      data: {
        userId: me.id,
        name: body.name,
        phone: body.phone,
        detail: body.detail,
        province: body.province ?? null,
        city: body.city ?? null,
        district: body.district ?? null,
        zip: body.zip ?? null,
        tag: body.tag ?? null,
        isDefault,
      },
    });
  });

  return serializeAddress(created);
});
