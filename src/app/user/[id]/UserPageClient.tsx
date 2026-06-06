'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { PostListItem } from '@/components/post/PostListItem';
import { Avatar } from '@/components/ui/Avatar';
import { UserName } from '@/components/ui/UserName';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { VipBadge } from '@/components/ui/VipBadge';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { cn, formatDate, formatNumber, boardUrl, formatPrice } from '@/lib/utils';
import { api, ApiError } from '@/lib/client-api';
import { LEVELS } from '@/lib/levels';
import { useI18n } from '@/i18n/I18nContext';
import type { Badge, Board, Post, User } from '@/lib/types';

type TabKey =
  | 'posts'
  | 'comments'
  | 'products'
  | 'likes'
  | 'collects'
  | 'following'
  | 'followers'
  | 'followed-boards'
  | 'badges'
  | 'about';

type UserMarketProduct = {
  id: string;
  listingId: string;
  title: string;
  description: string;
  cover: string;
  images: string[];
  price: number;
  stock: number;
  status: 'on_sale' | 'sold_out' | 'off_shelf';
  listingStatus: 'on_sale' | 'sold_out' | 'off_shelf' | 'pending_review';
  createdAt: string;
  url: string;
  shipFrom: string;
  views: number;
  comments: number;
  taxons: {
    categorySlug: string;
    genusSlug: string | null;
    speciesSlug: string | null;
    label: string;
  }[];
};

type UserCommentItem = {
  id: string;
  content: string;
  contentText: string | null;
  likes: number;
  createdAt: string;
  post: {
    id: string;
    title: string;
    contentText: string | null;
  };
};

type ProductFilter = 'all' | 'on_sale' | 'sold';

