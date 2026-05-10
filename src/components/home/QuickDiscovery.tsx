/**
 * 首页右栏「快速发现」 — 3 个独立子区
 *
 * 每个子区(热门品种 / 板块 / 养护话题)各自有「换一换」按钮,独立刷新。
 * 不再有顶部「快速发现」总标题。
 */
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

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

const TOPIC_POOL = [
  '度夏', '配土', '叶插', '黑腐', '徒长', '上色', '浇水', '换盆',
  '砍头', '播种', '繁殖', '日烧', '冻伤', '介壳虫', '红蜘蛛',
  '老桩', '群生', '锦化', '出状态', '化水', '休眠', '醒水',
  '光照', '通风', '颗粒土', '泥炭', '园艺盆', '陶盆',
];

function shuffleTopics(): string[] {
  return [...TOPIC_POOL].sort(() => Math.random() - 0.5).slice(0, 8);
}

export function QuickDiscovery({
  initialSpecies,
  initialCategories,
}: {
  initialSpecies: DiscoverySpecies[];
  initialCategories: DiscoveryCategory[];
}) {
  const [species, setSpecies] = useState(initialSpecies);
  const [categories, setCategories] = useState(initialCategories);
  const [topics, setTopics] = useState<string[]>(() => TOPIC_POOL.slice(0, 8));

  const [speciesBusy, setSpeciesBusy] = useState(false);
  const [boardsBusy, setBoardsBusy] = useState(false);

  // 仅刷新热门品种
  const refreshSpecies = async () => {
    setSpeciesBusy(true);
    try {
      const r = await fetch('/api/home/quick-discovery?n=12&shuffle=1');
      const data = await r.json();
      if (data?.data?.species) setSpecies(data.data.species);
    } finally {
      setSpeciesBusy(false);
    }
  };

  // 仅刷新板块(client-side 洗牌已有数据;板块数量固定不需要重拉)
  const refreshBoards = () => {
    setBoardsBusy(true);
    setCategories((arr) => [...arr].sort(() => Math.random() - 0.5));
    setTimeout(() => setBoardsBusy(false), 200);
  };

  // 仅刷新话题
  const refreshTopics = () => setTopics(shuffleTopics());

  return (
    <div className="space-y-4">
      <Block
        title="🌱 热门品种"
        onRefresh={refreshSpecies}
        busy={speciesBusy}
        empty={species.length === 0}
      >
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
      </Block>

      <Block
        title="🏷️ 板块"
        onRefresh={refreshBoards}
        busy={boardsBusy}
        empty={categories.length === 0}
      >
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
      </Block>

      <Block title="🔥 养护话题" onRefresh={refreshTopics}>
        <div className="flex flex-wrap gap-1.5">
          {topics.map((t) => (
            <Link
              key={t}
              href={`/search?q=${encodeURIComponent(t)}`}
              className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 transition-colors hover:bg-amber-100"
            >
              #{t}
            </Link>
          ))}
        </div>
      </Block>
    </div>
  );
}

function Block({
  title,
  onRefresh,
  busy,
  empty,
  children,
}: {
  title: string;
  onRefresh: () => void;
  busy?: boolean;
  empty?: boolean;
  children: React.ReactNode;
}) {
  if (empty) return null;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-leaf-100/60 px-4 py-2">
        <span className="text-[12px] font-semibold text-ink-800">{title}</span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className={cn(
            'text-[11px] text-leaf-700/70 transition-colors hover:text-leaf-700',
            busy && 'opacity-50',
          )}
        >
          {busy ? '换一换…' : '换一换 ↻'}
        </button>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
