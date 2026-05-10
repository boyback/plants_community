import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { serializeCategory } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') ?? undefined;
  const withGenera = url.searchParams.get('withGenera') === '1';

  if (withGenera) {
    // mega 菜单用:同时返回每科下的 Genus 简表
    const list = await prisma.category.findMany({
      where: {
        enabled: true,
        ...(kind ? { kind: kind as 'family' | 'discussion' | 'market' } : {}),
      },
      orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        latinName: true,
        icon: true,
        kind: true,
        _count: { select: { posts: true, genera: true } },
        genera: {
          orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            slug: true,
            name: true,
            latinName: true,
            _count: { select: { posts: true, species: true } },
          },
        },
      },
    });
    return list;
  }

  const list = await prisma.category.findMany({
    where: {
      enabled: true,
      ...(kind ? { kind: kind as 'family' | 'discussion' | 'market' } : {}),
    },
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { posts: true, genera: true } } },
  });
  return list.map(serializeCategory);
});
