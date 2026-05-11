import { prisma } from '@/lib/db';
import { BoardsManager } from './BoardsManager';

export const dynamic = 'force-dynamic';

export default async function AdminBoardsPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: {
      genera: {
        orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
        include: {
          species: {
            orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
            select: {
              id: true,
              slug: true,
              name: true,
              latinName: true,
              cover: true,
              orderIdx: true,
              _count: { select: { posts: true } },
            },
          },
          _count: { select: { posts: true } },
        },
      },
      _count: { select: { posts: true } },
    },
  });

  return (
    <BoardsManager
      initial={categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        latinName: c.latinName,
        icon: c.icon,
        cover: c.cover,
        kind: c.kind,
        enabled: c.enabled,
        orderIdx: c.orderIdx,
        postsCount: c._count.posts,
        genera: c.genera.map((g) => ({
          id: g.id,
          slug: g.slug,
          name: g.name,
          latinName: g.latinName,
          cover: g.cover,
          orderIdx: g.orderIdx,
          postsCount: g._count.posts,
          species: g.species.map((s) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            latinName: s.latinName,
            cover: s.cover ?? '',
            orderIdx: s.orderIdx,
            postsCount: s._count.posts,
          })),
        })),
      }))}
    />
  );
}
