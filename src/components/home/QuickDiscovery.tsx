/**
 * 首页右栏顶部「快速发现」内链区
 *
 * - 12 个热门品种(按帖子数倒序),支持「换一换」
 * - 全部一级科板块
 * - 8 个核心养护话题
 *
 * 客户端组件:支持「换一换」交互。初始数据由 server 通过 props 注入(SSR 友好)。
 */
'use client';

import Link from 'next/link';
import { useState } from 'react';

export interface DiscoverySpecies {
  id: string;
  name: string;
  url: string;
}

export interface DiscoveryCategory {
  id: string;
  slug: string;
  name: string;
}

const HOT_TOPICS = [
  '度夏', '配土', '叶插', '黑腐', '徒长', '上色', '浇水', '换盆',
];

export function QuickDiscovery({
  initialSpecies,
  categories,
}: {
  initialSpecies: DiscoverySpecies[];
  categories: DiscoveryCategory[];
}) {
  const [species, setSpecies] = useState(initialSpecies);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const r = await fetch('/api/home/quick-discovery?n=12&shuffle=1');
      const data = await r.json();
      if (data?.data?.species) setSpecies(data.data.species);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-leaf-100/60 px-4 py-2.5">
        <div className="text-sm font-semibold text-ink-800">🔍 快速发现</div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="text-[11px] text-leaf-700/70 hover:text-leaf-700 disabled:opacity-50"
        >
          {refreshing ? '换一换…' : '换一换 ↻'}
        </button>
      </div>

      {species.length > 0 && (
        <div className="border-b border-leaf-100/60 px-4 py-3">
          <div className="mb-2 text-[11px] text-leaf-700/60">热门品种</div>
          <div className="flex flex-wrap gap-1.5">
            {species.map((s) => (
              <Link
                key={s.id}
                href={s.url}
                className="inline-flex items-center rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] text-leaf-700 transition-colors hover:bg-leaf-100"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      )}

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

      <div className="px-4 py-3">
        <div className="mb-2 text-[11px] text-leaf-700/60">养护话题</div>
        <div className="flex flex-wrap gap-1.5">
          {HOT_TOPICS.map((t) => (
            <Link
              key={t}
              href={`/search?q=${encodeURIComponent(t)}`}
              className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 transition-colors hover:bg-amber-100"
            >
              #{t}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Server-side 数据抓取 helper */
export async function loadQuickDiscoveryData(opts: { n?: number; shuffle?: boolean } = {}) {
  // 动态 import 防止 client 打包时把 prisma 引入
  const { prisma } = await import('@/lib/db');
  const n = opts.n ?? 12;

  const [species, categories] = await Promise.all([
    prisma.species.findMany({
      include: { genus: { include: { category: true } } },
      orderBy: opts.shuffle
        ? { id: 'asc' } // 简单乱序兜底,真正乱用 raw query 做 ORDER BY RAND()
        : [{ posts: { _count: 'desc' } }, { name: 'asc' }],
      // shuffle 模式取更多再客户端洗牌
      take: opts.shuffle ? n * 5 : n,
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      take: 12,
    }),
  ]);

  let pickedSpecies = species;
  if (opts.shuffle) {
    pickedSpecies = [...species].sort(() => Math.random() - 0.5).slice(0, n);
  }

  return {
    species: pickedSpecies.map((s) => ({
      id: s.id,
      name: s.name,
      url: `/board/${s.genus.category.slug}/${s.genus.slug}/${s.slug}`,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
    })),
  };
}
