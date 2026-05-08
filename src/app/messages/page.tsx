'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { cn, timeAgo } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useRealtime, type RealtimePayload } from '@/context/RealtimeContext';
import { useI18n } from '@/i18n/I18nContext';
import type { Conversation, Message, User } from '@/lib/types';
import { api, ApiError } from '@/lib/client-api';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MessagesInner />
    </Suspense>
  );
}

function MessagesInner() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const { subscribe } = useRealtime();
  const searchParams = useSearchParams();
  const initialTo = searchParams.get('to');

  const [list, setList] = useState<Conversation[]>([]);
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<{
    user: User;
    messages: Message[];
  } | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadList = async () => {
    try {
      const items = await api.get<Conversation[]>('/api/conversations');
      setList(items);
      return items;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const items = await loadList();
      const peerId = initialTo ?? items[0]?.user.id ?? null;
      setActivePeer(peerId);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, initialTo]);

  useEffect(() => {
    if (!activePeer) {
      setActiveData(null);
      return;
    }
    (async () => {
      try {
        const d = await api.get<{ user: User; messages: Message[] }>(
          `/api/conversations/${activePeer}`
        );
        setActiveData(d);
      } catch {
        setActiveData(null);
      }
    })();
  }, [activePeer]);

  // 实时:收到新私信 → 如果正好是当前会话对方发来,追加;否则刷会话列表
  useEffect(() => {
    if (!user) return;
    const handler = (payload: RealtimePayload) => {
      const msg = payload.data as {
        id: string;
        fromId: string;
        toId: string;
        text: string;
        createdAt: string;
      } | null;
      if (!msg) return;
      if (msg.fromId === activePeer) {
        setActiveData((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    id: msg.id,
                    from: 'other',
                    text: msg.text,
                    at: msg.createdAt,
                  } satisfies Message,
                ],
              }
            : prev
        );
      }
      // 刷新左侧列表的未读数
      void loadList();
    };
    return subscribe('message', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activePeer, subscribe]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeData]);

  const send = async () => {
    if (!draft.trim() || !activePeer || !user) return;
    setSending(true);
    try {
      const msg = await api.post<Message>('/api/messages', {
        toId: activePeer,
        text: draft.trim(),
      });
      setActiveData((d) => (d ? { ...d, messages: [...d.messages, msg] } : d));
      setDraft('');
      // 刷新列表(最新消息时间)
      await loadList();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : t('messages.errorSend'));
    } finally {
      setSending(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">✉️</div>
          <div className="mt-3 text-lg font-semibold">{t('error.unauthorized')}</div>
          <Link href="/login?redirect=/messages" className="btn-primary mt-4 inline-flex">
            {t('nav.login')}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell withSidebar={false}>
      <div className="mb-4 hidden md:block">
        <h1 className="text-2xl font-bold">{t('messages.title')}</h1>
      </div>
      {/* 移动端单视图切换:没选对话看列表,选了看对话;桌面端并排 */}
      <div className="card flex h-[calc(100vh-160px)] min-h-[500px] overflow-hidden md:h-[calc(100vh-200px)]">
        <aside className={cn(
          'flex w-full flex-col border-r border-leaf-100 md:max-w-[280px]',
          activePeer ? 'hidden md:flex' : 'flex'
        )}>
          <div className="border-b border-leaf-100 p-3">
            <div className="relative">
              <Icon
                name="search"
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-leaf-500"
              />
              <input className="input pl-8" placeholder={t('messages.search')} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-xs text-leaf-700/60">{t('common.loading')}</div>
            ) : list.length === 0 ? (
              <div className="p-6"><Empty icon="💬" title={t('messages.empty')} /></div>
            ) : (
              list.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActivePeer(c.user.id)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-leaf-50 px-3 py-3 text-left transition-colors',
                    activePeer === c.user.id ? 'bg-leaf-50' : 'hover:bg-leaf-50/50'
                  )}
                >
                  <div className="relative">
                    <Avatar src={c.user.avatar} alt={c.user.name} size={40} />
                    {c.unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] text-white">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{c.user.name}</span>
                      <span className="shrink-0 text-[10px] text-leaf-700/60">
                        {timeAgo(c.lastAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-leaf-700/70">{c.lastMessage}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {activeData && user ? (
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-2 border-b border-leaf-100 px-3 py-3 md:gap-3 md:px-5">
              <button
                type="button"
                onClick={() => setActivePeer(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-leaf-700 hover:bg-leaf-50 md:hidden"
                aria-label="返回列表"
              >
                <Icon name="arrow-right" size={18} className="rotate-180" />
              </button>
              <Avatar src={activeData.user.avatar} alt={activeData.user.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{activeData.user.name}</div>
                <div className="text-[11px] text-leaf-700/70">Lv.{activeData.user.level}</div>
              </div>
              <Link
                href={`/user/${activeData.user.id}`}
                className="btn-outline h-8 !px-3 !text-xs"
              >
                {t('nav.myProfile')}
              </Link>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-leaf-50/30 p-5"
            >
              {activeData.messages.length === 0 ? (
                <Empty icon="👋" title={t('messages.empty')} />
              ) : (
                activeData.messages.map((m) => (
                  <Bubble
                    key={m.id}
                    msg={m}
                    peer={activeData.user.avatar}
                    peerName={activeData.user.name}
                    me={user}
                  />
                ))
              )}
            </div>

            <footer className="border-t border-leaf-100 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={t('messages.inputPlaceholder')}
                  className="input min-h-[40px] resize-none"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  className="btn-primary h-10 !px-4"
                >
                  {sending ? t('common.loading') : t('messages.send')}
                </button>
              </div>
            </footer>
          </section>
        ) : (
          <section className="hidden min-w-0 flex-1 items-center justify-center text-sm text-leaf-700/60 md:flex">
            <div className="text-center">
              <div className="text-4xl">💬</div>
              <div className="mt-2">{t('messages.pickConversation')}</div>
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}

function Bubble({
  msg,
  peer,
  peerName,
  me,
}: {
  msg: Message;
  peer: string;
  peerName: string;
  me: User;
}) {
  const isMe = msg.from === 'me';
  return (
    <div className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : '')}>
      <Avatar
        src={isMe ? me.avatar : peer}
        alt={isMe ? me.name : peerName}
        size={32}
      />
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-3 py-2 text-sm',
          isMe ? 'bg-leaf-500 text-white rounded-br-sm' : 'bg-white rounded-bl-sm'
        )}
      >
        {msg.text}
      </div>
    </div>
  );
}
