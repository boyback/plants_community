/**
 * 首页右栏「快速发现」单卡
 *
 * 一张卡里 2 段:
 *   - 🔥 热门话题  — 词池随机抽 8 个,点击进 /topic/[name] 查看相关帖子
 *   - 🏷️ 板块       — 本地洗牌,点击进板块页
 *
 * 每段右上有独立「换一换 ↻」,只刷自己那一段。
 *
 * 注:为兼容旧的 page.tsx 调用,仍接收 initialSpecies 但忽略;
 *     未来想把这字段删掉,得连 page.tsx + lib/quick-discovery 一起改。
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

/** 养护话题词池 — chip 用,点击进 /topic/[name] */
const TOPIC_POOL = [
  '度夏', '配土', '叶插', '黑腐', '徒长', '上色', '浇水', '换盆',
  '砍头', '播种', '繁殖', '日烧', '冻伤', '介壳虫', '红蜘蛛',
  '老桩', '群生', '锦化', '出状态', '化水', '休眠', '醒水',
  '光照', '通风', '颗粒土', '泥炭', '园艺盆', '陶盆',
];

function pickTopics(n = 8): string[] {
  return [...TOPIC_POOL].sort(() => Math.random() - 0.5).slice(0, n);
}

export function QuickDiscovery({
  initialCategories,
}: {
  // 保留入参签名向后兼容,但 species 这条线已不再使用
  initialSpecies?: DiscoverySpecies[];
  initialCategories: DiscoveryCategory[];
}) {
  const [topics, setTopics] = useState<string[]>(() => TOPIC_POOL.slice(0, 8));
  const [categories, setCategories] = useState(initialCategories);

  const [topicsBusy, setTopicsBusy] = useState(false);
  const [boardsBusy, setBoardsBusy] = useState(false);

  const refreshTopics = () => {
    setTopicsBusy(true);
    setTopics(pickTopics());
    setTimeout(() => setTopicsBusy(false), 150);
  };

  const refreshBoards = () => {
    setBoardsBusy(true);
    setCategories((arr) => [...arr].sort(() => Math.random() - 0.5));
    setTimeout(() => setBoardsBusy(false), 200);
  };

  const hasCategories = categories.length > 0;

  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-leaf-100/60">
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
