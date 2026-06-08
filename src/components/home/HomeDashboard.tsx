'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Swiper as SwiperInstance } from 'swiper';
import { A11y, Autoplay, Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { AppShell } from '@/components/layout/AppShell';
import { PostListItem } from '@/components/post/PostListItem';
import type { PostVoteUpdateHandler } from '@/components/post/PostVotePreview';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/client-api';
import type { BannerItem, Post } from '@/lib/types';
import { cn, formatDateTime, formatFollowers, formatNumber } from '@/lib/utils';

type TopicItem = {
  tag: string;
  postCount: number;
  cover?: string | null;
};

type EventItem = {
  id: string;
  title: string;
  cover?: string | null;
  status: string;
  startAt: string;
  endAt: string;
  participantCount: number;
};

type ReminderItem = {
  id: string;
  speciesName: string;
  cover: string;
  text: string;
  when: string;
};

type SelectionItem = {
  id: string;
  name: string;
  latinName: string;
  cover: string;
  difficulty: number;
  href: string;
};

type HomeStats = {
  speciesCount: number;
  marketCount: number;
  journalCount: number;
  postCount: number;
};

type ActiveUser = {
  id: string;
  name: string;
  avatar?: string | null;
  posts: number;
  score: number;
};

interface FeedResponse {
  items: Post[];
  nextCursor: string | null;
}

const RECOMMENDED_FEED_PAGE_SIZE = 20;

export function HomeDashboard({
  posts,
  banners,
  topics,
  events,
  stats,
}: {
  posts: Post[];
  banners: BannerItem[];
  topics: TopicItem[];
  events: EventItem[];
  reminders: ReminderItem[];
  stats: HomeStats;
  selections: SelectionItem[];
}) {
  return (
    <AppShell>
      <div>
        <HomeHero banners={banners} />
        <FeatureGrid stats={stats} />
        <Recommended posts={posts} />
        <EventsStrip events={events} />
        <HotTopics topics={topics} />
      </div>
    </AppShell>
  );
}

function HomeHero({ banners }: { banners: BannerItem[] }) {
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = banners.length
    ? banners
    : [
        {
          id: 'fallback',
          title: '探索多肉的美好世界',
          image: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1600',
          link: '/board',
          tint: '',
        },
      ];
  const canLoop = slides.length > 1;

  return (
    <section className="relative mx-auto my-12 w-full max-w-[1280px] overflow-hidden rounded-[6px] bg-white shadow-sm">
      <Swiper
        modules={[Autoplay, Navigation, A11y]}
        slidesPerView={1}
        loop={canLoop}
        speed={650}
        navigation={canLoop}
        autoplay={canLoop ? { delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
        a11y={{ enabled: true, prevSlideMessage: '上一张 Banner', nextSlideMessage: '下一张 Banner' }}
        className="home-hero-swiper h-[454px] md:h-[594px]"
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onRealIndexChange={(swiper) => setActiveIndex(swiper.realIndex)}
      >
        {slides.map((banner, index) => (
          <SwiperSlide
            key={banner.id}
            data-swiper-autoplay={banner.durationMs && banner.durationMs > 0 ? banner.durationMs : undefined}
          >
            <Link href={banner.link || '/board'} className="flex h-full flex-col" aria-label={banner.title}>
              <span className="relative block h-[320px] overflow-hidden bg-leaf-100 md:h-[460px]">
                <Image
                  src={banner.image}
                  alt={banner.title || '多肉植物'}
                  fill
                  priority={index === 0}
                  unoptimized
                  className="object-cover"
                />
              </span>
              <span className="box-border flex h-[134px] items-center rounded-b-[6px] bg-white px-10 py-[37px]">
                <span className="line-clamp-2 whitespace-normal text-[26px] font-bold leading-tight text-black">
                  {banner.title || '探索多肉的美好世界'}
                </span>
              </span>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
      {canLoop && (
        <div className="home-hero-pagination" aria-label="轮播图分页">
          {slides.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              className={cn('home-hero-pagination-bullet', index === activeIndex && 'is-active')}
              aria-label={`切换到第 ${index + 1} 张轮播图`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => swiperRef.current?.slideToLoop(index)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Recommended({ posts }: { posts: Post[] }) {
  const [items, setItems] = useState(posts);
  const [cursor, setCursor] = useState<string | null>(
    posts.length >= RECOMMENDED_FEED_PAGE_SIZE ? '1' : posts.length === 0 ? '0' : null
  );
  const [initialLoading, setInitialLoading] = useState(posts.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(posts);
    setCursor(posts.length >= RECOMMENDED_FEED_PAGE_SIZE ? '1' : posts.length === 0 ? '0' : null);
    setInitialLoading(posts.length === 0);
    setLoadingMore(false);
    setError(null);
  }, [posts]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const result = await api.get<FeedResponse>(
        `/api/feed?tab=recommend&limit=${RECOMMENDED_FEED_PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`
      );
      setItems((prev) => {
        const seen = new Set(prev.map((post) => post.id));
        const next = result.items.filter((post) => !seen.has(post.id));
        return [...prev, ...next];
      });
      setCursor(result.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoadingMore(false);
      setInitialLoading(false);
    }
  }, [cursor, loadingMore]);

  useEffect(() => {
    if (initialLoading && cursor === '0') {
      void loadMore();
    }
  }, [cursor, initialLoading, loadMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: '0px 0px 520px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  const onVoteUpdate = useCallback<PostVoteUpdateHandler>((postId, options, total, voted, votedOptionIds) => {
    setItems((prev) =>
      prev.map((post) =>
        post.id === postId && post.vote
          ? { ...post, vote: { ...post.vote, options, total, voted, votedOptionIds } }
          : post
      )
    );
  }, []);

  if (initialLoading) {
    return <RecommendedFeedSkeleton />;
  }

  if (items.length === 0) {
    return <RecommendedFeedEmpty />;
  }

  const featuredPosts = items.slice(0, 3);
  const feedPosts = items.slice(3);
  const activeUsers = getActiveUsers(items);

  return (
    <section className="mb-[18px]">
      <div className="grid gap-5 md:grid-cols-3">
        {featuredPosts.map((post) => (
          <RecommendedCard key={post.id} post={post} />
        ))}
      </div>

      {feedPosts.length > 0 && (
        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm">
            {feedPosts.map((post, index) => (
              <PostListItem
                key={post.id}
                post={post}
                showDivider={index < feedPosts.length - 1 || loadingMore || Boolean(cursor)}
                onVoteUpdate={onVoteUpdate}
              />
            ))}
            {loadingMore && <RecommendedFeedLoading />}
            {error && <RecommendedFeedError message={error} onRetry={() => void loadMore()} />}
            {!cursor && !loadingMore && !error && <RecommendedFeedEnd />}
            {cursor && <div ref={sentinelRef} className="h-1 w-full" aria-hidden />}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-[136px] lg:self-start">
            <CheckInCard />
            <ActiveUsersCard users={activeUsers} />
          </aside>
        </div>
      )}
    </section>
  );
}

function RecommendedFeedSkeleton() {
  return (
    <section className="mb-[18px] animate-pulse">
      <div className="grid gap-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-lg border border-leaf-100 bg-white shadow-sm">
            <div className="aspect-[16/9] bg-leaf-100/80" />
            <div className="space-y-2.5 p-4">
              <div className="h-5 w-5/6 rounded bg-leaf-100" />
              <div className="h-5 w-2/3 rounded bg-leaf-100/80" />
              <div className="flex items-center justify-between pt-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-leaf-100" />
                  <div className="h-3 w-20 rounded bg-leaf-100" />
                </div>
                <div className="h-3 w-24 rounded bg-leaf-100" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <div className="px-5 py-5 md:px-6">
                <div className="mb-3.5 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-leaf-100" />
                  <div className="h-4 w-24 rounded bg-leaf-100" />
                  <div className="ml-auto h-8 w-8 rounded-lg bg-leaf-100/70" />
                </div>
                <div className="mb-2.5 h-5 w-3/4 rounded bg-leaf-100" />
                <div className="mb-2 h-3.5 w-full rounded bg-leaf-100/80" />
                <div className="mb-3 h-3.5 w-2/3 rounded bg-leaf-100/70" />
                <div className="mb-3 flex gap-1.5">
                  <div className="h-5 w-14 rounded-full bg-leaf-100/80" />
                  <div className="h-5 w-16 rounded-full bg-leaf-100/80" />
                  <div className="h-5 w-12 rounded-full bg-leaf-100/80" />
                </div>
                <div className="mb-3 grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 5 }).map((_, itemIndex) => (
                    <div key={itemIndex} className="aspect-square bg-leaf-100" />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-6 w-20 rounded-full bg-leaf-100" />
                  <div className="flex gap-3">
                    <div className="h-4 w-24 rounded bg-leaf-100" />
                    <div className="h-4 w-10 rounded bg-leaf-100" />
                    <div className="h-4 w-10 rounded bg-leaf-100" />
                  </div>
                </div>
              </div>
              {index < 3 && <div className="mx-5 border-t border-leaf-100 md:mx-6" />}
            </div>
          ))}
        </div>

        <aside className="space-y-5">
          <div className="h-[108px] rounded-[6px] border border-leaf-100 bg-white shadow-sm">
            <div className="h-14 bg-leaf-100" />
            <div className="mx-auto mt-4 h-4 w-40 rounded bg-leaf-100" />
          </div>
          <div className="rounded-2xl border border-leaf-100 bg-white p-6 shadow-sm">
            <div className="mb-5 h-6 w-32 rounded bg-leaf-100" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded bg-leaf-100" />
                  <div className="h-9 w-9 rounded-full bg-leaf-100" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-24 rounded bg-leaf-100" />
                    <div className="h-3 w-16 rounded bg-leaf-100/80" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function RecommendedFeedLoading() {
  return (
    <div className="flex items-center justify-center gap-3 border-t border-leaf-100 py-10 text-sm font-medium text-ink-600">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-leaf-200 border-t-leaf-600" />
      <span>加载中</span>
    </div>
  );
}

function RecommendedFeedEnd() {
  return (
    <div className="border-t border-leaf-100 py-8 text-center text-sm text-leaf-700/60">
      已经到底了，没有更多内容了
    </div>
  );
}

function RecommendedFeedEmpty() {
  return (
    <section className="mb-[18px] rounded-2xl border border-dashed border-leaf-200 bg-white/70 py-16 text-center">
      <div className="text-base font-semibold text-ink-900">暂无推荐内容</div>
      <div className="mt-2 text-sm text-leaf-700/60">稍后再来看看新的帖子</div>
    </section>
  );
}

function RecommendedFeedError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center gap-3 border-t border-leaf-100 py-8 text-sm text-rose-600">
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold hover:bg-rose-50"
      >
        重试
      </button>
    </div>
  );
}

function RecommendedCard({ post }: { post: Post }) {
  const cover = getPostCover(post);

  return (
    <Link
      href={`/post/${post.id}`}
      className="group overflow-hidden rounded-lg border border-leaf-100 bg-white shadow-sm"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-leaf-50">
        {cover ? (
          <Image
            src={cover}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 390px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-leaf-300">
            <Icon name="plants" size={44} />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-lg font-bold leading-[1.22] text-ink-950 group-hover:text-leaf-800">
          {post.title}
        </h3>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <UserAvatar
              src={post.author.avatar}
              alt={post.author.name}
              size={36}
              pendant={post.author.equip?.pendant ?? null}
              ring={false}
              showFestival={false}
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-ink-800">{post.author.name}</span>
              <span className="block text-[10px] font-normal text-leaf-700/60">
                {formatFollowers(post.author.followers)} 粉丝
              </span>
            </span>
          </span>
          <span className="shrink-0 text-xs text-ink-400">{formatDateTime(post.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

function CheckInCard() {
  const { user, signedInToday, signIn, signInStreak } = useAuth();
  const [todaySignedCount, setTodaySignedCount] = useTodaySignedCount();
  const [submitting, setSubmitting] = useState(false);
  const cells = useMemo(
    () => buildSignInCells(signInStreak, signedInToday),
    [signInStreak, signedInToday]
  );
  const monthLabel = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
  });

  const handleSignIn = async () => {
    if (!user || signedInToday || submitting) return;
    setSubmitting(true);
    try {
      await signIn();
      setTodaySignedCount((count) => count + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[6px] border border-leaf-100 bg-white shadow-sm">
      {user ? (
        <button
          type="button"
          onClick={handleSignIn}
          disabled={signedInToday || submitting}
          className={cn(
            'flex h-14 w-full items-center justify-center gap-2 bg-leaf-600 text-base font-bold text-white transition',
            signedInToday || submitting ? 'cursor-default opacity-90' : 'hover:bg-leaf-700'
          )}
        >
          <Icon name={signedInToday ? 'check' : 'event'} size={20} />
          {signedInToday ? '今日已签到' : submitting ? '签到中' : '立即签到'}
        </button>
      ) : (
        <Link
          href="/login?redirect=/"
          className="flex h-14 items-center justify-center gap-2 bg-leaf-600 text-base font-bold text-white transition hover:bg-leaf-700"
        >
          <Icon name="event" size={20} />
          立即签到
        </Link>
      )}

      <div className="flex min-h-[52px] items-center justify-center border-b border-leaf-100 px-4 text-center text-base font-bold text-ink-900">
        今天已有 {formatNumber(todaySignedCount)} 位肉友签到
      </div>

      {signedInToday && (
        <div className="p-4">
          <div className="mb-2.5 flex items-center justify-between text-[11px] text-leaf-700/70">
            <span>连续签到 {signInStreak} 天</span>
            <span>{monthLabel}</span>
          </div>

          <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10px] text-leaf-700/60">
            {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, index) =>
              cell == null ? (
                <div key={index} />
              ) : (
                <div
                  key={index}
                  className={cn(
                    'grid h-7 place-items-center rounded-md text-[10px] tabular-nums transition-colors',
                    cell.signed
                      ? 'bg-leaf-600 text-white shadow-sm'
                      : cell.today
                        ? 'border-2 border-dashed border-leaf-400 font-semibold text-leaf-600'
                        : cell.future
                          ? 'text-leaf-300'
                          : 'bg-leaf-50/70 text-leaf-700/70'
                  )}
                  title={
                    cell.signed
                      ? `${cell.day} 日 已签到`
                      : cell.today
                        ? `今天 ${cell.day} 日`
                        : cell.future
                          ? `${cell.day} 日 还未到`
                          : `${cell.day} 日`
                  }
                >
                  {cell.day}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ActiveUsersCard({ users }: { users: ActiveUser[] }) {
  if (users.length === 0) return null;

  return (
    <section className="rounded-2xl border border-leaf-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold leading-7 text-ink-950">本周活跃肉友</h3>
        <Link href="/ranking" className="shrink-0 text-sm font-semibold text-leaf-700 hover:text-leaf-800">
          查看
        </Link>
      </div>
      <div className="space-y-4">
        {users.slice(0, 5).map((user, index) => (
          <div key={user.id} className="flex items-center gap-3">
            <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md text-xs font-bold text-white', rankTone(index))}>
              {index + 1}
            </span>
            <Link href={`/user/${user.id}`} className="flex min-w-0 flex-1 items-center gap-2">
              <UserAvatar src={user.avatar || '/default-avatar.svg'} alt={user.name} size={38} showFestival={false} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink-900">{user.name}</span>
                <span className="block truncate text-xs text-leaf-700">活跃值 {formatNumber(user.score)}</span>
              </span>
            </Link>
            <Link
              href={`/user/${user.id}`}
              className="shrink-0 rounded-full bg-leaf-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-leaf-700"
            >
              关注
            </Link>
          </div>
        ))}
      </div>
      <Link href="/ranking" className="mt-5 flex items-center justify-center gap-1 text-sm font-semibold text-leaf-700 hover:text-leaf-800">
        更多
        <Icon name="arrow-right" size={14} />
      </Link>
    </section>
  );
}

function FeatureGrid({ stats }: { stats: HomeStats }) {
  const items = [
    {
      title: 'AI 植物医生',
      desc: '拍照诊断，识别病害',
      href: '/ai-care',
      action: '立即诊断',
      tone: 'from-leaf-50 to-white',
      icon: 'star' as IconName,
    },
    {
      title: '植物图鉴',
      desc: `收录 ${formatNumber(stats.speciesCount)}+ 品种`,
      href: '/plants',
      action: '探索图鉴',
      tone: 'from-[#eff8ed] to-white',
      icon: 'plants' as IconName,
    },
    {
      title: '成长时间轴',
      desc: `${formatNumber(stats.journalCount)} 份成长记录`,
      href: '/editor?type=journal',
      action: '记录成长',
      tone: 'from-[#f6f8ef] to-white',
      icon: 'event' as IconName,
    },
    {
      title: '交易市场',
      desc: `多肉交易 · ${formatNumber(stats.marketCount)} 个在售`,
      href: '/market',
      action: '进入市场',
      tone: 'from-[#fff6f0] to-white',
      icon: 'shop' as IconName,
    },
  ];

  return (
    <section className="mb-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.title}
          href={item.href}
          className={cn(
            'group min-h-[128px] overflow-hidden rounded-xl border border-leaf-100 bg-gradient-to-br p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
            item.tone
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-base font-bold text-ink-900">{item.title}</span>
              <span className="mt-2 block text-sm text-ink-600">{item.desc}</span>
            </span>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/78 text-leaf-700 shadow-sm">
              <Icon name={item.icon} size={22} />
            </span>
          </div>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-leaf-700">
            {item.action}
            <Icon name="arrow-right" size={14} />
          </span>
        </Link>
      ))}
    </section>
  );
}

function EventsStrip({ events }: { events: EventItem[] }) {
  const items = events.slice(0, 3);
  if (items.length === 0) return null;

  const labels = ['进行中', '报名中', '即将开始'];

  return (
    <section>
      <SectionHead title="热门活动" href="/contests" />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((event, index) => (
          <Link
            key={event.id}
            href={`/contests/${event.id}`}
            className="group relative min-h-[136px] overflow-hidden rounded-xl border border-leaf-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {event.cover && (
              <Image src={event.cover} alt="" fill unoptimized className="object-cover transition duration-500 group-hover:scale-105" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/64 to-white/12" />
            <div className="relative z-10">
              <span className={cn('rounded-md px-2 py-1 text-xs font-semibold text-white', index === 2 ? 'bg-orange-500' : 'bg-leaf-600')}>
                {labels[index] ?? event.status}
              </span>
              <h3 className="mt-4 line-clamp-1 text-base font-bold text-ink-900">{event.title}</h3>
              <p className="mt-2 text-xs text-ink-600">{formatNumber(event.participantCount)} 人参与</p>
              <p className="mt-3 text-xs text-ink-500">{formatDateShort(event.startAt)} - {formatDateShort(event.endAt)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HotTopics({ topics }: { topics: TopicItem[] }) {
  if (topics.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-ink-950">热门话题</h2>
      <div className="grid gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {topics.slice(0, 6).map((topic) => (
          <Link
            key={topic.tag}
            href={`/topic/${encodeURIComponent(topic.tag)}`}
            className="relative min-h-[104px] overflow-hidden rounded-xl border border-leaf-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative z-10">
              <div className="text-sm font-bold text-ink-900"># {topic.tag}</div>
              <div className="mt-2 text-xs text-ink-500">{formatNumber(topic.postCount)} 帖子</div>
            </div>
            {topic.cover && (
              <Image
                src={topic.cover}
                alt=""
                width={76}
                height={76}
                unoptimized
                className="absolute -bottom-4 -right-4 h-20 w-20 rounded-xl object-cover opacity-85"
              />
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-ink-950">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-leaf-700">
        查看更多
        <Icon name="arrow-right" size={13} />
      </Link>
    </div>
  );
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}.${day}`;
}

function getPostCover(post: Post) {
  return post.cover ?? post.images?.[0] ?? post.species?.cover ?? null;
}

function useTodaySignedCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ count: number }>('/api/stats/signed-today')
      .then((result) => {
        if (!cancelled) setCount(result.count);
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  return [count, setCount] as const;
}

interface SignInCell {
  day: number;
  signed: boolean;
  today: boolean;
  future: boolean;
}

function buildSignInCells(streak: number, todayDone: boolean): (SignInCell | null)[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();
  const first = new Date(year, month, 1);
  const firstWeekIndex = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const signedDays = new Set<number>();
  let cursor = todayDone ? todayDate : todayDate - 1;

  for (let i = 0; i < streak && cursor >= 1; i++) {
    signedDays.add(cursor);
    cursor -= 1;
  }

  const cells: (SignInCell | null)[] = [];
  for (let i = 0; i < firstWeekIndex; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      signed: signedDays.has(day),
      today: day === todayDate,
      future: day > todayDate,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function rankTone(index: number) {
  if (index === 0) return 'bg-rose-500';
  if (index === 1) return 'bg-orange-400';
  if (index === 2) return 'bg-amber-400';
  return 'bg-ink-100 text-ink-700';
}

function getActiveUsers(posts: Post[]): ActiveUser[] {
  const users = new Map<string, ActiveUser>();

  posts.forEach((post) => {
    const current = users.get(post.author.id) ?? {
      id: post.author.id,
      name: post.author.name,
      avatar: post.author.avatar,
      posts: 0,
      score: 0,
    };
    current.posts += 1;
    current.score += post.likes * 3 + post.comments * 4 + post.views + 20;
    users.set(post.author.id, current);
  });

  return [...users.values()].sort((a, b) => b.score - a.score || b.posts - a.posts);
}
