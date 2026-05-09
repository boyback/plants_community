import { prisma } from '@/lib/db';
import { CategoriesClient } from './CategoriesClient';

export const dynamic = 'force-dynamic';

export default async function AdminBoardsPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { genera: true, posts: true } },
    },
  });
  return (
    <CategoriesClient
      initial={categories.map((c) => ({
        ...c,
        genusCount: c._count.genera,
        postCount: c._count.posts,
      }))}
    />
  );
}
