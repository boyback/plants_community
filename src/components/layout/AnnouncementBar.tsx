/**
 * 全站站内公告横幅
 *
 * 行为:
 *  - 拉 /api/announcements/active
 *  - 用户可一条条 next 浏览(多条时显示「1/3 →」)
 *  - 单条「✕」可关闭,该条 24 小时内不再展示(localStorage)
 *  - level=info(蓝) / warning(琥珀) / important(玫红)
 *
 * 位置:Shell 里、Header 之下、Banner 之上
 */
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  level: string; // info | warning | important
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

const STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  info: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-900',
    icon: 'ℹ️',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-900',
    icon: '⚠️',
  },
  important: {
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-900',
    icon: '📢',
  },
};

export function AnnouncementBar() {
  const [list, setList] = useState<Announcement[]>([]);
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get<Announcement[]>('/api/announcements/active')
      .then((arr) => {
        const filtered = (arr || []).filter((a) => !isDismissed(a.id));
        setList(filtered);
      })
      .catch(() => null)
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || list.length === 0) return null;
  if (idx >= list.length) return null;

  const cur = list[idx];
  const style = STYLE[cur.level] ?? STYLE.info;

  const onDismiss = () => {
    dismiss(cur.id);
    const next = list.filter((a) => a.id !== cur.id);
    setList(next);
    if (idx >= next.length) setIdx(0);
  };

  const onNext = () => setIdx((i) => (i + 1) % list.length);

  return (
    <div className={cn('border-b', style.bg)}>
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-2 text-xs lg:px-6">
        <span className="shrink-0 text-base leading-none">{style.icon}</span>
        <div className={cn('min-w-0 flex-1 truncate', style.text)}>
          <b className="mr-1.5">{cur.title}</b>
          <span className="opacity-80">{cur.content}</span>
        </div>
        {list.length > 1 && (
          <button
            type="button"
            onClick={onNext}
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] hover:bg-white/40',
              style.text,
            )}
            title="下一条"
          >
            {idx + 1}/{list.length} →
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className={cn('shrink-0 opacity-50 hover:opacity-100', style.text)}
          title="关闭(24 小时不再显示这条)"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
