'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PostCard } from '@/components/post/PostCard';
import { Avatar } from '@/components/ui/Avatar';
import { UserName } from '@/components/ui/UserName';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { VipBadge } from '@/components/ui/VipBadge';
import { cn, formatDate, formatNumber, boardUrl } from '@/lib/utils';
import { api, ApiError } from '@/lib/client-api';
import { LEVELS } from '@/lib/levels';
import { useI18n } from '@/i18n/I18nContext';
import type { Badge, Board, Post, User } from '@/lib/types';

type TabKey =
  | 'posts'
  | 'likes'
  | 'collects'
  | 'following'
  | 'followers'
  | 'followed-boards'
  | 'badges'
  | 'about';

const tabs: { key: TabKey; labelKey: string }[] = [
  { key: 'posts', labelKey: 'user.tabs.posts' },
  { key: 'likes', labelKey: 'user.tabs.likes' },
  { key: 'collects', labelKey: 'user.tabs.collects' },
  { key: 'following', labelKey: 'user.tabs.following' },
  { key: 'followers', labelKey: 'user.tabs.followers' },
  { key: 'followed-boards', labelKey: 'user.tabs.followedBoards' },
  { key: 'badges', labelKey: 'user.tabs.badges' },
  { key: 'about', labelKey: 'user.tabs.about' },
];

