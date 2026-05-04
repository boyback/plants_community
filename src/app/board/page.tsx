import { Shell } from '@/components/layout/Shell';
import { BoardCard } from '@/components/board/BoardCard';
import { prisma } from '@/lib/db';
import { serializeBoard } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export default async function BoardIndexPage() {
  const raw = await prisma.board.findMany({
    orderBy: { orderIdx: 'asc' },
    include: { _count: { select: { posts: true } } },
  });
  const boards = raw.map(serializeBoard);

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-800">全部板块</h1>
        <p className="mt-1 text-sm text-leaf-700/70">
          选择你感兴趣的分类,和同好们一起交流养护心得
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((b) => (
          <BoardCard key={b.id} board={b} />
        ))}
      </div>
    </Shell>
  );
}
