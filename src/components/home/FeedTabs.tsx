'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cn, formatFollowers, timeAgo, boardUrl } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { PostCard } from '@/components/post/PostCard';
import { PostAdminMenu } from '@/components/post/PostAdminMenu';
import { PostCardSkeleton } from '@/components/post/PostCardSkeleton';
import { TopicTag } from '@/components/ui/TopicTag';
import { Tooltip } from '@/components/ui/Tooltip';
import { STAGE_META } from '@/lib/journal';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from "@/lib/client-api";
import { usePullToRefresh, PullIndicator } from '@/lib/hooks/usePullToRefresh';
import { toast } from '@/components/ui/Toast';
import type { Post, PostType } from '@/lib/types';
import styles from './FeedTabs.module.scss';
import { cx } from '@/lib/style-utils';



function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const TAB_DEFS = [
{ key: 'recommend', labelKey: 'home.feedTabs.recommend' },
{ key: 'latest', labelKey: 'home.feedTabs.latest' },
{ key: 'hot', labelKey: 'home.feedTabs.hot' },
{ key: 'following', labelKey: 'home.feedTabs.following' }] as
const;

type TabKey = (typeof TAB_DEFS)[number]['key'];
type FollowingSubTab = 'posts' | 'users' | 'species';

interface FeedResponse {
  items: Post[];
  nextCursor: string | null;
}

interface FollowedUser {
  id: string;
  handle?: string;
  name: string;
  avatar: string | null;
  bio?: string;
  posts: number;
  followers: number;
  following: number;
}

interface FollowedSpecies {
  id: string;
  name: string;
  slug: string;
  cover: string | null;
  path?: {level: string;slug: string;name: string;}[];
}

