'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/lib/types';

export function RecommendUsers({ users }: { users: User[] }) {
  const { user: me } = useAuth();
  const list = users.filter((u) => !me || u.id !== me.id).slice(0, 5);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

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
        <div className="text-sm font-semibold text-ink-800">🌱 推荐肉友</div>
        <Link href="/board" className="text-[11px] text-leaf-700 hover:underline">
          换一批
        </Link>
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
              {followed[u.id] ? '已关注' : '+ 关注'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
