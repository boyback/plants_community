'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { cn, timeAgo } from '@/lib/utils';
import { api, ApiError } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import type { Notification } from '@/lib/types';

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'like', label: '赞' },
  { key: 'comment', label: '评论' },
  { key: 'follow', label: '关注' },
  { key: 'system', label: '系统' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const typeStyle: Record<Notification['type'], { bg: string; icon: string }> = {
  like: { bg: 'bg-rose-50 text-rose-600', icon: '❤️' },
  comment: { bg: 'bg-leaf-50 text-leaf-700', icon: '💬' },
  follow: { bg: 'bg-blue-50 text-blue-600', icon: '🤝' },
  system: { bg: 'bg-amber-50 text-amber-700', icon: '🔔' },
  mention: { bg: 'bg-violet-50 text-violet-700', icon: '@' },
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState<Notification[]>([]);
  const [tab, setTab] = useState<TabKey>('all');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await api.get<{ items: Notification[]; unread: number }>(
          '/api/notifications'
        );
        setList(res.items);
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  const filtered = list.filter((n) => tab === 'all' || n.type === tab);

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/read', { all: true });
      setList((l) => l.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const markRead = async (id: string) => {
    setList((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await api.post('/api/notifications/read', { ids: [id] }).catch(() => null);
  };

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">🔔</div>
          <div className="mt-3 text-lg font-semibold">登录后查看通知</div>
          <Link href="/login?redirect=/notifications" className="btn-primary mt-4 inline-flex">
            去登录
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">通知</h1>
          <p className="text-sm text-leaf-700/70">
            与你相关的赞、评论、关注和系统消息
          </p>
        </div>
        <button type="button" onClick={markAllRead} className="btn-outline">
          <Icon name="check" size={14} />
          全部标为已读
        </button>
      </div>

      <div className="mb-4 flex items-center gap-1 overflow-x-auto border-b border-leaf-100">
        {tabs.map((t) => {
          const unread = list.filter((n) => !n.read && (t.key === 'all' || n.type === t.key)).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'relative whitespace-nowrap px-4 py-2.5 text-sm transition-colors',
                tab === t.key ? 'text-leaf-700 font-medium' : 'text-ink-700/60 hover:text-leaf-700'
              )}
            >
              {t.label}
              {unread > 0 && (
                <span className="ml-1 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">
                  {unread}
                </span>
              )}
              {tab === t.key && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-leaf-500" />
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-leaf-700/60">加载中...</div>
      ) : err ? (
        <Empty icon="⚠️" title="加载失败" desc={err} />
      ) : filtered.length === 0 ? (
        <Empty icon="🔔" title="暂无此类通知" />
      ) : (
        <ul className="card divide-y divide-leaf-50">
          {filtered.map((n) => {
            const ts = typeStyle[n.type];
            const Wrap: React.ElementType = n.link ? Link : 'div';
            return (
              <li key={n.id}>
                <Wrap
                  {...(n.link ? { href: n.link } : {})}
                  onClick={() => markRead(n.id)}
                  className={cn(
                    'flex items-start gap-3 px-5 py-4 transition-colors',
                    n.link && 'hover:bg-leaf-50/50 cursor-pointer',
                    !n.read && 'bg-leaf-50/30'
                  )}
                >
                  <div
                    className={cn(
                      'relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg',
                      ts.bg
                    )}
                  >
                    {n.fromUser ? (
                      <Avatar src={n.fromUser.avatar} alt={n.fromUser.name} size={40} />
                    ) : (
                      <span>{ts.icon}</span>
                    )}
                    {n.fromUser && (
                      <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] shadow">
                        {ts.icon}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink-800">
                      {n.fromUser && (
                        <span className="font-medium text-leaf-700">{n.fromUser.name} </span>
                      )}
                      {n.text}
                    </div>
                    <div className="mt-1 text-[11px] text-leaf-700/60">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="未读" />
                  )}
                </Wrap>
              </li>
            );
          })}
        </ul>
      )}
    </Shell>
  );
}