/** 4 个 tab 共用一个客户端组件,各自维护 items + cursor 状态 */
export function FeedTabs({ initial }: {initial: Post[];}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('recommend');
  const [followingSubTab, setFollowingSubTab] = useState<FollowingSubTab>('posts');

  // 每 tab 的状态分开存,切回去时不丢
  const stateRef = useRef<Record<TabKey, {items: Post[];cursor: string | null;loaded: boolean;err: string | null;}>>({
    recommend: { items: initial, cursor: null, loaded: true, err: null },
    latest: { items: [], cursor: null, loaded: false, err: null },
    hot: { items: [], cursor: null, loaded: false, err: null },
    following: { items: [], cursor: null, loaded: false, err: null }
  });
  const [, force] = useState(0);
  const rerender = () => force((x) => x + 1);

  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const load = useCallback(async (t: TabKey, more: boolean) => {
    const s = stateRef.current[t];
    if (more && !s.cursor && s.loaded) return; // 没有更多
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const cursor = more ? s.cursor : null;
      const url = `/api/feed?tab=${t}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const r = await api.get<FeedResponse>(url);
      stateRef.current[t] = {
        items: more ? [...s.items, ...r.items] : r.items,
        cursor: r.nextCursor,
        loaded: true,
        err: null
      };
    } catch (e) {
      stateRef.current[t] = {
        ...s,
        err: e instanceof ApiError ? e.message : 'load failed',
        loaded: true
      };
    } finally {
      loadingRef.current = false;
      setLoading(false);
      rerender();
    }
  }, []);

  // tab 变化时如果还没拉过,自动拉
  useEffect(() => {
    if (!stateRef.current[tab].loaded) {
      void load(tab, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // 用户切换(登录/登出)时重置 following + recommend 的缓存
  useEffect(() => {
    stateRef.current.recommend.loaded = false;
    stateRef.current.following.loaded = false;
    if (tab === 'recommend' || tab === 'following') void load(tab, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const cur = stateRef.current[tab];

  // 下拉刷新当前 tab
  const { bind, status, progress } = usePullToRefresh(async () => {
    stateRef.current[tab].loaded = false;
    await load(tab, false);
  });

  // 投票更新回调
  const onVoteUpdate = useCallback((
  postId: string,
  options: {id: string;label: string;votes: number;}[],
  total: number,
  voted: boolean,
  votedOptionIds: string[]) =>
  {
    stateRef.current[tab].items = stateRef.current[tab].items.map((p) =>
    p.id === postId && p.vote ?
    { ...p, vote: { ...p.vote, options, total, voted, votedOptionIds } } :
    p
    );
    rerender();
  }, [tab]);

  const onPostChanged = useCallback((updatedPost: Post) => {
    (Object.keys(stateRef.current) as TabKey[]).forEach((key) => {
      stateRef.current[key].items = stateRef.current[key].items.map((p) =>
      p.id === updatedPost.id ? updatedPost : p
      );
    });
    rerender();
  }, []);

  const onPostDeleted = useCallback((postId: string) => {
    (Object.keys(stateRef.current) as TabKey[]).forEach((key) => {
      stateRef.current[key].items = stateRef.current[key].items.filter((p) => p.id !== postId);
    });
    rerender();
  }, []);

  // 哨兵:接近视口时自动拉下一页
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cur.cursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) void load(tab, true);
        }
      },
      { rootMargin: '0px 0px 600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.cursor, tab]);

  // m 端列数偏好:1 或 2,默认 2(localStorage 持久化)
  const [mobileCols, setMobileCols] = useState<1 | 2>(2);
  // 布局模式:grid(瀑布流) 或 list(列表),默认列表
  const [layoutMode, setLayoutMode] = useState<"grid" | 'list'>('list');
  const [initialized, setInitialized] = useState(false);
  // 回到顶部按钮
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [backToTopVisible, setBackToTopVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedM = Number(localStorage.getItem('rouyou.feed.mobileCols'));
    if (savedM === 1 || savedM === 2) setMobileCols(savedM as 1 | 2);
    const savedLayout = localStorage.getItem('rouyou.feed.layout');
    if (savedLayout === "grid" || savedLayout === 'list') setLayoutMode(savedLayout);
    setInitialized(true);
  }, []);

  // 滚动监听：超过一屏显示回到顶部
  useEffect(() => {
    const onScroll = () => {
      const shouldShow = window.scrollY > window.innerHeight;
      if (shouldShow !== showBackToTop) {
        setShowBackToTop(shouldShow);
        // 延迟一帧让 CSS transition 生效
        requestAnimationFrame(() => setBackToTopVisible(shouldShow));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showBackToTop]);

  const scrollToTop = () => {
    setBackToTopVisible(false);
    // 重力加速度：先慢后快
    const start = window.scrollY;
    const startTime = performance.now();
    const duration = Math.min(800, start / 3); // 越高越快
    const ease = (t: number) => 1 - (1 - t) * (1 - t); // easeOutQuad
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, start * (1 - ease(progress)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const updateMobileCols = (n: 1 | 2) => {
    setMobileCols(n);
    try {
      localStorage.setItem('rouyou.feed.mobileCols', String(n));
    } catch {}
  };
  const updateLayoutMode = (mode: "grid" | 'list') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('rouyou.feed.layout', mode);
    } catch {}
  };

  // m 端 column class:1 或 2;md+ 固定 3 列
  const mobileColClass = mobileCols === 1 ? styles.r_84852e3c : styles.r_f61d7b0f;
  const desktopColClass = styles.r_cee69443;

  // 还没从 localStorage 读取完，不渲染内容避免闪烁
  if (!initialized) {
    return <div className={styles.r_6ab01735} />;
  }

  return (
    <div {...bind}>
      <PullIndicator status={status} progress={progress} />
      <TabHeader
        tab={tab}
        setTab={setTab}
        mobileCols={mobileCols}
        onMobileColsChange={updateMobileCols}
        layoutMode={layoutMode}
        onLayoutModeChange={updateLayoutMode} />


      {/* 关注 tab 的子 tab */}
      {tab === 'following' && user &&
      <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_65fdbade, styles.r_38748e06)}>
          {(['posts', 'users', 'species'] as const).map((subTab) =>
        <button
          key={subTab}
          onClick={() => setFollowingSubTab(subTab)}
          className={cn(cx(styles.r_d89972fe, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_2689f395, styles.r_ceb69a6b),

          followingSubTab === subTab ? styles.r_5f6a59f1 : cx(styles.r_5fa66415, styles.r_9825203a)
          )}>

              {subTab === 'posts' ? '动态' : subTab === 'users' ? '关注的人' : '关注的品种'}
              {followingSubTab === subTab &&
          <span className={cx(styles.r_da4dbfbc, styles.r_2735aadb, styles.r_189f036c, styles.r_10db0d55, styles.r_ac204c10, styles.r_45499621)} />
          }
            </button>
        )}
        </div>
      }

      {tab === 'following' && !user ?
      <div className={cx(styles.r_31f25533, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_d2fa6cb5, styles.r_61357c0c, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_69335b95)}>
          登录后查看你关注的肉友的最新动态
        </div> :
      tab === 'following' && followingSubTab === 'users' ?
      <FollowedUsersList /> :
      tab === 'following' && followingSubTab === 'species' ?
      <FollowedSpeciesList /> :
      cur.err ?
      <div className={cx(styles.r_31f25533, styles.r_0c5e9137, styles.r_0759a0f1, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_b54428d1)}>
          {cur.err}
        </div> :
      !cur.loaded ?
      layoutMode === 'list' ?
      <ListFeedSkeleton /> :

      <FeedSkeleton mobileCols={mobileCols} /> :

      cur.items.length === 0 ?
      <div className={cx(styles.r_31f25533, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_d2fa6cb5, styles.r_61357c0c, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_69335b95)}>
          暂时没有内容
        </div> :

      <>
          {layoutMode === 'list' ? (
        /* 列表模式：所有卡片在一个大卡片中，用线隔开 */
        <div className={cx(styles.r_0ab86672, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8)}>
              {cur.items.map((p, i) =>
          <div key={p.id}>
                  <FeedListCard post={p} source={tabToSource(tab)} onVoteUpdate={onVoteUpdate} onPostChanged={onPostChanged} onPostDeleted={onPostDeleted} />
                  {i < cur.items.length - 1 &&
            <div className={cx(styles.r_3a22f30b, styles.r_b950dda2, styles.r_88b684d2)} />
            }
                </div>
          )}
              {loading &&
          cur.items.length > 0 &&
          Array.from({ length: 3 }).map((_, i) =>
          <div key={`sk-${i}`}>
                    <div className={cx(styles.r_b5f3ff77, styles.r_d59b9794, styles.r_7ebecbb6)} />
                    <div className={cx(styles.r_3a22f30b, styles.r_b950dda2, styles.r_88b684d2)} />
                  </div>
          )}
            </div>) : (

        /* 瀑布流模式 */
        <>
              {/* CSS columns 瀑布流:m 端按用户偏好 1/2,sm=2,md+ 固定 3 列 */}
              <div className={cx(styles.r_5bb9e9f0, `${mobileColClass}${desktopColClass}`)}>
                {cur.items.map((p) =>
            <div key={p.id} className={cx(styles.r_1bb88326, styles.r_26ee10b3)}>
                    <FeedCard post={p} source={tabToSource(tab)} onVoteUpdate={onVoteUpdate} onPostChanged={onPostChanged} onPostDeleted={onPostDeleted} />
                  </div>
            )}
                {/* 加载下一页时插入骨架屏占位 */}
                {loading &&
            cur.items.length > 0 &&
            Array.from({ length: 6 }).map((_, i) =>
            <div key={`sk-${i}`} className={cx(styles.r_1bb88326, styles.r_26ee10b3)}>
                      <PostCardSkeleton variant={i} />
                    </div>
            )}
              </div>
            </>)
        }
          {/* 哨兵 */}
          {cur.cursor &&
        <div ref={sentinelRef} className={cx(styles.r_3a1268a4, styles.r_6da6a3c3)} aria-hidden />
        }
          {!cur.cursor && cur.items.length > 0 &&
        <div className={cx(styles.r_940911bf, styles.r_ca6bf630, styles.r_359090c2, styles.r_6c4cc49e)}>
              — 没有更多了 —
            </div>
        }
        </>
      }
      {showBackToTop &&
      <div
        className={cx(styles.r_7bc55599, styles.r_82d7e544, styles.r_4802bd5b, styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2)}
        style={{ bottom: backToTopVisible ? '24px' : "-80px", transition: `bottom ${backToTopVisible ? "0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" : "0.3s ease-in"}` }}>

          {/* 连接线 */}
          <div
          className={cx(styles.r_31d2902b, styles.r_24a9e3ad, styles.r_f53e30fc, styles.r_6011a25c, styles.r_ac204c10)}
          style={{
            height: backToTopVisible ? '40px' : '0px',
            transition: `height ${backToTopVisible ? "0.3s ease-out 0.2s" : "0.15s ease-in"}`
          }} />

          {/* 多肉按钮 */}
          <button
          type="button"
          onClick={scrollToTop}
          title="回到顶部"
          className={cx(styles.r_f3c543ad, styles.r_508ebf85, styles.r_e7e37107, styles.r_67d66567, styles.r_ac204c10, styles.r_39b2e003, styles.r_78ce000e, styles.r_0a6f1c29, styles.r_72a4c7cd, styles.r_06bbb431, styles.r_a84b3b45, styles.r_9a8eaab6, styles.r_1dfc245d, styles.r_7abf679f, styles.r_fd156e61, styles.r_0fe7d7d8)}>

            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
              <path d="M8 8c-1-1-2.5-0.5-3 0.5" opacity="0.5" />
              <path d="M16 8c1-1 2.5-0.5 3 0.5" opacity="0.5" />
            </svg>
          </button>
        </div>
      }
    </div>);

}

/** 包一层 PostCard,进入视口时上报 PV */
function FeedCard({
  post,
  source,
  onVoteUpdate,
  onPostChanged,
  onPostDeleted






}: {post: Post;source: string;onVoteUpdate?: (postId: string, options: {id: string;label: string;votes: number;}[], total: number, voted: boolean, votedOptionIds: string[]) => void;onPostChanged?: (post: Post) => void;onPostDeleted?: (postId: string) => void;}) {
  const ref = useRef<HTMLDivElement>(null);
  const sentRef = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || sentRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (sentRef.current) return;
        for (const e of entries) {
          if (e.isIntersecting) {
            sentRef.current = true;
            // fire-and-forget
            void api.post(`/api/posts/${post.id}/view`, { source }).catch(() => null);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [post.id, source]);
  return (
    <div ref={ref}>
      <PostCard post={post} onVoteUpdate={onVoteUpdate} onPostChanged={onPostChanged} onPostDeleted={onPostDeleted} />
    </div>);

}

/** 嵌套 Link — stopPropagation 让点击不触发父级卡片跳转 */
function NestedLink({
  href,
  className,
  children




}: {href: string;className?: string;children: React.ReactNode;}) {
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className={className}>

      {children}
    </Link>);

}

/** 投票预览(只读):展示问题 + 所有选项进度条 + 精确百分比 */
function VotePreview({ post, onVoteUpdate }: {post: Post;onVoteUpdate?: (postId: string, options: {id: string;label: string;votes: number;}[], total: number, voted: boolean, votedOptionIds: string[]) => void;}) {
  if (!post.vote) return null;
  const total = post.vote.options.reduce((s, o) => s + o.votes, 0);
  const deadlinePassed = new Date(post.vote.deadline).getTime() < Date.now();
  const hasVoted = post.vote.voted;
  const votedOptionIds = post.vote.votedOptionIds ?? [];
  const canVote = !deadlinePassed && !hasVoted;
  const [selectedOptions, setSelectedOptions] = useState<string[]>(hasVoted ? votedOptionIds : []);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSelect = (optionId: string) => {
    if (!canVote) return;
    setSelectedOptions((prev) => {
      if (post.vote?.multi) {
        return prev.includes(optionId) ?
        prev.filter((id) => id !== optionId) :
        [...prev, optionId];
      } else {
        return prev.includes(optionId) ? [] : [optionId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    if (selectedOptions.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/vote`, {
        method: 'POST',
        headers: { "Content-Type": 'application/json' },
        body: JSON.stringify({ optionIds: selectedOptions })
      });
      const data = await res.json();
      if (!data.ok) {
        const msg = data.error?.message || data.code || '投票失败';
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      toast.success('投票成功');
      onVoteUpdate?.(post.id, data.data.options, data.data.total, true, selectedOptions);
    } catch (err) {
      console.error("投票失败:", err);
      toast.error('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cx(styles.r_6f7e013d, styles.r_0c5e9137, styles.r_a8a62ca4, styles.r_7660b450, styles.r_1bb88326)} onClick={(e) => e.stopPropagation()}>
      {/* 问题 */}
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
        <Link
          href={`/post/${post.id}`}
          onClick={(e) => e.stopPropagation()}
          className={cx(styles.r_36e579c0, styles.r_7e0b7cdf)}>

          <Tooltip content={post.vote.question} className={styles.r_ed5de0a4}>
            <div className={cx(styles.r_f50e2015, styles.r_a14daebf, styles.r_2689f395, styles.r_e7eab4cb, styles.r_c67dcce9, styles.r_ceb69a6b)}>
              🗳️ {post.vote.question}
            </div>
          </Tooltip>
        </Link>
        <span className={cx(styles.r_012fbd12, styles.r_45d82811, styles.r_465609a2, styles.r_07389a77, styles.r_d058ca6d, `${deadlinePassed ? cx(styles.r_f2b23104, styles.r_b17d6a13) : cx(styles.r_ae525718, styles.r_e7eab4cb)}`)}>
          {deadlinePassed ? '已截止' : '进行中'}
        </span>
        <span className={cx(styles.r_012fbd12, styles.r_d058ca6d, styles.r_b17d6a13)}>{post.vote.multi ? '多选' : '单选'}</span>
      </div>

      {/* 选项列表 */}
      <div className={styles.r_5a250822}>
        {post.vote.options.map((o, idx) => {
          let pct: number;
          if (total === 0) {
            pct = 0;
          } else if (idx === post.vote!.options.length - 1) {
            const sumBefore = post.vote!.options.slice(0, idx).reduce((s, opt) => s + opt.votes, 0);
            pct = Number(((total - sumBefore) / total * 100).toFixed(1));
          } else {
            pct = Number((o.votes / total * 100).toFixed(1));
          }

          const isSelectable = canVote;
          const isSelected = selectedOptions.includes(o.id);
          return (
            <div
              key={o.id}
              onClick={(e) => {
                e.stopPropagation();
                if (!isSelectable) return;
                handleSelect(o.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => {
                e.stopPropagation();
                if (!isSelectable) return;
                handleSelect(o.id);
              }}
              onTouchMove={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onPointerCancel={(e) => e.stopPropagation()}
              className={cn(cx(styles.r_d89972fe, styles.r_2cd02d11, styles.r_07389a77, styles.r_d8e0e382, styles.r_660d2eff, styles.r_0fe7d7d8),

              isSelectable && cx(styles.r_34516836, styles.r_2efc423a, styles.r_ab1dd417, styles.r_bd87640d),
              isSelected && styles.r_4d592586,
              !isSelectable && !isSelected && styles.r_b0b66d88
              )}>

              {/* 进度条 */}
              <div
                className={cx(styles.r_da4dbfbc, styles.r_5f89f14a, styles.r_c78facc7, styles.r_ae525718)}
                style={{ width: `${pct}%` }} />

              {/* 内容 */}
              <div className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_44ee8ba0, styles.r_d058ca6d)}>
                <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_7e0b7cdf, styles.r_36e579c0)}>
                  <span className={cx(styles.r_5fe765d6, styles.r_ca6bf630, styles.r_b17d6a13, styles.r_69450ef1, styles.r_012fbd12)}>
                    {isSelected ? '✓' : ''}
                  </span>
                  <span className={cx(styles.r_f283ea9b, styles.r_fa5fa43b)}>{o.label}</span>
                </div>
                <span className={cx(styles.r_012fbd12, styles.r_3032cae0, styles.r_5f6a59f1)}>
                  {pct}% <span className={styles.r_b17d6a13}>({o.votes}票)</span>
                </span>
              </div>
            </div>);

        })}
      </div>

      {/* 底部统计 */}
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <span className={cx(styles.r_d058ca6d, styles.r_21d33c50)}>{total} 票</span>
        {canVote &&
        <button
          type="button"
          className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_07389a77, styles.r_45499621, styles.r_72a4c7cd, styles.r_1dc571a3, styles.r_2689f395, styles.r_24f5f8c9, styles.r_ceb69a6b, styles.r_b29d8adb)}
          disabled={selectedOptions.length === 0 || submitting}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }}>

            {submitting ? '提交中...' : '提交投票'}
          </button>
        }
        {hasVoted &&
        <span className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_07389a77, styles.r_c5eb17bf, styles.r_5f6a59f1, styles.r_1dc571a3, styles.r_2689f395)}>
            已投票
          </span>
        }
        {!canVote && !hasVoted && deadlinePassed &&
        <span className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_07389a77, styles.r_f2b23104, styles.r_b17d6a13, styles.r_1dc571a3, styles.r_2689f395)}>
            已截止
          </span>
        }
      </div>
    </div>);

}

