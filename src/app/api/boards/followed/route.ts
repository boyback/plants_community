import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeCategory, serializeGenus, serializeSpecies } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

/**
 * 我关注的板块列表。返回按 createdAt 逆序的 Board 数组(三种类型混合)。
 * 前端侧栏「我的关注 tab」直接渲染即可。
 */
export const GET = handler(async () => {
  const me = await requireUser();

  const follows = await prisma.boardFollow.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
  });

  const boardIds = follows.filter((f) => f.type === 'board').map((f) => f.targetId);
  const genusIds = follows.filter((f) => f.type === 'genus').map((f) => f.targetId);
  const speciesIds = follows.filter((f) => f.type === 'species').map((f) => f.targetId);

  const [boards, genera, species] = await Promise.all([
    boardIds.length
      ? prisma.board.findMany({
          where: { id: { in: boardIds } },
          include: { _count: { select: { posts: true, genera: true } } },
        })
      : Promise.resolve([]),
    genusIds.length
      ? prisma.genus.findMany({
          where: { id: { in: genusIds } },
          include: {
            board: true,
            _count: { select: { posts: true, species: true } },
          },
        })
      : Promise.resolve([]),
    speciesIds.length
      ? prisma.species.findMany({
          where: { id: { in: speciesIds } },
          include: {
            genus: { include: { board: true } },
            _count: { select: { posts: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const catMap = new Map(boards.map((c) => [c.id, c]));
  const genusMap = new Map(genera.map((g) => [g.id, g]));
  const speciesMap = new Map(species.map((s) => [s.id, s]));

  // 保留 follows 的时间顺序
  const items = follows
    .map((f) => {
      if (f.type === 'board') {
        const c = catMap.get(f.targetId);
        return c ? serializeCategory(c) : null;
      }
      if (f.type === 'genus') {
        const g = genusMap.get(f.targetId);
        return g ? serializeGenus(g) : null;
      }
      const s = speciesMap.get(f.targetId);
      return s ? serializeSpecies(s) : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  return items;
});