export function UserPageClient({
  user,
  isMe,
  initialFollowed,
  posts,
  likedPosts,
  collectedPosts,
  exp = 0,
  vip,
  daysLeft,
}: {
  user: User;
  isMe: boolean;
  initialFollowed: boolean;
  posts: Post[];
  likedPosts: Post[];
  collectedPosts: Post[];
  exp?: number;
  vip?: { isVip: boolean; lifetime: boolean; expireAt: string | null };
  daysLeft?: number | null;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === 'undefined') return 'posts';
    const p = new URLSearchParams(window.location.search).get('tab');
    const allowed: TabKey[] = [
      'posts', 'likes', 'collects', 'following', 'followers',
      'followed-boards', 'badges', 'about',
    ];
    // 支持旧 tab 名 following-boards
    const normalized = p === 'following-boards' ? 'followed-boards' : p;
    return allowed.includes(normalized as TabKey) ? (normalized as TabKey) : 'posts';
  });
  const [followed, setFollowed] = useState(initialFollowed);
  const [busy, setBusy] = useState(false);

  // 计算下一级 EXP
  const currentDef = LEVELS.find((l) => l.level === user.level);
  const nextDef = LEVELS.find((l) => l.level === user.level + 1);
  const expBase = currentDef?.expRequired ?? 0;
  const expCap = nextDef?.expRequired ?? expBase + 1000;
  const expPercent =
    nextDef && expCap > expBase
      ? Math.min(100, Math.max(0, Math.round(((exp - expBase) / (expCap - expBase)) * 100)))
      : 100;

  const toggleFollow = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ followed: boolean }>(`/api/users/${user.id}/follow`);
      setFollowed(r.followed);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        window.location.href = '/login?redirect=/user/' + user.id;
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* 封面 */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-leaf-100">
        <div className="relative aspect-[21/5] w-full bg-gradient-to-br from-leaf-300 via-leaf-400 to-leaf-600">
          <Image
            src="https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1600"
            alt=""
            fill
            className="object-cover opacity-60 mix-blend-overlay"
            unoptimized
          />
        </div>
        <div className="flex flex-col gap-4 border-t border-leaf-100 bg-white p-5 md:flex-row md:items-end">
          <div className="-mt-14 md:-mt-20">
            <Avatar src={user.avatar} alt={user.name} size={100} ring />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className={cn(
                  'text-xl font-bold',
                  vip?.isVip ? 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 bg-clip-text text-transparent' : 'text-ink-800'
                )}
              >
                {user.name}
              </h1>
              <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-[11px] font-medium text-leaf-700">
                Lv.{user.level} · {currentDef ? t(`levels.name.${currentDef.level}`) : ''}
              </span>
              {vip?.isVip && <VipBadge size="sm" lifetime={vip.lifetime} />}
            </div>
            <p className="mt-1 text-sm text-leaf-700/80">{user.bio || t('user.noBio')}</p>

            {/* EXP 进度条 */}
            {nextDef && (
              <div className="mt-3 max-w-md">
                <div className="flex items-baseline justify-between text-[11px] text-leaf-700/70">
                  <span>EXP {exp} / {expCap}</span>
                  <span>{t('user.expToNext', { level: nextDef.level, need: expCap - exp })}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-leaf-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-leaf-400 to-leaf-600"
                    style={{ width: `${expPercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-leaf-700/70">
              <span>{t('user.joinedAt', { date: formatDate(user.joinedAt) })}</span>
              <span>·</span>
              <button
                type="button"
                onClick={() => setTab('posts')}
                className="hover:text-leaf-700"
              >
                <span className="text-ink-800 font-semibold">{user.posts}</span> {t('user.stats.posts')}
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setTab('followers')}
                className="hover:text-leaf-700"
              >
                <span className="text-ink-800 font-semibold">{formatNumber(user.followers)}</span> {t('user.stats.followers')}
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setTab('following')}
                className="hover:text-leaf-700"
              >
                <span className="text-ink-800 font-semibold">{formatNumber(user.following)}</span> {t('user.stats.following')}
              </button>
              {vip?.isVip && (
                <span className="text-amber-700">
                  · 👑{' '}
                  {vip.lifetime
                    ? t('user.vip.lifetime')
                    : daysLeft !== null && daysLeft !== undefined
                    ? t('user.vip.remainDays', { days: daysLeft })
                    : t('user.vip.member')}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isMe ? (
              <>
                <Link href="/settings/privacy" className="btn-outline !text-xs">
                  {t('user.actions.privacy')}
                </Link>
                <button type="button" className="btn-outline !text-xs" disabled title={t('user.actions.editProfileUnavailable')}>
                  <Icon name="edit" size={12} />
                  {t('user.actions.editProfile')}
                </button>
              </>
            ) : (
              <>
                <Link href={`/messages?to=${user.id}`} className="btn-outline">
                  <Icon name="message" size={14} />
                  {t('user.actions.message')}
                </Link>
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={busy}
                  className={cn('btn', followed ? 'bg-leaf-100 text-leaf-700' : 'btn-primary')}
                >
                  {followed ? t('user.actions.unfollow') : t('user.actions.follow')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-1 overflow-x-auto border-b border-leaf-100">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'relative whitespace-nowrap px-4 py-2.5 text-sm transition-colors',
              tab === item.key ? 'text-leaf-700 font-medium' : 'text-ink-700/60 hover:text-leaf-700'
            )}
          >
            {t(item.labelKey)}
            {tab === item.key && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-leaf-500" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {tab === 'posts' &&
            (posts.length > 0 ? (
              <div className="columns-1 gap-3 sm:columns-2">
                {posts.map((p) => (
                  <div key={p.id} className="mb-3 break-inside-avoid">
                    <PostCard post={p} />
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon="🌱" title={t('user.empty.posts')} />
            ))}

          {tab === 'likes' &&
            (likedPosts.length > 0 ? (
              <div className="columns-1 gap-3 sm:columns-2">
                {likedPosts.map((p) => (
                  <div key={p.id} className="mb-3 break-inside-avoid">
                    <PostCard post={p} />
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon="❤️" title={t('user.empty.likes')} />
            ))}

          {tab === 'collects' &&
            (collectedPosts.length > 0 ? (
              <div className="columns-1 gap-3 sm:columns-2">
                {collectedPosts.map((p) => (
                  <div key={p.id} className="mb-3 break-inside-avoid">
                    <PostCard post={p} />
                  </div>
                ))}
              </div>
            ) : (
              <Empty icon="⭐" title={t('user.empty.collects')} />
            ))}

          {tab === 'following' && (
            <FollowListTab userId={user.id} kind="following" isMe={isMe} />
          )}
          {tab === 'followers' && (
            <FollowListTab userId={user.id} kind="followers" isMe={isMe} />
          )}
          {tab === 'followed-boards' && <FollowedBoardsTab isMe={isMe} />}

          {tab === 'badges' && <BadgeWall badges={user.badges} />}

          {tab === 'about' && <AboutTab user={user} />}
        </div>

        <div className="space-y-5">
          <div className="card p-4">
            <div className="mb-3 text-sm font-semibold">{t('user.badges.featured')}</div>
            <div className="grid grid-cols-4 gap-2">
              {user.badges
                .filter((b) => b.obtained)
                .slice(0, 8)
                .map((b) => (
                  <div
                    key={b.id}
                    title={b.name}
                    className="grid h-12 place-items-center rounded-lg border border-leaf-100 bg-leaf-50 text-2xl"
                  >
                    {b.icon}
                  </div>
                ))}
            </div>
            <button
              onClick={() => setTab('badges')}
              className="mt-3 w-full text-center text-[11px] text-leaf-700 hover:underline"
            >
              {t('user.badges.viewAll')}
            </button>
          </div>

          <div className="card p-4">
            <div className="mb-3 text-sm font-semibold">{t('user.badges.activityData')}</div>
            <div className="space-y-2 text-xs">
              <StatRow label={t('user.stats.totalPosts')} value={String(user.posts)} />
              <StatRow label={t('user.stats.followers')} value={formatNumber(user.followers)} />
              <StatRow label={t('user.stats.following')} value={formatNumber(user.following)} />
              <StatRow label={t('user.stats.badgesEarned')} value={String(user.badges.filter((b) => b.obtained).length)} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-leaf-700/70">{label}</span>
      <span className="font-medium text-ink-800">{value}</span>
    </div>
  );
}

function BadgeWall({ badges }: { badges: Badge[] }) {
  const { t } = useI18n();
  const obtained = badges.filter((b) => b.obtained);
  const locked = badges.filter((b) => !b.obtained);
  const percent = badges.length > 0 ? Math.round((obtained.length / badges.length) * 100) : 0;
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">{t('user.badges.obtainedCount', { n: obtained.length })}</div>
          <div className="text-[11px] text-leaf-700/70">
            {t('user.badges.completionRate', { percent })}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {obtained.map((b) => (
            <BadgeCard key={b.id} badge={b} />
          ))}
        </div>
      </div>
      {locked.length > 0 && (
        <div>
          <div className="mb-3 text-sm font-semibold">{t('user.badges.lockedCount', { n: locked.length })}</div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {locked.map((b) => (
              <BadgeCard key={b.id} badge={b} locked />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BadgeCard({ badge, locked }: { badge: Badge; locked?: boolean }) {
  return (
    <div
      className={cn(
        'card flex flex-col items-center p-3 text-center transition-transform hover:-translate-y-0.5',
        locked && 'opacity-50'
      )}
    >
      <div
        className={cn(
          'mb-2 grid h-14 w-14 place-items-center rounded-xl text-3xl',
          locked ? 'bg-leaf-50 grayscale' : 'bg-gradient-to-br from-leaf-50 to-leaf-100'
        )}
      >
        {badge.icon}
      </div>
      <div className="text-xs font-medium text-ink-800">{badge.name}</div>
      <div className="mt-0.5 text-[10px] leading-tight text-leaf-700/70">{badge.description}</div>
    </div>
  );
}

function AboutTab({ user }: { user: User }) {
  const { t } = useI18n();
  return (
    <div className="card p-5 space-y-3 text-sm">
      <InfoRow label={t('user.info.username')} value={user.name} />
      <InfoRow label={t('user.info.userId')} value={user.id} />
      <InfoRow label={t('user.info.level')} value={`Lv.${user.level}`} />
      <InfoRow label={t('user.info.joinDate')} value={formatDate(user.joinedAt)} />
      <InfoRow label={t('user.info.bio')} value={user.bio ?? t('user.info.empty')} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 py-1.5">
      <div className="w-24 shrink-0 text-xs text-leaf-700/70">{label}</div>
      <div className="flex-1 text-ink-800">{value}</div>
    </div>
  );
}

/* ---------------- 关注 / 粉丝 Tab ---------------- */

function FollowListTab({
  userId,
  kind,
  isMe,
}: {
  userId: string;
  kind: 'following' | 'followers';
  isMe: boolean;
}) {
  const { t } = useI18n();
  const [list, setList] = useState<User[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setBlocked(null);
    api
      .get<{ items: User[]; total: number }>(
        `/api/users/${userId}/${kind}`
      )
      .then((r) => {
        setList(r.items);
        setTotal(r.total);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) {
          setBlocked(e.message);
        } else {
          setBlocked(e instanceof Error ? e.message : t('error.generic'));
        }
      })
      .finally(() => setLoading(false));
  }, [userId, kind, t]);

  if (loading) {
    return <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>;
  }

  if (blocked) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl">🔒</div>
        <div className="mt-3 text-base font-semibold text-ink-800">{blocked}</div>
        <div className="mt-1 text-xs text-leaf-700/60">
          {kind === 'following' ? t('user.hidden.following') : t('user.hidden.followers')}
          {isMe && (
            <>
              <br />
              <Link href="/settings/privacy" className="text-leaf-700 hover:underline">
                {t('user.hidden.goToSettings')}
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!list || list.length === 0) {
    return (
      <Empty
        icon={kind === 'following' ? '🤝' : '👥'}
        title={kind === 'following' ? t('user.empty.following') : t('user.empty.followers')}
      />
    );
  }

  return (
    <>
      <div className="mb-3 text-xs text-leaf-700/70">{t('user.totalCount', { n: total })}</div>
      <ul className="space-y-2">
        {list.map((u) => (
          <li key={u.id} className="card flex items-center gap-3 p-3">
            <Link href={`/user/${u.id}`}>
              <Avatar src={u.avatar} alt={u.name} size={44} />
            </Link>
            <div className="min-w-0 flex-1">
              <UserName user={u} size="sm" />
              {u.bio && (
                <div className="mt-0.5 line-clamp-1 text-[11px] text-leaf-700/70">{u.bio}</div>
              )}
              <div className="mt-1 text-[10px] text-leaf-700/60">
                Lv.{u.level} · {formatNumber(u.followers)} · {u.posts}
              </div>
            </div>
            <Link href={`/user/${u.id}`} className="btn-outline !text-xs">{t('nav.myProfile')}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------------- 关注的板块 Tab(仅自己可见) ---------------- */

function FollowedBoardsTab({ isMe }: { isMe: boolean }) {
  const { t } = useI18n();
  const [list, setList] = useState<Board[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isMe) {
      setLoading(false);
      return;
    }
    api
      .get<Board[]>('/api/boards/followed')
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [isMe]);

  if (!isMe) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl">🔒</div>
        <div className="mt-3 text-base font-semibold">{t('user.privateBoards')}</div>
        <div className="mt-1 text-xs text-leaf-700/60">
          {t('user.privateBoardsHint')}
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>;
  }
  if (!list || list.length === 0) {
    return <Empty icon="⭐" title={t('user.empty.followedBoards')} desc={t('user.empty.followedBoardsHint')} />;
  }

  return (
    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {list.map((b) => (
        <li key={b.id}>
          <Link
            href={boardUrl(b)}
            className="card flex items-center gap-3 p-3 transition-shadow hover:shadow-md"
          >
            <span className="text-2xl shrink-0">{b.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink-800">{b.name}</div>
              <div className="text-[10px] text-leaf-700/60">
                {b.path.map((p) => p.name).join(' · ')}
              </div>
            </div>
            <span className="shrink-0 text-[11px] text-leaf-700/70">
              📝 {b.posts}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