/** 活动预览(只读):位置 + 时间 + 已报名人数 */
function EventPreview({ post }: {post: Post;}) {
  if (!post.event) return null;
  return (
    <div className={cx(styles.r_0c5e9137, styles.r_0e7fd057, styles.r_7660b450, styles.r_d058ca6d, styles.r_d604004c, styles.r_a77ed4d9)}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
        <span>📍</span>
        <span className={styles.r_f283ea9b}>{post.event.location}</span>
      </div>
      <div className={cx(styles.r_15e1b1f4, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <span className={styles.r_bede1673}>
          🕘 {new Date(post.event.startAt).toLocaleDateString()}
        </span>
        <span className={styles.r_06fd2bc1}>{post.event.attendees} 人已报名</span>
      </div>
    </div>);

}

/**
 * 时间线预览(只读):
 *  - 记录 > 4 条：显示前 3 条 + 中间提示 + 最后 1 条
 *  - 记录 ≤ 4 条：全部显示
 */
function JournalPreview({ post }: {post: Post;}) {
  if (!post.journal) return null;
  const j = post.journal;
  const shown = j.entries ?? [];
  const totalCount = j.entriesCount ?? shown.length;

  // 超过 4 条时：前 3 条 + 中间提示 + 最后 1 条
  const showCompact = totalCount > 4;
  const first3 = shown.slice(0, 3);
  const lastEntry = shown[shown.length - 1];
  const middleCount = totalCount - 4;

  return (
    <div className={cx(styles.r_a77ed4d9, styles.r_0c5e9137, styles.r_a8a62ca4, styles.r_7660b450)}>
      <div className={cx(styles.r_65281709, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_359090c2, styles.r_21d33c50)}>
        <span className={cx(styles.r_f283ea9b, styles.r_e83a7042)}>📖 {j.subjectName}</span>
        <span className={styles.r_d058ca6d}>第 {j.daysSinceStart} 天 · 共 {j.entriesCount} 条</span>
      </div>

      <div className={styles.r_d89972fe}>
        <ol className={styles.r_5a250822}>
          {first3.map((e) => {
            const meta = STAGE_META[e.stage] || STAGE_META.other;
            return (
              <li key={e.id} className={styles.r_da7c36cd}>
                <EntryItem entry={e} meta={meta} />
              </li>);

          })}

          {/* 中间省略提示 */}
          {showCompact &&
          <li className={cx(styles.r_fdb4af3a, styles.r_1dc571a3, styles.r_6c4cc49e)}>
              + {middleCount} 条更多...
            </li>
          }

          {/* 最后 1 条 */}
          {showCompact && lastEntry &&
          <li key={lastEntry.id} className={styles.r_da7c36cd}>
              <EntryItem entry={lastEntry} meta={STAGE_META[lastEntry.stage] || STAGE_META.other} />
            </li>
          }
        </ol>
      </div>
    </div>);

}

/** 单条时间线记录项 */
function EntryItem({ entry, meta }: {entry: any;meta: any;}) {
  const d = new Date(entry.entryDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const stageText = entry.stage === 'other' && entry.stageLabel ? entry.stageLabel : meta.zh;
  return (
    <div className={styles.r_da7c36cd}>
      <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_77a2a20e)}>
        <span className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_2f2a842e, styles.r_940924b6, styles.r_012fbd12, styles.r_ac204c10, styles.r_7bdcf974)} />
        <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_d058ca6d)}>
            <span className={cx(styles.r_2689f395, styles.r_399e11a5)}>{yyyy}/{mm}/{dd}</span>
            <span className={cn(cx(styles.r_07389a77, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_ca6bcd4b), meta.color)}>
              {meta.emoji} {stageText}
            </span>
          </div>
          {entry.note &&
          <Tooltip content={entry.note}>
              <p className={cx(styles.r_15e1b1f4, styles.r_054cb4e3, styles.r_359090c2, styles.r_0ab0615a)}>{entry.note}</p>
            </Tooltip>
          }
          {entry.images && entry.images.length > 0 &&
          <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_44ee8ba0)}>
              {entry.images.slice(0, 3).map((img: string, idx: number) =>
            <div key={idx} className={cx(styles.r_d89972fe, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_2cd02d11, styles.r_07389a77, styles.r_e7c8531b)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)} />
                </div>
            )}
              {entry.images.length > 3 &&
            <div className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_3960ffc2, styles.r_86843cf1, styles.r_07389a77, styles.r_fd9dca32, styles.r_1dc571a3, styles.r_72a4c7cd)}>
                  +{entry.images.length - 3}
                </div>
            }
            </div>
          }
        </div>
      </div>
    </div>);

}

