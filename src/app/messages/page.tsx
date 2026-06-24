'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Avatar } from '@/components/ui/Avatar';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { Icon } from '@/components/ui/Icon';
import { UserIdentity } from '@/components/ui/UserIdentity';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useRealtime, type RealtimePayload } from '@/context/RealtimeContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import type { Conversation, Message, User } from '@/lib/types';
import { cn, formatPrice, timeAgo } from '@/lib/utils';
import styles from './page.module.scss';

type MarketListingMessageCard = {
  id: string;
  title: string;
  cover: string;
  minPrice: number;
  maxPrice: number;
  status: string;
  sellerId: string;
  href: string;
};

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
  const initialListingId = searchParams.get('listing');

  const [list, setList] = useState<Conversation[]>([]);
  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<{ user: User; messages: Message[] } | null>(null);
  const [draft, setDraft] = useState('');
  const [pendingListing, setPendingListing] = useState<MarketListingMessageCard | null>(null);
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
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
      setConversationLoading(true);
      try {
        const data = await api.get<{ user: User; messages: Message[] }>(`/api/conversations/${activePeer}`);
        setActiveData(data);
      } catch {
        setActiveData(null);
      } finally {
        setConversationLoading(false);
      }
    })();
  }, [activePeer]);

  useEffect(() => {
    if (!initialListingId || !activePeer) {
      setPendingListing(null);
      return;
    }
    let cancelled = false;
    api
      .get<MarketListingMessageCard>(`/api/market/listings/${initialListingId}/message-card`)
      .then((card) => {
        if (!cancelled && card.sellerId === activePeer) {
          setPendingListing(card);
        }
      })
      .catch(() => {
        if (!cancelled) setPendingListing(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activePeer, initialListingId]);

  useEffect(() => {
    if (!user) return;
    const handler = (payload: RealtimePayload) => {
      const msg = payload.data as {
        id: string;
        fromId: string;
        toId: string;
        text: string;
        payload?: Message['payload'];
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
                    payload: msg.payload,
                    at: msg.createdAt,
                  } satisfies Message,
                ],
              }
            : prev
        );
      }
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

  const filteredList = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return list;
    return list.filter((item) => {
      const name = item.user.name.toLowerCase();
      const last = item.lastMessage.toLowerCase();
      return name.includes(keyword) || last.includes(keyword);
    });
  }, [list, query]);

  const send = async () => {
    if (!draft.trim() || !activePeer || !user) return;
    setSending(true);
    try {
      const msg = await api.post<Message>('/api/messages', {
        toId: activePeer,
        text: draft.trim(),
        payload: pendingListing
          ? {
              type: 'market_listing',
              listingId: pendingListing.id,
            }
          : undefined,
      });
      setActiveData((data) => (data ? { ...data, messages: [...data.messages, msg] } : data));
      setDraft('');
      setPendingListing(null);
      await loadList();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('messages.errorSend'));
    } finally {
      setSending(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className={styles.loginCard}>
          <div className={styles.loginIcon}>
            <Icon name="mail" size={30} />
          </div>
          <h1>{t('error.unauthorized')}</h1>
          <ButtonLink href="/login?redirect=/messages" size="md">
            {t('nav.login')}
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  return (
    <Shell withSidebar={false}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>{t('messages.title')}</h1>
          <p className={styles.subtitle}>{t('messages.pickConversation')}</p>
        </div>
      </div>

      <div className={styles.frame}>
        <aside className={cn(styles.sidebar, activePeer && styles.sidebarHiddenOnMobile)}>
          <div className={styles.searchPanel}>
            <Icon name="search" size={15} className={styles.searchIcon} />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={styles.searchInput}
              placeholder={t('messages.search')}
              aria-label={t('messages.search')}
            />
          </div>

          <div className={styles.conversationList}>
            {loading ? (
              <div className={styles.stateText}>{t('common.loading')}</div>
            ) : filteredList.length === 0 ? (
              <div className={styles.emptyWrap}>
                <Empty icon="💬" title={t('messages.empty')} />
              </div>
            ) : (
              filteredList.map((conversation) => (
                <ConversationButton
                  key={conversation.id}
                  conversation={conversation}
                  active={activePeer === conversation.user.id}
                  onClick={() => setActivePeer(conversation.user.id)}
                />
              ))
            )}
          </div>
        </aside>

        <section className={cn(styles.chatPanel, !activePeer && styles.chatHiddenOnMobile)}>
          {conversationLoading ? (
            <div className={styles.chatState}>{t('common.loading')}</div>
          ) : activeData && user ? (
            <>
              <header className={styles.chatHeader}>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  className={styles.backButton}
                  onClick={() => setActivePeer(null)}
                  aria-label="返回列表"
                >
                  <Icon name="arrow-right" size={18} className={styles.backIcon} />
                </Button>

                <UserIdentity
                  user={activeData.user}
                  size="md"
                  variant="list"
                  asLink={false}
                  showLevel
                  className={styles.peerIdentity}
                  avatarClassName={styles.peerAvatar}
                  avatarPendantLayout="compact"
                />
                <ButtonLink href={`/user/${activeData.user.id}`} variant="ghost" size="sm" className={styles.profileLink}>
                  {t('nav.myProfile')}
                </ButtonLink>
              </header>

              <div ref={scrollRef} className={styles.messageList}>
                {activeData.messages.length === 0 ? (
                  <Empty icon="👋" title={t('messages.empty')} />
                ) : (
                  activeData.messages.map((message) => (
                    <Bubble
                      key={message.id}
                      msg={message}
                      peer={activeData.user.avatar}
                      peerName={activeData.user.name}
                      me={user}
                    />
                  ))
                )}
              </div>

              <footer className={styles.composer}>
                <div className={styles.composerBox}>
                  {pendingListing && (
                    <div className={styles.pendingCardWrap}>
                      <MessageListingCard listing={pendingListing} compact />
                      <button
                        type="button"
                        className={styles.removePendingCard}
                        onClick={() => setPendingListing(null)}
                        aria-label="移除商品卡片"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  )}
                  <Textarea
                    autoResize
                    minRows={3}
                    maxRows={6}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={t('messages.inputPlaceholder')}
                    className={styles.composerInput}
                  />
                  <Button
                    size="sm"
                    onClick={() => void send()}
                    disabled={sending || !draft.trim()}
                    className={styles.sendButton}
                  >
                    <Icon name="mail" size={15} />
                    {sending ? t('common.loading') : t('messages.send')}
                  </Button>
                </div>
              </footer>
            </>
          ) : (
            <div className={styles.placeholder}>
              <Icon name="mail" size={34} />
              <p>{t('messages.pickConversation')}</p>
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}

function ConversationButton({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(styles.conversationItem, active && styles.conversationItemActive)}
      aria-current={active ? 'true' : undefined}
    >
      <div className={styles.avatarWrap}>
        <UserIdentity
          user={conversation.user}
          size="md"
          asLink={false}
          showName={false}
          avatarClassName={styles.conversationAvatar}
          avatarPendantLayout="compact"
        />
        {conversation.unread > 0 ? <span className={styles.unreadBadge}>{conversation.unread}</span> : null}
      </div>

      <div className={styles.conversationBody}>
        <div className={styles.conversationTop}>
          <span className={styles.conversationName}>{conversation.user.name}</span>
          <time className={styles.conversationTime}>{timeAgo(conversation.lastAt)}</time>
        </div>
        <div className={styles.conversationPreview}>{conversation.lastMessage}</div>
      </div>
    </button>
  );
}

function Bubble({ msg, peer, peerName, me }: { msg: Message; peer: string; peerName: string; me: User }) {
  const isMe = msg.from === 'me';
  return (
    <div className={cn(styles.bubbleRow, isMe && styles.bubbleRowMe)}>
      <Avatar
        src={isMe ? me.avatar : peer}
        alt={isMe ? me.name : peerName}
        size={null}
        className={styles.bubbleAvatar}
      />
      <div className={cn(styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther)}>
        {msg.payload?.type === 'market_listing' && (
          <MessageListingCard listing={msg.payload.listing} />
        )}
        {msg.text}
      </div>
    </div>
  );
}

function MessageListingCard({
  listing,
  compact = false,
}: {
  listing: {
    id: string;
    title: string;
    cover: string;
    minPrice: number;
    maxPrice: number;
    status: string;
    href: string;
  };
  compact?: boolean;
}) {
  return (
    <a href={listing.href} className={cn(styles.messageListingCard, compact && styles.messageListingCardCompact)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={listing.cover} alt={listing.title} className={styles.messageListingCover} />
      <div className={styles.messageListingBody}>
        <div className={styles.messageListingLabel}>交易商品</div>
        <div className={styles.messageListingTitle}>{listing.title}</div>
        <div className={styles.messageListingMeta}>
          <span>{formatListingPrice(listing.minPrice, listing.maxPrice)}</span>
          <span>{listingStatusLabel(listing.status)}</span>
        </div>
      </div>
    </a>
  );
}

function formatListingPrice(minPrice: number, maxPrice: number) {
  if (minPrice === maxPrice) return formatPrice(minPrice);
  return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
}

function listingStatusLabel(status: string) {
  if (status === 'on_sale') return '在售';
  if (status === 'trading') return '交易中';
  if (status === 'sold_out') return '已售罄';
  if (status === 'off_shelf') return '已下架';
  if (status === 'pending_review') return '待审核';
  return status;
}
