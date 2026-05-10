'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import type { User } from '@/lib/types';

export function RecommendUsers({ users }: { users: User[] }) {
  const { user: me } = useAuth();
  const { t } = useI18n();
  const initial = users.filter((u) => !me || u.id !== me.id).slice(0, 5);
  const [list, setList] = useState<User[]>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.get<User[]>('/api/users?limit=5&random=1');
      const next = (res || []).filter((u) => !me || u.id !== me.id).slice(0, 5);
      if (next.length > 0) setList(next);
    } finally {
      setRefreshing(false);
    }
  };

  const toggle = async (uid: string) => {
    if (!me) {
      window.location.href = '/login';
      return;
    }
    setFollowed((f) => ({ ...f, [uid]: !f[uid] }));
    try {
      await api.post(`/api/users/${uid}/follow`);
    } catch {
      setFollowed((f) => ({ ...f, [uid]: !f[uid] }));
    }
  };

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-ink-800">🌱 {t('home.recommend.title')}</div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="text-[11px] text-leaf-700 hover:underline disabled:opacity-50"
        >
          {refreshing ? '换一换…' : t('home.recommend.refresh')}
        </button>
      </div>
      <ul className="space-y-2.5">
        {list.map((u) => (
          <li key={u.id} className="flex items-center gap-2.5">
            <Link href={`/user/${u.id}`}>
              <Avatar src={u.avatar} alt={u.name} size={36} />
            </Link>
            <Link href={`/user/${u.id}`} className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink-800 hover:text-leaf-700">
                {u.name}
              </div>
              <div className="truncate text-[11px] text-leaf-700/70">{u.bio}</div>
            </Link>
            <button
              type="button"
              className={cn(
                'btn h-7 !px-2.5 text-[11px]',
                followed[u.id]
                  ? 'bg-leaf-100 text-leaf-700'
                  : 'bg-leaf-500 text-white hover:bg-leaf-600'
              )}
              onClick={() => toggle(u.id)}
            >
              {followed[u.id] ? t('home.recommend.followedBtn') : t('home.recommend.followBtn')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
