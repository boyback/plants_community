/**
 * 首页右栏「站内公告」卡(取代横幅)
 *
 * - 列出当前生效中的公告(最多 3 条)
 * - 不同 level 不同色
 * - 单条可关闭(localStorage 24h 不再展示)
 */
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  level: string;
  createdAt: string;
}

const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;
const KEY_PREFIX = 'announce.dismiss.';

function isDismissed(id: string): boolean {
  if (typeof window === 'undefined') return false;
  const v = Number(localStorage.getItem(KEY_PREFIX + id) || '0');
  return !!v && Date.now() - v < DISMISS_TTL_MS;
}

function dismiss(id: string) {
  try {
    localStorage.setItem(KEY_PREFIX + id, String(Date.now()));
  } catch {}
}

const LEVEL_STYLE: Record<string, { dot: string; bg: string; text: string }> = {
  info: { dot: 'bg-blue-400', bg: '', text: 'text-ink-800' },
  warning: { dot: 'bg-amber-400', bg: '', text: 'text-ink-800' },
  important: { dot: 'bg-rose-500', bg: '', text: 'text-ink-800' },
};

export function AnnouncementCard() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get<Announcement[]>('/api/announcements/active')
      .then((arr) => {
        const filtered = (arr || []).filter((a) => !isDismissed(a.id)).slice(0, 3);
        setList(filtered);
      })
      .catch(() => null)
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || list.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-leaf-100/60 px-4 py-2.5">
        <span className="text-sm font-semibold text-ink-800">📣 站内公告</span>
      </div>
      <ul className="divide-y divide-leaf-50">
        {list.map((a) => {
          const s = LEVEL_STYLE[a.level] ?? LEVEL_STYLE.info;
          return (
            <li key={a.id} className="group relative px-4 py-2.5">
              <div className="flex items-start gap-2">
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', s.dot)} />
                <div className="min-w-0 flex-1">
                  <div className={cn('text-[12px] font-medium', s.text)}>{a.title}</div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-leaf-700/70">
                    {a.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    dismiss(a.id);
                    setList((arr) => arr.filter((x) => x.id !== a.id));
                  }}
                  className="opacity-0 transition-opacity group-hover:opacity-100 text-leaf-700/40 hover:text-rose-500"
                  title="关闭(24 小时不再显示)"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
