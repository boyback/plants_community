'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { PostCard } from '@/components/post/PostCard';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { cn, formatDate, formatNumber } from '@/lib/utils';
import { api, ApiError } from '@/lib/client-api';
import type { Badge, Post, User } from '@/lib/types';

type TabKey = 'posts' | 'likes' | 'collects' | 'badges' | 'about';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'posts', label: '发帖' },
  { key: 'likes', label: '赞过' },
  { key: 'collects', label: '收藏' },
  { key: 'badges', label: '徽章墙' },
  { key: 'about', label: '个人信息' },
];

export function UserPageClient({
  user,
  isMe,
  initialFollowed,
  posts,
  likedPosts,
  collectedPosts,
}: {
  user: User;
  isMe: boolean;
  initialFollowed: boolean;
  posts: Post[];
  likedPosts: Post[];
  collectedPosts: Post[];
}) {
  const [tab, setTab] = useState<TabKey>('posts');
  const [followed, setFollowed] = useState(initialFollowed);
  const [busy, setBusy] = useState(false);

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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ink-800">{user.name}</h1>
              <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-[11px] font-medium text-leaf-700">
                Lv.{user.level}
              </span>
            </div>
            <p className="mt-1 text-sm text-leaf-700/80">{user.bio || '这个人很懒,什么都没写...'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-leaf-700/70">
              <span>加入于 {formatDate(user.joinedAt)}</span>
              <span>·</span>
              <span className="text-ink-800 font-semibold">{user.posts}</span> 帖
              <span>·</span>
              <span className="text-ink-800 font-semibold">{formatNumber(user.followers)}</span> 粉丝
              <span>·</span>
              <span className="text-ink-800 font-semibold">{formatNumber(user.following)}</span> 关注
            </div>
          </div>
          <div className="flex gap-2">
            {isMe ? (
              <button type="button" className="btn-outline" disabled title="编辑暂未开放">
                <Icon name="edit" size={14} />
                编辑资料
              </button>
            ) : (
              <>
                <Link href={`/messages?to=${user.id}`} className="btn-outline">
                  <Icon name="message" size={14} />
                  私信
                </Link>
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={busy}
                  className={cn('btn', followed ? 'bg-leaf-100 text-leaf-700' : 'btn-primary')}
                >
                  {followed ? '✓ 已关注' : '+ 关注'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-1 overflow-x-auto border-b border-leaf-100">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'relative whitespace-nowrap px-4 py-2.5 text-sm transition-colors',
              tab === t.key ? 'text-leaf-700 font-medium' : 'text-ink-700/60 hover:text-leaf-700'
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-leaf-500" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {tab === 'posts' &&
            (posts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            ) : (
              <Empty icon="🌱" title="还没有发过帖子" />
            ))}

          {tab === 'likes' &&
            (likedPosts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {likedPosts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            ) : (
              <Empty icon="❤️" title="还没有赞过任何帖子" />
            ))}

          {tab === 'collects' &&
            (collectedPosts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {collectedPosts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            ) : (
              <Empty icon="⭐" title="还没有收藏任何帖子" />
            ))}

          {tab === 'badges' && <BadgeWall badges={user.badges} />}

          {tab === 'about' && <AboutTab user={user} />}
        </div>

        <div className="space-y-5">
          <div className="card p-4">
            <div className="mb-3 text-sm font-semibold">🏆 徽章精选</div>
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
              查看全部徽章 →
            </button>
          </div>

          <div className="card p-4">
            <div className="mb-3 text-sm font-semibold">📊 活跃数据</div>
            <div className="space-y-2 text-xs">
              <StatRow label="总帖子" value={String(user.posts)} />
              <StatRow label="粉丝" value={formatNumber(user.followers)} />
              <StatRow label="关注" value={formatNumber(user.following)} />
              <StatRow label="已获徽章" value={String(user.badges.filter((b) => b.obtained).length)} />
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
  const obtained = badges.filter((b) => b.obtained);
  const locked = badges.filter((b) => !b.obtained);
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">已获得 · {obtained.length}</div>
          <div className="text-[11px] text-leaf-700/70">
            完成度 {badges.length > 0 ? Math.round((obtained.length / badges.length) * 100) : 0}%
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
          <div className="mb-3 text-sm font-semibold">未解锁 · {locked.length}</div>
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
  return (
    <div className="card p-5 space-y-3 text-sm">
      <InfoRow label="用户名" value={user.name} />
      <InfoRow label="用户 ID" value={user.id} />
      <InfoRow label="等级" value={`Lv.${user.level}`} />
      <InfoRow label="加入日期" value={formatDate(user.joinedAt)} />
      <InfoRow label="个人简介" value={user.bio ?? '暂无'} />
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