/** 列表模式卡片 — 一行一个，参考交易广场风格 */
function FeedListCard({
  post,
  source,
  onVoteUpdate,
  onPostChanged,
  onPostDeleted






}: {post: Post;source: string;onVoteUpdate?: (postId: string, options: {id: string;label: string;votes: number;}[], total: number, voted: boolean, votedOptionIds: string[]) => void;onPostChanged?: (post: Post) => void;onPostDeleted?: (postId: string) => void;}) {
  const { user } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const sentRef = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || sentRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (sentRef.current) return;
        for (const e of entries) {
          if (e.isIntersecting) {
            sentRef.current = true;
            void api.post(`/api/posts/${post.id}/view`, { source }).catch(() => null);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [post.id, source]);

  // 封面图 + 内容图片，最多显示5张
  const displayImages: string[] = [];
  if (post.cover) displayImages.push(post.cover);
  if (post.images) {
    post.images.slice(0, 5 - displayImages.length).forEach((img) => {
      if (!displayImages.includes(img)) displayImages.push(img);
    });
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/api/posts/${post.id}/like`);
    } catch {}
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/api/users/${post.author.id}/follow`);
    } catch {}
  };

  return (
    <div ref={ref} className={cx(styles.r_8e63407b, styles.r_ceb69a6b, styles.r_98dc6304)}>
      {/* 第一行：用户头像 + 昵称 + 关注按钮 + 管理员按钮 */}
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_7e9a2a25, styles.r_1bb88326)}>
        <Link
          href={`/user/${post.author.id}`}
          className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_eaeb7419, styles.r_67d6184a)}>

          <UserAvatar
            src={post.author.avatar}
            alt={post.author.name}
            size={36}
            pendant={post.author.equip?.pendant ?? null}
            ring={false}
            showFestival={false} />

          <span className={cx(styles.r_7e0b7cdf, styles.r_e9fadafb)}>
            <span className={cx(styles.r_0214b4b3, styles.r_f283ea9b, styles.r_2689f395, styles.r_a14daebf, styles.r_399e11a5)}>{post.author.name}</span>
            <span className={cx(styles.r_0214b4b3, styles.r_1dc571a3, styles.r_8ecebc9f, styles.r_6c4cc49e)}>
              {formatFollowers(post.author.followers)} 粉丝
            </span>
          </span>
          <AuthorBadgeIcons post={post} />
        </Link>
        <PostTypeBadge type={post.type} />
        {user && user.id !== post.author.id &&
        <button
          type="button"
          onClick={handleFollow}
          className={cx(styles.r_1dc571a3, styles.r_d5eab218, styles.r_465609a2, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_d3b27cd9, styles.r_b17d6a13, styles.r_3cf81117, styles.r_b5a12a16, styles.r_ceb69a6b)}>

            +关注
          </button>
        }
        <div className={styles.r_36e579c0} />
        {/* 管理按钮 - 根据权限显示 */}
        <PostAdminMenu
          post={post}
          user={user}
          align="center"
          onPostChanged={onPostChanged}
          onPostDeleted={onPostDeleted} />

      </div>

      {/* 第二行：标题 + 置顶/锁定标识 */}
      <Link href={`/post/${post.id}`}>
        <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_77a2a20e, styles.r_a77ed4d9)}>
          <h3 className={cx(styles.r_cff55289, styles.r_e83a7042, styles.r_399e11a5, styles.r_36e579c0, styles.r_9825203a, styles.r_ceb69a6b)}>
            {post.title}
          </h3>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_012fbd12)}>
            {post.pinState?.any &&
            <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_a3899220, styles.r_07389a77, styles.r_735dd972, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395, styles.r_85d79ebf)}>
                <Icon name="pin" size={10} />
                置顶
              </span>
            }
            {post.locked &&
            <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_a3899220, styles.r_07389a77, styles.r_febec8f2, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395, styles.r_02eb621e)}>
                <Icon name="lock" size={10} />
                锁定
              </span>
            }
          </div>
        </div>
      </Link>

      {/* 第三行：描述 */}
      {(post.type === 'short' || post.type === 'rich' || post.type === 'help') && (
      post.contentText || post.content) &&
      <Link href={`/post/${post.id}`}>
            <p className={cx(styles.r_4d2392e8, styles.r_02eb621e, styles.r_6b189c6e, styles.r_a77ed4d9, styles.r_054cb4e3)}>
              {post.contentText || stripHtml(post.content)}
            </p>
          </Link>
      }

      {/* 记录贴：成长线 + 封面 */}
      {post.type === 'journal' && post.journal && <JournalPreview post={post} />}

      {/* 投票预览 */}
      {post.type === 'vote' && post.vote && <VotePreview post={post} onVoteUpdate={onVoteUpdate} />}

      {/* 活动预览 */}
      {post.type === 'event' && post.event && <EventPreview post={post} />}

      {/* 第四行：话题标签 */}
      {post.tags.length > 0 &&
      <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_58284b4e, styles.r_1bb88326)}>
          {post.tags.slice(0, 5).map((tag, i) =>
        <TopicTag
          key={i}
          tag={tag}
          href={`/topic/${encodeURIComponent(tag)}`}
          size="md" />

        )}
        </div>
      }

      {/* 第五行：图片 - 最多显示5张，均分宽度 */}
      {displayImages.length > 0 &&
      <Link href={`/post/${post.id}`} className={cx(styles.r_0214b4b3, styles.r_1bb88326)}>
          <div className={cx(styles.r_f3c543ad, styles.r_931228bb, styles.r_58284b4e)}>
            {displayImages.slice(0, 5).map((img, i) =>
          <div
            key={i}
            className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_2cd02d11, styles.r_0c5e9137, styles.r_7ebecbb6)}>

                <Image src={img} alt="" fill className={styles.r_7d85d0c2} unoptimized />
                {/* 视频播放图标 - 只在第一张图上显示 */}
                {post.type === 'video' && i === 0 &&
            <div className={cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_7b7df044, styles.r_f3c543ad, styles.r_67d66567)}>
                    <div className={cx(styles.r_f3c543ad, styles.r_426b8b75, styles.r_d854e569, styles.r_67d66567, styles.r_ac204c10, styles.r_53bb3a28, styles.r_72a4c7cd)}>
                      <Icon name="video" size={20} fill="currentColor" />
                    </div>
                  </div>
            }
                {/* 第5张且有剩余 */}
                {i === 4 && (post.cover ? 1 : 0) + (post.images?.length ?? 0) > 5 &&
            <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_fd9dca32)}>
                    <span className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_72a4c7cd)}>+{(post.cover ? 1 : 0) + (post.images?.length ?? 0) - 5}</span>
                  </div>
            }
              </div>
          )}
          </div>
        </Link>
      }

      {/* 最后一行：板块 + 时间 + 统计 */}
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_d058ca6d)}>
        <NestedLink
          href={boardUrl(post.board)}
          className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_58284b4e, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_0b91436d, styles.r_660d2eff, styles.r_69cdf25a, styles.r_2689f395, styles.r_5f6a59f1, styles.r_2efc423a)}>

          {post.board.icon && (post.board.icon.startsWith('http') || post.board.icon.startsWith('/')) ?
          <img src={post.board.icon} alt="" className={cx(styles.r_cd0d9c51, styles.r_72470489, styles.r_07389a77, styles.r_7d85d0c2)} /> :

          <span className={styles.r_fc7473ca}>{post.board.icon || '🌿'}</span>
          }
          <span className={cx(styles.r_f283ea9b, styles.r_d3f6ecda)}>{post.board.name}</span>
        </NestedLink>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_a14daebf, styles.r_7b89cd85)}>
          <span className={styles.r_66a36c90}>{formatDateTime(post.createdAt)}</span>
          <Link href={`/post/${post.id}`} className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_c67dcce9, styles.r_ceb69a6b)}>
            <Icon name="eye" size={14} />
            {formatCount(post.views)}
          </Link>
          <button
            type="button"
            onClick={handleLike}
            className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_46353e18, styles.r_ceb69a6b)}>

            <Icon name="heart" size={14} />
            {formatCount(post.likes)}
          </button>
          <Link href={`/post/${post.id}`} className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_c67dcce9, styles.r_ceb69a6b)}>
            <Icon name="comment" size={14} />
            {formatCount(post.comments)}
          </Link>
        </div>
      </div>
    </div>);

}