const tabs: { key: TabKey; labelKey?: string; label?: string }[] = [
  { key: 'posts', labelKey: 'user.tabs.posts' },
  { key: 'comments', label: '评论' },
  { key: 'products', label: '商品' },
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
  comments,
  likedPosts,
  collectedPosts,
  products,
  exp = 0,
  vip,
  daysLeft,
}: {
  user: User;
  isMe: boolean;
  initialFollowed: boolean;
  posts: Post[];
  comments: UserCommentItem[];
  likedPosts: Post[];
  collectedPosts: Post[];
  products: UserMarketProduct[];
  exp?: number;
  vip?: { isVip: boolean; lifetime: boolean; expireAt: string | null };
  daysLeft?: number | null;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === 'undefined') return 'posts';
    const p = new URLSearchParams(window.location.search).get('tab');
    const allowed: TabKey[] = [
      'posts', 'comments', 'products', 'likes', 'collects', 'following', 'followers',
      'followed-boards', 'badges', 'about',
    ];
    // 支持旧 tab 名 following-boards
    const normalized = p === 'following-boards' ? 'followed-boards' : p;
    return allowed.includes(normalized as TabKey) ? (normalized as TabKey) : 'posts';
  });
  const [followed, setFollowed] = useState(initialFollowed);
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [profilePrivacy, setProfilePrivacy] = useState<PrivacyState>(
    user.privacy ?? { showFollowing: true, showFollowers: true },
  );
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const syncFromUrl = () => {
      const p = new URLSearchParams(window.location.search).get('tab');
      const allowed = tabs.map((item) => item.key);
      const normalized = p === 'following-boards' ? 'followed-boards' : p;
      if (allowed.includes(normalized as TabKey)) {
        setTab(normalized as TabKey);
      }
    };
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const selectTab = (next: TabKey) => {
    setTab(next);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

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
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-leaf-100 bg-ink-900">
        <div className="absolute inset-0 bg-gradient-to-br from-leaf-300 via-leaf-400 to-leaf-600">
          <Image
            src="https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1600"
            alt=""
            fill
            className="object-cover opacity-80"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/35 to-ink-900/10" />
        </div>
        <div className="relative z-10 flex min-h-[300px] flex-col justify-end gap-4 p-5 md:flex-row md:items-end">
          <div className="shrink-0">
            <Avatar src={user.avatar} alt={user.name} size={100} ring />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className={cn(
                  'text-xl font-bold',
                  vip?.isVip ? 'bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent' : 'text-white'
                )}
              >
                {user.name}
              </h1>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white ring-1 ring-white/20">
                Lv.{user.level} · {currentDef ? t(`levels.name.${currentDef.level}`) : ''}
              </span>
              {vip?.isVip && <VipBadge size="sm" lifetime={vip.lifetime} />}
            </div>
            <p className="mt-1 text-sm text-white/80">{user.bio || t('user.noBio')}</p>

            {/* EXP 进度条 */}
            {nextDef && (
              <div className="mt-3 max-w-md">
                <div className="flex items-baseline justify-between text-[11px] text-white/70">
                  <span>EXP {exp} / {expCap}</span>
                  <span>{t('user.expToNext', { level: nextDef.level, need: expCap - exp })}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-leaf-200 to-leaf-400"
                    style={{ width: `${expPercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/70">
              <span>{t('user.joinedAt', { date: formatDate(user.joinedAt) })}</span>
              <span>·</span>
              <button
                type="button"
                onClick={() => selectTab('posts')}
                className="hover:text-white"
              >
                <span className="font-semibold text-white">{user.posts}</span> {t('user.stats.posts')}
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => selectTab('followers')}
                className="hover:text-white"
              >
                <span className="font-semibold text-white">{formatNumber(user.followers)}</span> {t('user.stats.followers')}
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => selectTab('following')}
                className="hover:text-white"
              >
                <span className="font-semibold text-white">{formatNumber(user.following)}</span> {t('user.stats.following')}
              </button>
              {vip?.isVip && (
                <span className="text-amber-100">
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
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  className="btn-outline !border-white/40 !bg-white/10 !text-xs !text-white hover:!bg-white/20"
                >
                  {t('user.actions.privacy')}
                </button>
                <button
                  type="button"
                  className="btn-outline !border-white/40 !bg-white/10 !text-xs !text-white hover:!bg-white/20"
                  disabled
                  title={t('user.actions.editProfileUnavailable')}
                >
                  <Icon name="edit" size={12} />
                  {t('user.actions.editProfile')}
                </button>
              </>
            ) : (
              <>
                <Link href={`/messages?to=${user.id}`} className="btn-outline !border-white/40 !bg-white/10 !text-white hover:!bg-white/20">
                  <Icon name="message" size={14} />
                  {t('user.actions.message')}
                </Link>
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={busy}
                  className={cn('btn', followed ? 'bg-white/15 text-white ring-1 ring-white/20 hover:bg-white/25' : 'btn-primary')}
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
            onClick={() => selectTab(item.key)}
            className={cn(
              'relative whitespace-nowrap px-4 py-2.5 text-sm transition-colors',
              tab === item.key ? 'text-leaf-700 font-medium' : 'text-ink-700/60 hover:text-leaf-700'
            )}
          >
            {item.label ?? t(item.labelKey!)}
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
              <UserPostList posts={posts} />
            ) : (
              <Empty icon="🌱" title={t('user.empty.posts')} />
            ))}

          {tab === 'comments' &&
            (comments.length > 0 ? (
              <UserCommentList comments={comments} />
            ) : (
              <Empty icon="💬" title="暂无评论" />
            ))}

          {tab === 'products' && (
            <UserProductsTab
              products={products}
              filter={productFilter}
              onFilterChange={setProductFilter}
            />
          )}

          {tab === 'likes' &&
            (likedPosts.length > 0 ? (
              <UserPostList posts={likedPosts} />
            ) : (
              <Empty icon="❤️" title={t('user.empty.likes')} />
            ))}

          {tab === 'collects' &&
            (collectedPosts.length > 0 ? (
              <UserPostList posts={collectedPosts} />
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
              onClick={() => selectTab('badges')}
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
      {isMe && (
        <PrivacySettingsDialog
          open={privacyOpen}
          onClose={() => setPrivacyOpen(false)}
          initialPrivacy={profilePrivacy}
          onPrivacyChange={setProfilePrivacy}
        />
      )}
    </>
  );
}

function UserPostList({ posts }: { posts: Post[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm">
      {posts.map((post, index) => (
        <PostListItem
          key={post.id}
          post={post}
          showDivider={index < posts.length - 1}
        />
      ))}
    </div>
  );
}

type PrivacyState = {
  showFollowing: boolean;
  showFollowers: boolean;
};

function PrivacySettingsDialog({
  open,
  onClose,
  initialPrivacy,
  onPrivacyChange,
}: {
  open: boolean;
  onClose: () => void;
  initialPrivacy: PrivacyState;
  onPrivacyChange: (privacy: PrivacyState) => void;
}) {
  const [privacy, setPrivacy] = useState<PrivacyState>(initialPrivacy);
  const [saving, setSaving] = useState<keyof PrivacyState | null>(null);

  useEffect(() => {
    if (!open) return;
    setPrivacy(initialPrivacy);
  }, [open, initialPrivacy]);

  const toggle = async (field: keyof PrivacyState) => {
    setSaving(field);
    try {
      const r = await api.patch<PrivacyState>('/api/users/me/privacy', {
        [field]: !privacy[field],
      });
      setPrivacy(r);
      onPrivacyChange(r);
      toast.success('已保存');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="隐私设置" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-sm leading-6 text-leaf-700/75">
          控制其他用户能否看到你的社交关系列表。你自己始终可以看到完整信息。
        </p>

        <div className="space-y-3">
          <PrivacyOptionRow
            icon="user"
            title="公开我的关注列表"
            subtitle="关闭后，其他人无法看到你关注了哪些用户。"
            checked={privacy.showFollowing}
            saving={saving === 'showFollowing'}
            onChange={() => toggle('showFollowing')}
          />
          <PrivacyOptionRow
            icon="heart"
            title="公开我的粉丝列表"
            subtitle="关闭后，其他人无法看到谁关注了你。"
            checked={privacy.showFollowers}
            saving={saving === 'showFollowers'}
            onChange={() => toggle('showFollowers')}
          />
          <div className="rounded-[6px] bg-leaf-50 px-3 py-2 text-[11px] leading-5 text-leaf-700/75">
            关注数和粉丝数仍会公开展示，只隐藏具体用户列表；“关注的板块”始终仅自己可见。
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function PrivacyOptionRow({
  icon,
  title,
  subtitle,
  checked,
  saving,
  onChange,
}: {
  icon: 'user' | 'heart';
  title: string;
  subtitle: string;
  checked: boolean;
  saving: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[6px] border border-leaf-100 bg-white p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[6px] bg-leaf-50 text-leaf-700">
          <Icon name={icon} size={16} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink-800">{title}</div>
          <div className="mt-0.5 text-xs leading-5 text-ink-500">{subtitle}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={saving}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-leaf-500' : 'bg-ink-200',
          saving && 'opacity-60',
        )}
        aria-pressed={checked}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

function UserCommentList({ comments }: { comments: UserCommentItem[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm">
      {comments.map((comment, index) => {
        const content = comment.contentText || stripRichText(comment.content) || '[图片]';
        const postTitle = comment.post.title || comment.post.contentText || '无标题帖子';
        return (
          <Link
            key={comment.id}
            href={`/post/${comment.post.id}#comments`}
            className={cn(
              'block p-4 transition-colors hover:bg-leaf-50/60',
              index < comments.length - 1 && 'border-b border-leaf-100',
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-leaf-700/65">
              <span>{formatDate(comment.createdAt)}</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="heart" size={12} />
                {formatNumber(comment.likes)}
              </span>
            </div>
            <p className="line-clamp-2 text-sm leading-6 text-ink-800">{content}</p>
            <div className="mt-2 flex min-w-0 items-center gap-2 rounded-[6px] bg-leaf-50 px-3 py-2 text-xs text-leaf-800">
              <Icon name="comment" size={13} className="shrink-0 text-leaf-600" />
              <span className="shrink-0 text-leaf-700/60">评论于</span>
              <span className="min-w-0 truncate font-medium">{postTitle}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function UserProductsTab({
  products,
  filter,
  onFilterChange,
}: {
  products: UserMarketProduct[];
  filter: ProductFilter;
  onFilterChange: (filter: ProductFilter) => void;
}) {
  const counts = useMemo(() => {
    const onSale = products.filter((item) => !isProductSold(item)).length;
    const sold = products.length - onSale;
    return { all: products.length, on_sale: onSale, sold };
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (filter === 'on_sale') return products.filter((item) => !isProductSold(item));
    if (filter === 'sold') return products.filter(isProductSold);
    return products;
  }, [filter, products]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[6px] border border-leaf-100 bg-white p-1 text-xs shadow-sm">
          {[
            { key: 'all' as const, label: '全部', count: counts.all },
            { key: 'on_sale' as const, label: '在售', count: counts.on_sale },
            { key: 'sold' as const, label: '已售', count: counts.sold },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onFilterChange(item.key)}
              className={cn(
                'rounded-[6px] px-3 py-1.5 transition-colors',
                filter === item.key
                  ? 'bg-leaf-600 font-medium text-white'
                  : 'text-ink-600 hover:bg-leaf-50 hover:text-leaf-700',
              )}
            >
              {item.label} {item.count}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-leaf-700/60">{filteredProducts.length} 个商品</span>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <UserProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <Empty icon="商品" title="暂无商品" />
      )}
    </div>
  );
}

function UserProductCard({ product }: { product: UserMarketProduct }) {
  const images = product.images?.length ? product.images : [product.cover];
  const sold = isProductSold(product);
  const taxonLabels = product.taxons.map((taxon) => taxon.label).filter(Boolean);

  return (
    <article className="flex h-[312px] min-w-0 flex-col overflow-hidden rounded-[6px] border border-leaf-100 bg-white transition-colors hover:border-leaf-300 hover:shadow-sm">
      <Link href={product.url} className="block">
        <div className="relative h-[160px] bg-leaf-50">
          <Image
            src={product.cover}
            alt={product.title}
            fill
            sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
            className="rounded-t-[6px] object-cover"
            unoptimized
          />
          {images.length > 1 && (
            <div className="absolute bottom-2 right-2 rounded-full bg-ink-900/70 px-2 py-0.5 text-[11px] font-medium text-white">
              +{images.length - 1}
            </div>
          )}
          {sold && (
            <span className="absolute left-2 top-2 rounded-[6px] bg-ink-900/75 px-2 py-0.5 text-[11px] font-medium text-white">
              已售
            </span>
          )}
        </div>
      </Link>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3">
        <Link
          href={product.url}
          className="line-clamp-2 min-h-[38px] text-[14px] font-semibold leading-[19px] text-ink-900 transition-colors hover:text-leaf-700"
        >
          {product.title}
        </Link>
        {product.description && (
          <p className="line-clamp-1 text-xs leading-5 text-ink-500">
            {stripRichText(product.description)}
          </p>
        )}
        <div className="flex items-end justify-between gap-2">
          <div className="text-[17px] font-bold leading-6 text-rose-600">{formatPrice(product.price)}</div>
          <span className="shrink-0 text-[11px] text-leaf-700/70">
            {sold ? '已售' : `库存 ${product.stock}`}
          </span>
        </div>
        {taxonLabels.length > 0 && (
          <div className="flex max-h-[24px] flex-wrap gap-1 overflow-hidden">
            {taxonLabels.slice(0, 2).map((label) => (
              <span key={label} className="rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] text-leaf-700">
                {label}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between border-t border-leaf-100 pt-2 text-[11px] text-ink-500">
          <span className="truncate">{product.shipFrom ? `发货地 ${product.shipFrom}` : formatDate(product.createdAt)}</span>
          <span className="inline-flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1"><Icon name="eye" size={12} />{product.views}</span>
            <span className="inline-flex items-center gap-1"><Icon name="message" size={12} />{product.comments}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

function isProductSold(product: UserMarketProduct) {
  return product.status === 'sold_out' || product.listingStatus === 'sold_out' || product.stock <= 0;
}

function stripRichText(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
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
