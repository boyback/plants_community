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
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';



export default function Page() {
  return (
    <Suspense fallback={null}>
      <MessagesInner />
    </Suspense>);

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
        const d = await api.get<{user: User;messages: Message[];}>(
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
        prev ?
        {
          ...prev,
          messages: [
          ...prev.messages,
          {
            id: msg.id,
            from: 'other',
            text: msg.text,
            at: msg.createdAt
          } satisfies Message]

        } :
        prev
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
        text: draft.trim()
      });
      setActiveData((d) => d ? { ...d, messages: [...d.messages, msg] } : d);
      setDraft('');
      // 刷新列表(最新消息时间)
      await loadList();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('messages.errorSend'));
    } finally {
      setSending(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>✉️</div>
          <div className={cx(styles.r_eccd13ef, styles.r_42536e69, styles.r_e83a7042)}>{t('error.unauthorized')}</div>
          <Link href="/login?redirect=/messages" className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
            {t('nav.login')}
          </Link>
        </div>
      </Shell>);

  }

  return (
    <Shell withSidebar={false}>
      <div className={cx(styles.r_da019856, styles.r_99d72c7f, styles.r_9d60be3a)}>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>{t('messages.title')}</h1>
      </div>
      {/* 移动端单视图切换:没选对话看列表,选了看对话;桌面端并排 */}
      <div className={cx(styles.r_60fbb771, styles.r_dbe0510f, styles.r_243d6257, styles.r_2cd02d11, styles.r_4ffd05d0)}>
        <aside className={cn(cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_8dddea07, styles.r_5ceb636b, styles.r_88b684d2, styles.r_cdaa9818),

        activePeer ? cx(styles.r_99d72c7f, styles.r_7651aeb9) : styles.r_60fbb771
        )}>
          <div className={cx(styles.r_65fdbade, styles.r_88b684d2, styles.r_eb6e8b88)}>
            <div className={styles.r_d89972fe}>
              <Icon
                name="search"
                size={14}
                className={cx(styles.r_da4dbfbc, styles.r_22e59b72, styles.r_d694ba66, styles.r_36b381be, styles.r_eb16169c)} />

              <Input className={styles.r_e4af8854} placeholder={t('messages.search')} />
            </div>
          </div>
          <div className={cx(styles.r_36e579c0, styles.r_92bf82f4)}>
            {loading ?
            <div className={cx(styles.r_0478c89a, styles.r_ca6bf630, styles.r_359090c2, styles.r_6c4cc49e)}>{t('common.loading')}</div> :
            list.length === 0 ?
            <div className={styles.r_0478c89a}><Empty icon="💬" title={t('messages.empty')} /></div> :

            list.map((c) =>
            <button
              key={c.id}
              onClick={() => setActivePeer(c.user.id)}
              className={cn(cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_60541e1e, styles.r_1004c0c3, styles.r_65fdbade, styles.r_5ff6a729, styles.r_0e17f2bd, styles.r_1b2d54a3, styles.r_2eba0d65, styles.r_ceb69a6b),

              activePeer === c.user.id ? styles.r_7ebecbb6 : styles.r_98dc6304
              )}>

                  <div className={styles.r_d89972fe}>
                    <Avatar src={c.user.avatar} alt={c.user.name} size={40} />
                    {c.unread > 0 &&
                <span className={cx(styles.r_da4dbfbc, styles.r_4c15f4f8, styles.r_2a95a5f4, styles.r_f3c543ad, styles.r_11e59c6d, styles.r_83ffee4e, styles.r_67d66567, styles.r_ac204c10, styles.r_45a732a4, styles.r_d8e0e382, styles.r_1dc571a3, styles.r_72a4c7cd)}>
                        {c.unread}
                      </span>
                }
                  </div>
                  <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                    <div className={cx(styles.r_60fbb771, styles.r_b7012bb2, styles.r_8ef2268e, styles.r_77a2a20e)}>
                      <span className={cx(styles.r_f283ea9b, styles.r_fc7473ca, styles.r_2689f395)}>{c.user.name}</span>
                      <span className={cx(styles.r_012fbd12, styles.r_1dc571a3, styles.r_6c4cc49e)}>
                        {timeAgo(c.lastAt)}
                      </span>
                    </div>
                    <div className={cx(styles.r_15e1b1f4, styles.r_f283ea9b, styles.r_359090c2, styles.r_69335b95)}>{c.lastMessage}</div>
                  </div>
                </button>
            )
            }
          </div>
        </aside>

        {activeData && user ?
        <section className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_8dddea07)}>
            <header className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_65fdbade, styles.r_88b684d2, styles.r_0e17f2bd, styles.r_1b2d54a3, styles.r_9395bd21, styles.r_a6a1853d)}>
              <button
              type="button"
              onClick={() => setActivePeer(null)}
              className={cx(styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_012fbd12, styles.r_67d66567, styles.r_5f22e64f, styles.r_5f6a59f1, styles.r_5756b7b4, styles.r_e477a6af)}
              aria-label="返回列表">

                <Icon name="arrow-right" size={18} className={styles.r_3350916b} />
              </button>
              <Avatar src={activeData.user.avatar} alt={activeData.user.name} size={36} />
              <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                <div className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>{activeData.user.name}</div>
                <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>Lv.{activeData.user.level}</div>
              </div>
              <Link
              href={`/user/${activeData.user.id}`}
              className={cx(styles.r_ed8a5df7, styles.r_23b4e5ed, styles.r_dd702538)}>

                {t('nav.myProfile')}
              </Link>
            </header>

            <div
            ref={scrollRef}
            className={cx(styles.r_36e579c0, styles.r_6ed543e2, styles.r_92bf82f4, styles.r_54720a96, styles.r_c07e54fd)}>

              {activeData.messages.length === 0 ?
            <Empty icon="👋" title={t('messages.empty')} /> :

            activeData.messages.map((m) =>
            <Bubble
              key={m.id}
              msg={m}
              peer={activeData.user.avatar}
              peerName={activeData.user.name}
              me={user} />

            )
            }
            </div>

            <footer className={cx(styles.r_b950dda2, styles.r_88b684d2, styles.r_eb6e8b88)}>
              <div className={cx(styles.r_60fbb771, styles.r_6f27f4f7, styles.r_77a2a20e)}>
                <Textarea
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
                className={cx(styles.r_bb37cef0, styles.r_6aef3201)} />

                <button
                type="button"
                onClick={send}
                disabled={sending || !draft.trim()}
                className={cx(styles.r_426b8b75, styles.r_af7490b1)}>

                  {sending ? t('common.loading') : t('messages.send')}
                </button>
              </div>
            </footer>
          </section> :

        <section className={cx(styles.r_99d72c7f, styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_3960ffc2, styles.r_86843cf1, styles.r_fc7473ca, styles.r_6c4cc49e, styles.r_7651aeb9)}>
            <div className={styles.r_ca6bf630}>
              <div className={styles.r_a95699d9}>💬</div>
              <div className={styles.r_50d0d216}>{t('messages.pickConversation')}</div>
            </div>
          </section>
        }
      </div>
    </Shell>);

}

function Bubble({
  msg,
  peer,
  peerName,
  me





}: {msg: Message;peer: string;peerName: string;me: User;}) {
  const isMe = msg.from === 'me';
  return (
    <div className={cn(cx(styles.r_60fbb771, styles.r_6f27f4f7, styles.r_77a2a20e), isMe ? styles.r_074cdbac : '')}>
      <Avatar
        src={isMe ? me.avatar : peer}
        alt={isMe ? me.name : peerName}
        size={32} />

      <div
        className={cn(cx(styles.r_cd4a7415, styles.r_68f2db62, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca),

        isMe ? cx(styles.r_45499621, styles.r_72a4c7cd, styles.r_4fe27797) : cx(styles.r_5e10cdb8, styles.r_0598e20e)
        )}>

        {msg.text}
      </div>
    </div>);

}