function FeedSkeleton({
  mobileCols = 2


}: {mobileCols?: 1 | 2;}) {
  const colClass = mobileCols === 1 ? styles.r_84852e3c : styles.r_f61d7b0f;
  return (
    <div className={cx(styles.r_0ab86672, styles.r_1004c0c3, styles.r_a7409a6e, styles.r_cee69443, `${colClass}`)}>
      {Array.from({ length: 9 }).map((_, i) =>
      <div key={i} className={cx(styles.r_1bb88326, styles.r_26ee10b3)}>
          <PostCardSkeleton variant={i} />
        </div>
      )}
    </div>);

}

/** 列表模式骨架屏 */
function AuthorBadgeIcons({ post }: {post: Post;}) {
  const badges = post.author.badges.filter((badge) => badge.obtained).slice(0, 2);
  if (badges.length === 0) return null;

  return (
    <span className={cx(styles.r_52083e7d, styles.r_012fbd12, styles.r_3960ffc2, styles.r_a3899220)}>
      {badges.map((badge) =>
      <span
        key={badge.id}
        title={badge.name}
        className={cx(styles.r_c5d9aaf6, styles.r_11e59c6d, styles.r_dc7972eb, styles.r_67d66567, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_e0988086, styles.r_438b2237)}>

          {badge.icon}
        </span>
      )}
    </span>);

}

