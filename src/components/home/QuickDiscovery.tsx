/**
 * 首页右栏「快速发现」单卡
 *
 * 一张卡里 2 段:
 *   - 🔥 热门话题  — 来自后端按近 30 天 tag 频次聚合,点击进 /topic/[name]
 *   - 🏷️ 板块       — 全部板块,本地洗牌,点击进板块页
 *
 * 每段右上有独立「换一换 ↻」按钮,只刷自己那一段。
 */
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface DiscoveryCategory {
  id: string;
  slug: string;
  name: string;
}

export function QuickDiscovery({
  initialTopics,
  initialCategories,
}: {
  initialTopics: string[];
  initialCategories: DiscoveryCategory[];
}) {
  const [topics, setTopics] = useState<string[]>(initialTopics);
  const [categories, setCategories] = useState(initialCategories);

  const [topicsBusy, setTopicsBusy] = useState(false);
  const [boardsBusy, setBoardsBusy] = useState(false);

  const refreshTopics = async () => {
    setTopicsBusy(true);
    try {
      const r = await fetch('/api/home/quick-discovery?n=8&shuffle=1');
      const data = await r.json();
      if (Array.isArray(data?.data?.topics)) setTopics(data.data.topics);
    } finally {
      setTopicsBusy(false);
    }
  };

  const refreshBoards = () => {
    setBoardsBusy(true);
    setCategories((arr) => [...arr].sort(() => Math.random() - 0.5));
    setTimeout(() => setBoardsBusy(false), 200);
  };

  const hasTopics = topics.length > 0;
  const hasCategories = categories.length > 0;

  if (!hasTopics && !hasCategories) return null;

  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-leaf-100/60">
        {hasTopics && (
          <Section title="🔥 热门话题" onRefresh={refreshTopics} busy={topicsBusy}>
            <div className="flex flex-wrap gap-1.5">
              {topics.map((t) => (
                <Link
                  key={t}
                  href={`/topic/${encodeURIComponent(t)}`}
                  className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 transition-colors hover:bg-amber-100"
                >
                  #{t}
                </Link>
              ))}
            </div>
          </Section>
        )}

        {hasCategories && (
          <Section title="🏷️ 板块" onRefresh={refreshBoards} busy={boardsBusy}>
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
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  onRefresh,
  busy,
  children,
}: {
  title: string;
  onRefresh: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium text-ink-800">{title}</span>
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
      {children}
    </div>
  );
}
