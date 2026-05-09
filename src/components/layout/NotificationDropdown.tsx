'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useHoverOpen } from '@/lib/hooks/useHoverOpen';
import { api } from '@/lib/client-api';
import { cn, timeAgo } from '@/lib/utils';
import type { Notification, Conversation } from '@/lib/types';

type TabKey = 'all' | 'comment' | 'like' | 'mention' | 'follow' | 'system' | 'message';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'comment', label: '评论' },
  { key: 'like', label: '点赞' },
  { key: 'mention', label: '@我' },
  { key: 'follow', label: '关注' },
  { key: 'system', label: '系统' },
  { key: 'message', label: '私信' },
];

interface Props {
  unreadNotifs: number;
  unreadMsgs: number;
  onReadAll?: () => void;
}

/**
 * 头部通知按钮 + hover 下拉
 *  - 7 个 tab(全部 / 评论 / 点赞 / @我 / 关注 / 系统 / 私信)
 *  - 通知 6 类 + 私信 1 类合一
 *  - 下拉浮层 360px 宽,最大高度 480 滚动
 *  - 全部已读、查看全部 入口
 */
export function NotificationDropdown({
  unreadNotifs,
  unreadMsgs,
  onReadAll,
}: Props) {
  const { open, bind, close } = useHoverOpen();
  const [tab, setTab] = useState<TabKey>('all');
  const [items, setItems] = useState<Notification[]>([]);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const total = unreadNotifs + unreadMsgs;

  // 打开时加载(仅一次)
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      api
        .get<{ items: Notification[]; unread: number }>(
          '/api/notifications?limit=20'
        )
        .catch(() => ({ items: [], unread: 0 })),
      // /api/conversations 直接返回数组,不是 { items: [...] }
      api
        .get<Conversation[]>('/api/conversations')
        .catch(() => [] as Conversation[]),
    ])
      .then(([n, c]) => {
        setItems(Array.isArray(n.items) ? n.items : []);
        setConvs(Array.isArray(c) ? c.slice(0, 10) : []);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const filtered =
    tab === 'all'
      ? items
      : tab === 'message'
      ? []
      : items.filter((n) => n.type === tab);

  const showConvs = tab === 'all' || tab === 'message';

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/read', { all: true });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      onReadAll?.();
    } catch {}
  };

  return (
    <div className="relative inline-block" {...bind}>
      <button
        type="button"
        aria-label="消息"
        className="relative grid h-9 w-9 place-items-center rounded-lg text-leaf-700 hover:bg-leaf-50"
      >
        <Icon name="bell" size={18} />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-card">
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-leaf-100 px-3 py-2">
            <span className="text-sm font-semibold text-ink-800">消息</span>
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] text-leaf-700 hover:underline"
              disabled={total === 0}
            >
              全部已读
            </button>
          </div>

          {/* tab 横向滚动 */}
          <div className="flex gap-0.5 overflow-x-auto border-b border-leaf-50 px-1.5 py-1.5 scrollbar-none">
            {TABS.map((tt) => {
              const active = tab === tt.key;
              return (
                <button
                  key={tt.key}
                  type="button"
                  onClick={() => setTab(tt.key)}
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[11px] transition-colors',
                    active
                      ? 'bg-leaf-500 text-white'
                      : 'text-leaf-700 hover:bg-leaf-50'
                  )}
                >
                  {tt.label}
                </button>
              );
            })}
          </div>

          {/* 列表 */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-xs text-leaf-700/70">
                加载中…
              </div>
            ) : showConvs && convs.length === 0 && filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-leaf-700/60">
                暂无消息
              </div>
            ) : (
              <>
                {/* 私信(全部 tab + 私信 tab 都展示) */}
                {showConvs &&
                  convs.map((c) => (
                    <Link
                      key={c.id}
                      href={`/messages?to=${c.user.id}`}
                      onClick={close}
                      className="flex items-start gap-2 border-b border-leaf-50 px-3 py-2 hover:bg-leaf-50/60"
                    >
                      <Avatar src={c.user.avatar} alt={c.user.name} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-xs font-medium text-ink-800">
                            💬 {c.user.name}
                          </span>
                          <span className="ml-2 shrink-0 text-[10px] text-leaf-700/60">
                            {timeAgo(c.lastAt)}
                          </span>
                        </div>
                        <p className="line-clamp-1 text-[11px] text-leaf-700/80">
                          {c.lastMessage}
                        </p>
                      </div>
                      {c.unread > 0 && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                      )}
                    </Link>
                  ))}

                {/* 通知 */}
                {tab !== 'message' &&
                  filtered.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link ?? '#'}
                      onClick={close}
                      className={cn(
                        'flex items-start gap-2 border-b border-leaf-50 px-3 py-2 hover:bg-leaf-50/60',
                        !n.read && 'bg-leaf-50/30'
                      )}
                    >
                      {n.fromUser ? (
                        <Avatar
                          src={n.fromUser.avatar}
                          alt={n.fromUser.name}
                          size={32}
                        />
                      ) : (
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf-50 text-base">
                          {iconForType(n.type)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[11px] leading-5 text-ink-800">
                          {n.text}
                        </p>
                        <span className="text-[10px] text-leaf-700/60">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                      )}
                    </Link>
                  ))}

                {/* 空态 */}
                {tab !== 'message' && filtered.length === 0 && convs.length === 0 && (
                  <div className="py-8 text-center text-xs text-leaf-700/60">
                    没有相关消息
                  </div>
                )}
              </>
            )}
          </div>

          {/* 底部:查看全部 */}
          <div className="flex border-t border-leaf-100 text-[12px]">
            <Link
              href="/notifications"
              onClick={close}
              className="flex-1 py-2 text-center text-leaf-700 hover:bg-leaf-50"
            >
              全部通知
            </Link>
            <Link
              href="/messages"
              onClick={close}
              className="flex-1 border-l border-leaf-100 py-2 text-center text-leaf-700 hover:bg-leaf-50"
            >
              全部私信
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function iconForType(t: Notification['type']): string {
  switch (t) {
    case 'like':
      return '❤️';
    case 'comment':
      return '💬';
    case 'follow':
      return '➕';
    case 'mention':
      return '@';
    case 'system':
      return '📢';
    default:
      return '🔔';
  }
}