function ListFeedSkeleton() {
  return (
    <div className={cx(styles.r_0ab86672, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_2cd02d11)}>
      {Array.from({ length: 5 }).map((_, i) =>
      <div key={i}>
          <div className={cx(styles.r_8e63407b, styles.r_d59b9794)}>
            {/* 第一行：头像 + 昵称 */}
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_1bb88326)}>
              <div className={cx(styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_ac204c10, styles.r_f2b23104)} />
              <div className={cx(styles.r_11e59c6d, styles.r_ed831a4d, styles.r_07389a77, styles.r_f2b23104)} />
              <div className={cx(styles.r_fb56d9cf, styles.r_6a60c09e, styles.r_baceed34, styles.r_07389a77, styles.r_f2b23104)} />
            </div>
            {/* 标题 */}
            <div className={cx(styles.r_cd0d9c51, styles.r_1d9f2d98, styles.r_07389a77, styles.r_f2b23104, styles.r_a77ed4d9)} />
            {/* 描述 */}
            <div className={cx(styles.r_5a250822, styles.r_1bb88326)}>
              <div className={cx(styles.r_11e59c6d, styles.r_6da6a3c3, styles.r_07389a77, styles.r_f2b23104)} />
              <div className={cx(styles.r_11e59c6d, styles.r_f09b0bba, styles.r_07389a77, styles.r_f2b23104)} />
            </div>
            {/* 图片 - 5张 */}
            <div className={cx(styles.r_f3c543ad, styles.r_931228bb, styles.r_58284b4e, styles.r_1bb88326)}>
              {Array.from({ length: 5 }).map((_, j) =>
            <div key={j} className={cx(styles.r_b59cd297, styles.r_0c5e9137, styles.r_f2b23104)} />
            )}
            </div>
            {/* 底部 */}
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
              <div className={cx(styles.r_cd0d9c51, styles.r_baceed34, styles.r_ac204c10, styles.r_f2b23104)} />
              <div className={cx(styles.r_60fbb771, styles.r_1004c0c3)}>
                <div className={cx(styles.r_11e59c6d, styles.r_d854e569, styles.r_07389a77, styles.r_f2b23104)} />
                <div className={cx(styles.r_11e59c6d, styles.r_d854e569, styles.r_07389a77, styles.r_f2b23104)} />
                <div className={cx(styles.r_11e59c6d, styles.r_d854e569, styles.r_07389a77, styles.r_f2b23104)} />
              </div>
            </div>
          </div>
          {i < 4 && <div className={cx(styles.r_3a22f30b, styles.r_b950dda2, styles.r_88b684d2)} />}
        </div>
      )}
    </div>);

}

