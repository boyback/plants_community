import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://plantcommunity.cn';

const STATIC_PATHS: { url: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }[] = [
  { url: '/', changeFrequency: 'daily', priority: 1.0 },
  { url: '/board', changeFrequency: 'daily', priority: 0.9 },
  { url: '/plants', changeFrequency: 'weekly', priority: 0.9 },
  { url: '/market', changeFrequency: 'daily', priority: 0.7 },
  { url: '/auction', changeFrequency: 'daily', priority: 0.7 },
  { url: '/terms', changeFrequency: 'monthly', priority: 0.3 },
  { url: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
  { url: '/cookies', changeFrequency: 'monthly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const out: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${SITE_URL}${p.url}`,
    lastModified: new Date(),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // build 期没 DATABASE_URL,直接返回静态部分(运行时再被请求时会真查)
  if (!process.env.DATABASE_URL) {
    return out;
  }

  // 三级板块(科 / 属 / 品种)
  try {
    const [categories, genera, species] = await Promise.all([
      prisma.category.findMany({
        select: { slug: true, updatedAt: true },
      }),
      prisma.genus.findMany({
        select: {
          slug: true,
          updatedAt: true,
          category: { select: { slug: true } },
        },
      }),
      prisma.species.findMany({
        select: {
          slug: true,
          updatedAt: true,
          genus: {
            select: { slug: true, category: { select: { slug: true } } },
          },
        },
      }),
    ]);

    for (const c of categories) {
      out.push({
        url: `${SITE_URL}/board/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
    for (const g of genera) {
      out.push({
        url: `${SITE_URL}/board/${g.category.slug}/${g.slug}`,
        lastModified: g.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
    for (const s of species) {
      out.push({
        url: `${SITE_URL}/board/${s.genus.category.slug}/${s.genus.slug}/${s.slug}`,
        lastModified: s.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8, // 品种页 SEO 价值高(用户搜「银冠玉」会落到这里)
      });
    }
  } catch {
    // ignore
  }

  // 帖子(过滤已删除 / 待审,只索引公开发布的)
  try {
    const posts = await prisma.post.findMany({
      where: {
        deleted: false,
        // reviewStatus 列可能不存在(env 关闭),不强加过滤
      },
      select: { id: true, updatedAt: true, type: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000, // 站点有更多内容时再做分页 sitemap-index
    });
    for (const p of posts) {
      out.push({
        url: `${SITE_URL}/post/${p.id}`,
        lastModified: p.updatedAt,
        changeFrequency: p.type === 'journal' ? 'daily' : 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    // ignore
  }

  return out;
}

// 让 sitemap 实时生成(也可以加 ISR)
// build 期不预渲染(避免 prisma 没 DATABASE_URL 报错);运行时按需渲染
export const dynamic = 'force-dynamic';
