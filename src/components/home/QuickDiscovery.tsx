/**
 * 首页「快速发现」内链区
 *
 * SEO 价值:
 *   - 在首页一次性输出 30+ 个站内链接(品种页 + 科页 + 话题)
 *   - 锚文本带核心关键词(品种中文名)
 *   - 把首页权重传给品种/板块页,提升它们排名
 *
 * 视觉:chip 云,占地小,密度高
 *
 * 数据(SSR 抓):
 *   - 帖子数最多的 30 个品种(按 _count.posts desc)
 *   - 8 个一级科分类(全部展示)
 *   - 一组写死的核心养护话题(SEO 长尾词)
 */
import Link from 'next/link';
import { prisma } from '@/lib/db';

const HOT_TOPICS = [
  { tag: '度夏', q: '度夏' },
  { tag: '配土', q: '配土' },
  { tag: '叶插', q: '叶插' },
  { tag: '黑腐', q: '黑腐' },
  { tag: '徒长', q: '徒长' },
  { tag: '上色', q: '上色' },
  { tag: '浇水', q: '浇水' },
  { tag: '换盆', q: '换盆' },
];

export async function QuickDiscovery() {
  const [species, categories] = await Promise.all([
    prisma.species.findMany({
      include: {
        genus: { include: { category: true } },
      },
      orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
      take: 30,
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      take: 12,
    }),
  ]);

  if (species.length === 0 && categories.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-leaf-100/60 px-4 py-2.5 text-sm font-semibold text-ink-800">
        🔍 快速发现
      </div>

      {/* 品种 */}
      {species.length > 0 && (
        <div className="border-b border-leaf-100/60 px-4 py-3">
          <div className="mb-2 text-[11px] text-leaf-700/60">热门品种</div>
          <div className="flex flex-wrap gap-1.5">
            {species.map((s) => {
              const url = `/board/${s.genus.category.slug}/${s.genus.slug}/${s.slug}`;
              return (
                <Link
                  key={s.id}
                  href={url}
                  className="inline-flex items-center rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] text-leaf-700 transition-colors hover:bg-leaf-100"
                >
                  {s.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 板块 / 科 */}
      {categories.length > 0 && (
        <div className="border-b border-leaf-100/60 px-4 py-3">
          <div className="mb-2 text-[11px] text-leaf-700/60">板块</div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/board/${c.slug}`}
                className="inline-flex items-center rounded-full border border-leaf-200 px-2 py-0.5 text-[11px] text-ink-700/80 transition-colors hover:border-leaf-400 hover:text-leaf-700"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 养护长尾词 */}
      <div className="px-4 py-3">
        <div className="mb-2 text-[11px] text-leaf-700/60">养护话题</div>
        <div className="flex flex-wrap gap-1.5">
          {HOT_TOPICS.map((t) => (
            <Link
              key={t.tag}
              href={`/search?q=${encodeURIComponent(t.q)}`}
              className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 transition-colors hover:bg-amber-100"
            >
              #{t.tag}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