function tabToSource(t: TabKey): string {
  return {
    recommend: 'feed_recommend',
    following: 'feed_following',
    hot: 'feed_hot',
    latest: 'feed_latest'
  }[t];
}

function TabHeader({
  tab,
  setTab,
  mobileCols,
  onMobileColsChange,
  layoutMode,
  onLayoutModeChange







}: {tab: TabKey;setTab: (t: TabKey) => void;mobileCols: 1 | 2;onMobileColsChange: (n: 1 | 2) => void;layoutMode: "grid" | 'list';onLayoutModeChange: (mode: "grid" | 'list') => void;}) {
  const { t } = useI18n();
  return (
    <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_65fdbade, styles.r_88b684d2)}>
      {/* 左侧：Tab 切换 */}
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
        {TAB_DEFS.map((tabItem) =>
        <button
          key={tabItem.key}
          onClick={() => setTab(tabItem.key)}
          className={cn(cx(styles.r_d89972fe, styles.r_f0faeb26, styles.r_e7ee55ac, styles.r_fc7473ca, styles.r_2689f395, styles.r_ceb69a6b),

          tab === tabItem.key ? styles.r_5f6a59f1 : cx(styles.r_5fa66415, styles.r_9825203a)
          )}>

            {t(tabItem.labelKey)}
            {tab === tabItem.key &&
          <span className={cx(styles.r_da4dbfbc, styles.r_b6027879, styles.r_189f036c, styles.r_10db0d55, styles.r_ac204c10, styles.r_45499621)} />
          }
          </button>
        )}
      </div>

      {/* 右侧：布局模式切换 */}
      <div className={cx(styles.r_fb56d9cf, styles.r_60fbb771, styles.r_3960ffc2, styles.r_a3899220, styles.r_0c5e9137, styles.r_a8a62ca4, styles.r_de8350a3)}>
        <button
          type="button"
          onClick={() => onLayoutModeChange('list')}
          title="列表"
          className={cn(cx(styles.r_f3c543ad, styles.r_d0a52b31, styles.r_2bbcfc3b, styles.r_67d66567, styles.r_07389a77, styles.r_ceb69a6b),

          layoutMode === 'list' ? cx(styles.r_5e10cdb8, styles.r_5f6a59f1, styles.r_438b2237) : cx(styles.r_7b89cd85, styles.r_9825203a)


          )}>

          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="0" y="1" width="14" height="3" rx="1" />
            <rect x="0" y="5.5" width="14" height="3" rx="1" />
            <rect x="0" y="10" width="14" height="3" rx="1" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onLayoutModeChange("grid")}
          title="3列瀑布流"
          className={cn(cx(styles.r_f3c543ad, styles.r_d0a52b31, styles.r_2bbcfc3b, styles.r_67d66567, styles.r_07389a77, styles.r_ceb69a6b),

          layoutMode === "grid" ? cx(styles.r_5e10cdb8, styles.r_5f6a59f1, styles.r_438b2237) : cx(styles.r_7b89cd85, styles.r_9825203a)


          )}>

          <ColsIcon n={3} />
        </button>
      </div>
    </div>);

}

function ColsIcon({ n }: {n: 1 | 2 | 3 | 4;}) {
  const grid = n === 1 ? styles.r_d7c83398 : n === 2 ? styles.r_8e75e3db : n === 3 ? styles.r_be2e831b : styles.r_32aac21b;
  return (
    <span className={cx(styles.r_f3c543ad, styles.r_7fc7f732, styles.r_dc7972eb, styles.r_8de815f3, `${grid}`)}>
      {Array.from({ length: n }).map((_, i) =>
      <span key={i} className={cx(styles.r_0214b4b3, styles.r_ce154d3f, styles.r_dde870f2)} />
      )}
    </span>);

}

