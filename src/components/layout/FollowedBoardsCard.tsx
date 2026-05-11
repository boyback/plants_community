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

  useEffect(() => {
    if (!user) return;
    api
      .get<FollowedItem[]>('/api/boards/followed')
      .then((list) => setItems((list || []).filter((f) => f.level === 'species')))
      .catch(() => {});
  }, [user]);

  if (!user || items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-amber-50/80">
        <span className="text-base shrink-0">⭐</span>
        <span className="truncate font-medium text-amber-700">我关注的品种</span>
        <span className="ml-auto rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-600">
          {items.length}
        </span>
      </div>
      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-amber-100 pl-2">
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
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-ink-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
            >
              {f.cover && (
                <img
                  src={f.cover}
                  alt=""
                  className="h-4 w-4 shrink-0 rounded object-cover"
                />
              )}
              <span className="min-w-0 truncate">{f.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
