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
import { UserIdentity } from '@/components/ui/UserIdentity';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api } from "@/lib/client-api";
import type { BannerItem, Post } from '@/lib/types';
import { cn, formatDateTime, formatFollowers, formatNumber } from '@/lib/utils';
import styles from './HomeDashboard.module.scss';
import { cx } from '@/lib/style-utils';



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
  stats








}: {posts: Post[];banners: BannerItem[];topics: TopicItem[];events: EventItem[];reminders: ReminderItem[];stats: HomeStats;selections: SelectionItem[];}) {
  return (
    <AppShell>
      <div>
        <HomeHero banners={banners} />
        <FeatureGrid stats={stats} />
        <Recommended posts={posts} />
        <EventsStrip events={events} />
        <HotTopics topics={topics} />
      </div>
    </AppShell>);

}

function HomeHero({ banners }: {banners: BannerItem[];}) {
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = banners.length ?
  banners :
  [
  {
    id: 'fallback',
    title: '探索多肉的美好世界',
    image: "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1600",
    link: '/board',
    tint: ''
  }];

  const canLoop = slides.length > 1;

  return (
    <section className={cx(styles.r_d89972fe, styles.r_0e12dc7d, styles.r_710be1ec, styles.r_6da6a3c3, styles.r_da310242, styles.r_2cd02d11, styles.r_c10ff8c0, styles.r_5e10cdb8, styles.r_438b2237)}>
      <Swiper
        modules={[Autoplay, Navigation, A11y]}
        slidesPerView={1}
        loop={canLoop}
        speed={650}
        navigation={canLoop}
        autoplay={canLoop ? { delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
        a11y={{ enabled: true, prevSlideMessage: '上一张 Banner', nextSlideMessage: '下一张 Banner' }}
        className={cx("home-hero-swiper", styles.r_29acde56, styles.r_83b44422)}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onRealIndexChange={(swiper) => setActiveIndex(swiper.realIndex)}>

        {slides.map((banner, index) =>
        <SwiperSlide
          key={banner.id}
          data-swiper-autoplay={banner.durationMs && banner.durationMs > 0 ? banner.durationMs : undefined}>

            <Link href={banner.link || '/board'} className={cx(styles.r_60fbb771, styles.r_668b21aa, styles.r_8dddea07)} aria-label={banner.title}>
              <span className={cx(styles.r_d89972fe, styles.r_0214b4b3, styles.r_149b4462, styles.r_2cd02d11, styles.r_f2b23104, styles.r_4dd22916)}>
                <Image
                src={banner.image}
                alt={banner.title || '多肉植物'}
                fill
                priority={index === 0}
                unoptimized
                className={styles.r_7d85d0c2} />

              </span>
              <span className={cx(styles.r_7906320e, styles.r_60fbb771, styles.r_ef15d3cc, styles.r_3960ffc2, styles.r_48fd24ce, styles.r_5e10cdb8, styles.r_61203b55, styles.r_e0578dd7)}>
                <span className={cx(styles.r_054cb4e3, styles.r_e5660dac, styles.r_ca5169a2, styles.r_69450ef1, styles.r_e9fadafb, styles.r_d2a412c3)}>
                  {banner.title || '探索多肉的美好世界'}
                </span>
              </span>
            </Link>
          </SwiperSlide>
        )}
      </Swiper>
      {canLoop &&
      <div className={"home-hero-pagination"} aria-label="轮播图分页">
          {slides.map((banner, index) =>
        <button
          key={banner.id}
          type="button"
          className={cn("home-hero-pagination-bullet", index === activeIndex && "is-active")}
          aria-label={`切换到第 ${index + 1} 张轮播图`}
          aria-current={index === activeIndex ? 'true' : undefined}
          onClick={() => swiperRef.current?.slideToLoop(index)} />

        )}
        </div>
      }
    </section>);

}

function Recommended({ posts }: {posts: Post[];}) {
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
    post.id === postId && post.vote ?
    { ...post, vote: { ...post.vote, options, total, voted, votedOptionIds } } :
    post
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
  return (
    <section className={styles.r_348b2c1e}>
      <div className={cx(styles.r_f3c543ad, styles.r_b39e60c3, styles.r_9a638cfe)}>
        {featuredPosts.map((post) =>
        <RecommendedCard key={post.id} post={post} />
        )}
      </div>

      {feedPosts.length > 0 &&
      <div className={cx(styles.r_65cf08ba, styles.r_f3c543ad, styles.r_0d304f90, styles.r_c0e5f9b0)}>
          <div className={cx(styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
            {feedPosts.map((post, index) =>
          <PostListItem
            key={post.id}
            post={post}
            showDivider={index < feedPosts.length - 1 || loadingMore || Boolean(cursor)}
            onVoteUpdate={onVoteUpdate} />

          )}
            {loadingMore && <RecommendedFeedLoading />}
            {error && <RecommendedFeedError message={error} onRetry={() => void loadMore()} />}
            {!cursor && !loadingMore && !error && <RecommendedFeedEnd />}
            {cursor && <div ref={sentinelRef} className={cx(styles.r_3a1268a4, styles.r_6da6a3c3)} aria-hidden />}
          </div>

          <aside className={cx(styles.r_b43b4c08, styles.r_88bc1fd8, styles.r_7df46613, styles.r_8b877f1c)}>
            <CheckInCard />
          </aside>
        </div>
      }
    </section>);

}

function RecommendedFeedSkeleton() {
  return (
    <section className={cx(styles.r_348b2c1e, styles.r_d59b9794)}>
      <div className={cx(styles.r_f3c543ad, styles.r_b39e60c3, styles.r_9a638cfe)}>
        {Array.from({ length: 3 }).map((_, index) =>
        <div key={index} className={cx(styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
            <div className={cx(styles.r_c248b33a, styles.r_b4a3573a)} />
            <div className={cx(styles.r_14dd497e, styles.r_8e63407b)}>
              <div className={cx(styles.r_cd0d9c51, styles.r_b9c9ec11, styles.r_07389a77, styles.r_f2b23104)} />
              <div className={cx(styles.r_cd0d9c51, styles.r_f09b0bba, styles.r_07389a77, styles.r_b4a3573a)} />
              <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_6874bf95)}>
                <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                  <div className={cx(styles.r_f6fe9024, styles.r_7ec10f86, styles.r_ac204c10, styles.r_f2b23104)} />
                  <div className={cx(styles.r_6a60c09e, styles.r_ed831a4d, styles.r_07389a77, styles.r_f2b23104)} />
                </div>
                <div className={cx(styles.r_6a60c09e, styles.r_69da7e4f, styles.r_07389a77, styles.r_f2b23104)} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={cx(styles.r_65cf08ba, styles.r_f3c543ad, styles.r_0d304f90, styles.r_c0e5f9b0)}>
        <div className={cx(styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
          {Array.from({ length: 4 }).map((_, index) =>
          <div key={index}>
              <div className={cx(styles.r_d139dd09, styles.r_c9b99cd9, styles.r_8a383123)}>
                <div className={cx(styles.r_72418557, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                  <div className={cx(styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_ac204c10, styles.r_f2b23104)} />
                  <div className={cx(styles.r_11e59c6d, styles.r_69da7e4f, styles.r_07389a77, styles.r_f2b23104)} />
                  <div className={cx(styles.r_fb56d9cf, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_5f22e64f, styles.r_794f0116)} />
                </div>
                <div className={cx(styles.r_fbe25fd3, styles.r_cd0d9c51, styles.r_1d9f2d98, styles.r_07389a77, styles.r_f2b23104)} />
                <div className={cx(styles.r_a77ed4d9, styles.r_7fc7f732, styles.r_6da6a3c3, styles.r_07389a77, styles.r_b4a3573a)} />
                <div className={cx(styles.r_1bb88326, styles.r_7fc7f732, styles.r_f09b0bba, styles.r_07389a77, styles.r_794f0116)} />
                <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_58284b4e)}>
                  <div className={cx(styles.r_cd0d9c51, styles.r_7e74e5fe, styles.r_ac204c10, styles.r_b4a3573a)} />
                  <div className={cx(styles.r_cd0d9c51, styles.r_baceed34, styles.r_ac204c10, styles.r_b4a3573a)} />
                  <div className={cx(styles.r_cd0d9c51, styles.r_e7e37107, styles.r_ac204c10, styles.r_b4a3573a)} />
                </div>
                <div className={cx(styles.r_1bb88326, styles.r_f3c543ad, styles.r_931228bb, styles.r_58284b4e)}>
                  {Array.from({ length: 5 }).map((_, itemIndex) =>
                <div key={itemIndex} className={cx(styles.r_b59cd297, styles.r_f2b23104)} />
                )}
                </div>
                <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
                  <div className={cx(styles.r_f6fe9024, styles.r_ed831a4d, styles.r_ac204c10, styles.r_f2b23104)} />
                  <div className={cx(styles.r_60fbb771, styles.r_1004c0c3)}>
                    <div className={cx(styles.r_11e59c6d, styles.r_69da7e4f, styles.r_07389a77, styles.r_f2b23104)} />
                    <div className={cx(styles.r_11e59c6d, styles.r_d854e569, styles.r_07389a77, styles.r_f2b23104)} />
                    <div className={cx(styles.r_11e59c6d, styles.r_d854e569, styles.r_07389a77, styles.r_f2b23104)} />
                  </div>
                </div>
              </div>
              {index < 3 && <div className={cx(styles.r_abfeed1c, styles.r_b950dda2, styles.r_88b684d2, styles.r_c73e05ca)} />}
            </div>
          )}
        </div>

        <aside className={styles.r_b43b4c08}>
          <div className={cx(styles.r_c16c158f, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
            <div className={cx(styles.r_73a13409, styles.r_f2b23104)} />
            <div className={cx(styles.r_0e12dc7d, styles.r_0ab86672, styles.r_11e59c6d, styles.r_84789e8a, styles.r_07389a77, styles.r_f2b23104)} />
          </div>
          <div className={cx(styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_0478c89a, styles.r_438b2237)}>
            <div className={cx(styles.r_fb88ccaa, styles.r_f6fe9024, styles.r_516b03df, styles.r_07389a77, styles.r_f2b23104)} />
            <div className={styles.r_3e7ce58d}>
              {Array.from({ length: 5 }).map((_, index) =>
              <div key={index} className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3)}>
                  <div className={cx(styles.r_cd0d9c51, styles.r_72470489, styles.r_07389a77, styles.r_f2b23104)} />
                  <div className={cx(styles.r_e7a768f9, styles.r_ae2181c7, styles.r_ac204c10, styles.r_f2b23104)} />
                  <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_6f7e013d)}>
                    <div className={cx(styles.r_6a60c09e, styles.r_69da7e4f, styles.r_07389a77, styles.r_f2b23104)} />
                    <div className={cx(styles.r_6a60c09e, styles.r_baceed34, styles.r_07389a77, styles.r_b4a3573a)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>);

}

function RecommendedFeedLoading() {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_1004c0c3, styles.r_b950dda2, styles.r_88b684d2, styles.r_1100bef6, styles.r_fc7473ca, styles.r_2689f395, styles.r_02eb621e)}>
      <span className={cx(styles.r_cd0d9c51, styles.r_72470489, styles.r_afbdd13a, styles.r_ac204c10, styles.r_65935df5, styles.r_691861bc, styles.r_6121dab0)} />
      <span>加载中</span>
    </div>);

}

function RecommendedFeedEnd() {
  return (
    <div className={cx(styles.r_b950dda2, styles.r_88b684d2, styles.r_a1f611f0, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>
      已经到底了，没有更多内容了
    </div>);

}

function RecommendedFeedEmpty() {
  return (
    <section className={cx(styles.r_348b2c1e, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_b0b66d88, styles.r_02cafd38, styles.r_ca6bf630)}>
      <div className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_4ddaa618)}>暂无推荐内容</div>
      <div className={cx(styles.r_50d0d216, styles.r_fc7473ca, styles.r_6c4cc49e)}>稍后再来看看新的帖子</div>
    </section>);

}

function RecommendedFeedError({ message, onRetry }: {message: string;onRetry: () => void;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_1004c0c3, styles.r_b950dda2, styles.r_88b684d2, styles.r_a1f611f0, styles.r_fc7473ca, styles.r_595fceba)}>
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className={cx(styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_959f4a9f, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_e83a7042, styles.r_85cfcc24)}>

        重试
      </button>
    </div>);

}

function RecommendedCard({ post }: {post: Post;}) {
  const cover = getPostCover(post);

  return (
    <Link
      href={`/post/${post.id}`}
      className={cx(styles.r_64292b1c, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>

      <div className={cx(styles.r_d89972fe, styles.r_c248b33a, styles.r_2cd02d11, styles.r_7ebecbb6)}>
        {cover ?
        <Image
          src={cover}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, 390px"
          unoptimized
          className={styles.r_7d85d0c2} /> :


        <div className={cx(styles.r_f3c543ad, styles.r_668b21aa, styles.r_67d66567, styles.r_e55bc853)}>
            <Icon name="plants" size={44} />
          </div>
        }
      </div>
      <div className={styles.r_8e63407b}>
        <h3 className={cx(styles.r_054cb4e3, styles.r_978a8dca, styles.r_42536e69, styles.r_69450ef1, styles.r_1126dbdb, styles.r_6d623258, styles.r_d94501d2)}>
          {post.title}
        </h3>
        <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
          <UserIdentity
            user={post.author}
            size="sm"
            variant="list"
            subtitle={`${formatFollowers(post.author.followers)} 粉丝`}
          />
          <span className={cx(styles.r_012fbd12, styles.r_359090c2, styles.r_66a36c90)}>{formatDateTime(post.createdAt)}</span>
        </div>
      </div>
    </Link>);

}

function CheckInCard() {
  const { user, signedInToday, signIn, signInStreak } = useAuth();
  const [todaySignedCount, setTodaySignedCount] = useTodaySignedCount();
  const [submitting, setSubmitting] = useState(false);
  const cells = useMemo(
    () => buildSignInCells(signInStreak, signedInToday),
    [signInStreak, signedInToday]
  );
  const monthLabel = new Date().toLocaleDateString("zh-CN", {
    year: 'numeric',
    month: 'long'
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
    <section className={cx(styles.r_2cd02d11, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
      {user ?
      <button
        type="button"
        onClick={handleSignIn}
        disabled={signedInToday || submitting}
        className={cn(cx(styles.r_60fbb771, styles.r_73a13409, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_86843cf1, styles.r_77a2a20e, styles.r_6bceb016, styles.r_4ee73492, styles.r_69450ef1, styles.r_72a4c7cd, styles.r_56bf8ae8),

        signedInToday || submitting ? cx(styles.r_50ca6ba5, styles.r_4f5874c5) : styles.r_e269e58c
        )}>

          <Icon name={signedInToday ? 'check' : 'event'} size={20} />
          {signedInToday ? '今日已签到' : submitting ? '签到中' : '立即签到'}
        </button> :

      <Link
        href="/login?redirect=/"
        className={cx(styles.r_60fbb771, styles.r_73a13409, styles.r_3960ffc2, styles.r_86843cf1, styles.r_77a2a20e, styles.r_6bceb016, styles.r_4ee73492, styles.r_69450ef1, styles.r_72a4c7cd, styles.r_56bf8ae8, styles.r_e269e58c)}>

          <Icon name="event" size={20} />
          立即签到
        </Link>
      }

      <div className={cx(styles.r_60fbb771, styles.r_b7745220, styles.r_3960ffc2, styles.r_86843cf1, styles.r_65fdbade, styles.r_88b684d2, styles.r_f0faeb26, styles.r_ca6bf630, styles.r_4ee73492, styles.r_69450ef1, styles.r_4ddaa618)}>
        今天已有 {formatNumber(todaySignedCount)} 位肉友签到
      </div>

      {signedInToday &&
      <div className={styles.r_8e63407b}>
          <div className={cx(styles.r_fbe25fd3, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_d058ca6d, styles.r_69335b95)}>
            <span>连续签到 {signInStreak} 天</span>
            <span>{monthLabel}</span>
          </div>

          <div className={cx(styles.r_d7c1392c, styles.r_f3c543ad, styles.r_67d5ae42, styles.r_44ee8ba0, styles.r_ca6bf630, styles.r_1dc571a3, styles.r_6c4cc49e)}>
            {['一', '二', '三', '四', '五', '六', '日'].map((day) =>
          <div key={day}>{day}</div>
          )}
          </div>

          <div className={cx(styles.r_f3c543ad, styles.r_67d5ae42, styles.r_44ee8ba0)}>
            {cells.map((cell, index) =>
          cell == null ?
          <div key={index} /> :

          <div
            key={index}
            className={cn(cx(styles.r_f3c543ad, styles.r_d0a52b31, styles.r_67d66567, styles.r_421ac2be, styles.r_1dc571a3, styles.r_3032cae0, styles.r_ceb69a6b),

            cell.signed ? cx(styles.r_6bceb016, styles.r_72a4c7cd, styles.r_438b2237) :

            cell.today ? cx(styles.r_65935df5, styles.r_a29b7a64, styles.r_3883b0f9, styles.r_e83a7042, styles.r_b17d6a13) :

            cell.future ? styles.r_e55bc853 : cx(styles.r_52f53b18, styles.r_69335b95)


            )}
            title={
            cell.signed ?
            `${cell.day} 日 已签到` :
            cell.today ?
            `今天 ${cell.day} 日` :
            cell.future ?
            `${cell.day} 日 还未到` :
            `${cell.day} 日`
            }>

                  {cell.day}
                </div>

          )}
          </div>
        </div>
      }
    </section>);

}

function FeatureGrid({ stats }: {stats: HomeStats;}) {
  const items = [
  {
    title: 'AI 植物医生',
    desc: '拍照诊断，识别病害',
    href: "/ai-care",
    action: '立即诊断',
    tone: cx(styles.r_49a47a82, styles.r_0d13093a),
    icon: 'star' as IconName
  },
  {
    title: '植物图鉴',
    desc: `收录 ${formatNumber(stats.speciesCount)}+ 品种`,
    href: '/plants',
    action: '探索图鉴',
    tone: cx(styles.r_b03b2a33, styles.r_0d13093a),
    icon: 'plants' as IconName
  },
  {
    title: '成长时间轴',
    desc: `${formatNumber(stats.journalCount)} 份成长记录`,
    href: '/editor?type=journal',
    action: '记录成长',
    tone: cx(styles.r_da7b02bf, styles.r_0d13093a),
    icon: 'event' as IconName
  },
  {
    title: '交易市场',
    desc: `多肉交易 · ${formatNumber(stats.marketCount)} 个在售`,
    href: '/market',
    action: '进入市场',
    tone: cx(styles.r_6abc982d, styles.r_0d13093a),
    icon: 'shop' as IconName
  }];


  return (
    <section className={cx(styles.r_2cad2f15, styles.r_f3c543ad, styles.r_0c3bc985, styles.r_e4d6f343, styles.r_a1de1eab)}>
      {items.map((item) =>
      <Link
        key={item.title}
        href={item.href}
        className={cn(cx(styles.r_64292b1c, styles.r_37d71821, styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_39b2e003, styles.r_c07e54fd, styles.r_438b2237, styles.r_56bf8ae8, styles.r_0ca49668, styles.r_9e85ac05),

        item.tone
        )}>

          <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_8ef2268e, styles.r_1004c0c3)}>
            <span>
              <span className={cx(styles.r_0214b4b3, styles.r_4ee73492, styles.r_69450ef1, styles.r_4ddaa618)}>{item.title}</span>
              <span className={cx(styles.r_50d0d216, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_02eb621e)}>{item.desc}</span>
            </span>
            <span className={cx(styles.r_f3c543ad, styles.r_508ebf85, styles.r_e7e37107, styles.r_012fbd12, styles.r_67d66567, styles.r_a217b4ea, styles.r_073d1ac4, styles.r_5f6a59f1, styles.r_438b2237)}>
              <Icon name={item.icon} size={22} />
            </span>
          </div>
          <span className={cx(styles.r_fb77735e, styles.r_52083e7d, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_fc7473ca, styles.r_e83a7042, styles.r_5f6a59f1)}>
            {item.action}
            <Icon name="arrow-right" size={14} />
          </span>
        </Link>
      )}
    </section>);

}

function EventsStrip({ events }: {events: EventItem[];}) {
  const items = events.slice(0, 3);
  if (items.length === 0) return null;

  const labels = ['进行中', '报名中', '即将开始'];

  return (
    <section>
      <SectionHead title="热门活动" href="/contests" />
      <div className={cx(styles.r_f3c543ad, styles.r_0c3bc985, styles.r_9a638cfe)}>
        {items.map((event, index) =>
        <Link
          key={event.id}
          href={`/contests/${event.id}`}
          className={cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_8e83bd34, styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_438b2237, styles.r_56bf8ae8, styles.r_0ca49668, styles.r_9e85ac05)}>

            {event.cover &&
          <Image src={event.cover} alt="" fill unoptimized className={cx(styles.r_7d85d0c2, styles.r_56bf8ae8, styles.r_84432211, styles.r_1a9195e1)} />
          }
            <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_6ae7db2c, styles.r_0604a602, styles.r_35fedd90, styles.r_672d0427)} />
            <div className={cx(styles.r_d89972fe, styles.r_236812d6)}>
              <span className={cn(cx(styles.r_421ac2be, styles.r_d5eab218, styles.r_660d2eff, styles.r_359090c2, styles.r_e83a7042, styles.r_72a4c7cd), index === 2 ? styles.r_d0adf729 : styles.r_6bceb016)}>
                {labels[index] ?? event.status}
              </span>
              <h3 className={cx(styles.r_0ab86672, styles.r_f50e2015, styles.r_4ee73492, styles.r_69450ef1, styles.r_4ddaa618)}>{event.title}</h3>
              <p className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_02eb621e)}>{formatNumber(event.participantCount)} 人参与</p>
              <p className={cx(styles.r_eccd13ef, styles.r_359090c2, styles.r_7b89cd85)}>{formatDateShort(event.startAt)} - {formatDateShort(event.endAt)}</p>
            </div>
          </Link>
        )}
      </div>
    </section>);

}

function HotTopics({ topics }: {topics: TopicItem[];}) {
  if (topics.length === 0) return null;

  return (
    <section>
      <h2 className={cx(styles.r_da019856, styles.r_d5c9b000, styles.r_69450ef1, styles.r_6d623258)}>热门话题</h2>
      <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_9a638cfe, styles.r_5ac2a7ed)}>
        {topics.slice(0, 6).map((topic) =>
        <Link
          key={topic.tag}
          href={`/topic/${encodeURIComponent(topic.tag)}`}
          className={cx(styles.r_d89972fe, styles.r_c02a2ceb, styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_438b2237, styles.r_56bf8ae8, styles.r_0ca49668, styles.r_9e85ac05)}>

            <div className={cx(styles.r_d89972fe, styles.r_236812d6)}>
              <div className={cx(styles.r_fc7473ca, styles.r_69450ef1, styles.r_4ddaa618)}># {topic.tag}</div>
              <div className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_7b89cd85)}>{formatNumber(topic.postCount)} 帖子</div>
            </div>
            {topic.cover &&
          <Image
            src={topic.cover}
            alt=""
            width={76}
            height={76}
            unoptimized
            className={cx(styles.r_da4dbfbc, styles.r_80d728e6, styles.r_d83cb3d9, styles.r_0a769880, styles.r_ed831a4d, styles.r_a217b4ea, styles.r_7d85d0c2, styles.r_0f5f35d8)} />

          }
          </Link>
        )}
      </div>
    </section>);

}

function SectionHead({ title, href }: {title: string;href: string;}) {
  return (
    <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
      <h2 className={cx(styles.r_d5c9b000, styles.r_69450ef1, styles.r_6d623258)}>{title}</h2>
      <Link href={href} className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_fc7473ca, styles.r_e83a7042, styles.r_7b89cd85, styles.r_9825203a)}>
        查看更多
        <Icon name="arrow-right" size={13} />
      </Link>
    </div>);

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
    api.
    get<{count: number;}>("/api/stats/signed-today").
    then((result) => {
      if (!cancelled) setCount(result.count);
    }).
    catch(() => null);

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
      future: day > todayDate
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}
