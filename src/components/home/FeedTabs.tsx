'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PostCard } from '@/components/post/PostCard';
import type { Post } from '@/lib/types';

const tabs = [
  { key: 'recommend', label: '推荐' },
  { key: 'latest', label: '最新' },
  { key: 'hot', label: '热门' },
  { key: 'following', label: '关注' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

export function FeedTabs({ posts }: { posts: Post[] }) {
  const [tab, setTab] = useState<TabKey>('recommend');

  const sorted = [...posts];
  if (tab === 'latest') {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (tab === 'hot') {
    sorted.sort((a, b) => b.likes + b.comments * 2 - (a.likes + a.comments * 2));
  } else if (tab === 'following') {
    // Mock:只显示 u1/u2 发的
    return (
      <>
        <TabHeader tab={tab} setTab={setTab} />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {posts
            .filter((p) => ['u1', 'u2'].includes(p.author.id))
            .map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
        </div>
      </>
    );
  }

  return (
    <>
      <TabHeader tab={tab} setTab={setTab} />
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {sorted.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </>
  );
}

function TabHeader({ tab, setTab }: { tab: TabKey; setTab: (t: TabKey) => void }) {
  return (
    <div className="flex items-center gap-1 border-b border-leaf-100">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={cn(
            'relative px-4 py-2.5 text-sm font-medium transition-colors',
            tab === t.key ? 'text-leaf-700' : 'text-ink-700/60 hover:text-leaf-700'
          )}
        >
          {t.label}
          {tab === t.key && (
            <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-leaf-500" />
          )}
        </button>
      ))}
    </div>
  );
}