/** 关注的用户列表 */
function FollowedUsersList() {
  const { user } = useAuth();
  const [users, setUsers] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.
    get<{items: FollowedUser[];}>(`/api/users/${user.id}/following`).
    then((data) => setUsers(data.items || [])).
    catch(() => setUsers([])).
    finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className={cx(styles.r_31f25533, styles.r_6ed543e2)}>
        {Array.from({ length: 5 }).map((_, i) =>
        <div key={i} className={styles.r_d59b9794}>
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_8e63407b)}>
              <div className={cx(styles.r_508ebf85, styles.r_e7e37107, styles.r_ac204c10, styles.r_f2b23104)} />
              <div className={cx(styles.r_36e579c0, styles.r_6f7e013d)}>
                <div className={cx(styles.r_11e59c6d, styles.r_516b03df, styles.r_07389a77, styles.r_f2b23104)} />
                <div className={cx(styles.r_6a60c09e, styles.r_74b2435a, styles.r_07389a77, styles.r_f2b23104)} />
              </div>
            </div>
          </div>
        )}
      </div>);

  }

  if (users.length === 0) {
    return (
      <div className={cx(styles.r_31f25533, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_d2fa6cb5, styles.r_61357c0c, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_69335b95)}>
        还没有关注任何人
      </div>);

  }

  return (
    <div className={cx(styles.r_0ab86672, styles.r_f3c543ad, styles.r_1004c0c3, styles.r_e00ad816, styles.r_9a638cfe)}>
      {users.map((u) =>
      <Link
        key={u.id}
        href={`/user/${u.id}`}
        className={styles.r_64292b1c}>

          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_8e63407b)}>
            {u.avatar ?
          <img
            src={u.avatar}
            alt={u.name}
            className={cx(styles.r_508ebf85, styles.r_e7e37107, styles.r_ac204c10, styles.r_7d85d0c2, styles.r_16b1efa5, styles.r_52c47100, styles.r_70701b0b, styles.r_0fe7d7d8)} /> :


          <div className={cx(styles.r_508ebf85, styles.r_e7e37107, styles.r_ac204c10, styles.r_f2b23104, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_b17d6a13, styles.r_42536e69)}>
                {u.name[0]}
              </div>
          }
            <div className={cx(styles.r_36e579c0, styles.r_7e0b7cdf)}>
              <div className={cx(styles.r_2689f395, styles.r_399e11a5, styles.r_f283ea9b)}>{u.name}</div>
              {u.handle && <div className={cx(styles.r_359090c2, styles.r_7b89cd85, styles.r_f283ea9b)}>@{u.handle}</div>}
              <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_1dc571a3, styles.r_66a36c90)}>
                <span>{u.posts} 帖</span>
                <span>{u.followers} 粉丝</span>
              </div>
            </div>
          </div>
        </Link>
      )}
    </div>);

}

/** 关注的品种列表 */
function FollowedSpeciesList() {
  const [species, setSpecies] = useState<FollowedSpecies[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.
    get<FollowedSpecies[]>('/api/boards/followed').
    then((list) => setSpecies((list || []).filter((f) => f))).
    catch(() => setSpecies([])).
    finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={cx(styles.r_31f25533, styles.r_f3c543ad, styles.r_1004c0c3, styles.r_e00ad816, styles.r_9a638cfe, styles.r_4558bce6)}>
        {Array.from({ length: 8 }).map((_, i) =>
        <div key={i} className={styles.r_d59b9794}>
            <div className={cx(styles.r_b59cd297, styles.r_f2b23104, styles.r_1301e5c1)} />
            <div className={cx(styles.r_eb6e8b88, styles.r_6f7e013d)}>
              <div className={cx(styles.r_11e59c6d, styles.r_69da7e4f, styles.r_07389a77, styles.r_f2b23104)} />
              <div className={cx(styles.r_6a60c09e, styles.r_516b03df, styles.r_07389a77, styles.r_f2b23104)} />
            </div>
          </div>
        )}
      </div>);

  }

  if (species.length === 0) {
    return (
      <div className={cx(styles.r_31f25533, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_d2fa6cb5, styles.r_61357c0c, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_69335b95)}>
        还没有关注任何品种
      </div>);

  }

  return (
    <div className={cx(styles.r_0ab86672, styles.r_f3c543ad, styles.r_1004c0c3, styles.r_e00ad816, styles.r_9a638cfe, styles.r_4558bce6)}>
      {species.map((s) => {
        const catPath = s.path?.find((p) => p.level === 'category');
        const genusPath = s.path?.find((p) => p.level === 'genus');
        const href =
        catPath && genusPath ?
        `/board/${catPath.slug}/${genusPath.slug}/${s.slug}` :
        `/board/${s.slug}`;
        return (
          <Link
            key={s.id}
            href={href}
            className={cx(styles.r_64292b1c, styles.r_2cd02d11)}>

            <div className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_7ebecbb6)}>
              {s.cover ?
              <img
                src={s.cover}
                alt={s.name}
                className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)} /> :


              <div className={cx(styles.r_60fbb771, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_86843cf1, styles.r_a95699d9, styles.r_e55bc853)}>
                  🌱
                </div>
              }
              <div className={cx(styles.r_da4dbfbc, styles.r_3f6397bf, styles.r_189f036c, styles.r_79257b8c, styles.r_b4cc46dc, styles.r_0fe2b3da, styles.r_7660b450)}>
                <div className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_72a4c7cd, styles.r_f283ea9b)}>{s.name}</div>
              </div>
            </div>
            <div className={styles.r_eb6e8b88}>
              <div className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5, styles.r_f283ea9b)}>{s.name}</div>
              {catPath && genusPath &&
              <div className={cx(styles.r_b6b02c0e, styles.r_1dc571a3, styles.r_66a36c90, styles.r_f283ea9b)}>
                  {catPath.name} · {genusPath.name}
                </div>
              }
            </div>
          </Link>);

      })}
    </div>);

}