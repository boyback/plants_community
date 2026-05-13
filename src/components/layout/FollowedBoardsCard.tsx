'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';

interface FollowedItem {
  level: 'category' | 'genus' | 'species';
  id: string;
  name: string;
  slug: string;
  cover?: string;
  path?: { level: string; slug: string; name: string }[];
}

export function FollowedBoardsCard() {
  const { user } = useAuth();
  const [items, setItems] = useState<FollowedItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get<FollowedItem[]>('/api/boards/followed')
      .then((list) => setItems((list || []).filter((f) => f.level === 'species')))
      .catch(() => {});
  }, [user]);

  if (!user || items.length === 0) return null;

  return (
    <div className="rounded-xl border border-leaf-100 bg-white overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-left hover:bg-leaf-50/50 transition-colors"
      >
        <span className="flex-1 text-sm font-medium text-ink-800">关注的品种</span>
        <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-[10px] text-leaf-600 font-medium">
          {items.length}
        </span>
        <span className="text-ink-300 text-xs">{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed && (
        <div className="border-t border-leaf-100/60 px-2 py-1.5 space-y-0.5">
          {items.map((f) => {
            const catPath = f.path?.find((p) => p.level === 'category');
            const genusPath = f.path?.find((p) => p.level === 'genus');
            const href =
              catPath && genusPath
                ? `/board/${catPath.slug}/${genusPath.slug}/${f.slug}`
                : `/board/${f.slug}`;
            return (
              <Link
                key={f.id}
                href={href}
                className="block rounded-lg px-2.5 py-1.5 text-xs text-ink-700 hover:bg-leaf-50 hover:text-leaf-700 transition-colors"
              >
                <span className="font-medium">{f.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
