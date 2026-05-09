import { prisma } from '@/lib/db';
import { BoardToggle, BoardOrderInput } from './BoardToggle';

export const dynamic = 'force-dynamic';

export default async function AdminBoardsPage() {
  const raw = await prisma.category.findMany({
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { genera: true } },
      genera: {
        orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { species: true } },
          species: {
            orderBy: { name: 'asc' },
            select: { id: true, name: true, slug: true },
            take: 50,
          },
        },
      },
    },
  });
  const categories = raw;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🌿 板块 CRUD</h1>
        <p className="mt-1 text-xs text-ink-600">
          三级结构:Category(科) → Genus(属) → Species(品种)。
          数字框是<b>排序权重</b>(越小越靠前,直接影响首页侧边栏顺序);开关控制启用/禁用。
          完整 CRUD 请用 Prisma Studio:<code className="rounded bg-ink-100 px-1">npx prisma studio</code>
        </p>
      </div>

      <div className="space-y-3">
        {categories.map((c) => (
          <section key={c.id} className="rounded-xl border border-ink-100 bg-white">
            <header className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">{c.icon ?? '🌱'}</span>
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-[10px] text-ink-500">
                    kind={c.kind} slug={c.slug} · 属 {c._count.genera}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BoardOrderInput id={c.id} initialOrderIdx={c.orderIdx} />
                <BoardToggle type="category" id={c.id} enabled={c.enabled} />
              </div>
            </header>

            {c.genera.length > 0 && (
              <div className="divide-y divide-ink-100">
                {c.genera.map((g) => (
                  <div key={g.id} className="px-4 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-ink-500">├</span>
                        <span>{g.name}</span>
                        <span className="text-[10px] text-ink-400">
                          品种 {g._count.species}
                        </span>
                      </div>
                    </div>
                    {g.species.length > 0 && (
                      <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 pl-6 md:grid-cols-3 lg:grid-cols-4">
                        {g.species.map((s) => (
                          <div key={s.id} className="truncate text-xs text-ink-600">
                            └ {s.name}
                          </div>
                        ))}
                        {g._count.species > g.species.length && (
                          <div className="text-[10px] text-ink-400">
                            … 还有 {g._count.species - g.species.length} 个
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
