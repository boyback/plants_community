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
import { api, ApiError } from "@/lib/client-api";
import { LEVELS } from '@/lib/levels';
import { useI18n } from '@/i18n/I18nContext';
import type { Badge, Board, Post, User } from '@/lib/types';
import styles from './UserPageClient.module.scss';
import { cx } from '@/lib/style-utils';



type TabKey =
'posts' |
'comments' |
'products' |
'likes' |
'collects' |
'following' |
'followers' |
"followed-boards" |
'badges' |
'about';

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

const tabs: {key: TabKey;labelKey?: string;label?: string;}[] = [
{ key: 'posts', labelKey: 'user.tabs.posts' },
{ key: 'comments', label: '评论' },
{ key: 'products', label: '商品' },
{ key: 'likes', labelKey: 'user.tabs.likes' },
{ key: 'collects', labelKey: 'user.tabs.collects' },
{ key: 'following', labelKey: 'user.tabs.following' },
{ key: 'followers', labelKey: 'user.tabs.followers' },
{ key: "followed-boards", labelKey: 'user.tabs.followedBoards' },
{ key: 'badges', labelKey: 'user.tabs.badges' },
{ key: 'about', labelKey: 'user.tabs.about' }];


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
  daysLeft












}: {user: User;isMe: boolean;initialFollowed: boolean;posts: Post[];comments: UserCommentItem[];likedPosts: Post[];collectedPosts: Post[];products: UserMarketProduct[];exp?: number;vip?: {isVip: boolean;lifetime: boolean;expireAt: string | null;};daysLeft?: number | null;}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === 'undefined') return 'posts';
    const p = new URLSearchParams(window.location.search).get('tab');
    const allowed: TabKey[] = [
    'posts', 'comments', 'products', 'likes', 'collects', 'following', 'followers',
    "followed-boards", 'badges', 'about'];

    // 支持旧 tab 名 following-boards
    const normalized = p === "following-boards" ? "followed-boards" : p;
    return allowed.includes(normalized as TabKey) ? normalized as TabKey : 'posts';
  });
  const [followed, setFollowed] = useState(initialFollowed);
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [profilePrivacy, setProfilePrivacy] = useState<PrivacyState>(
    user.privacy ?? { showFollowing: true, showFollowers: true }
  );
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const syncFromUrl = () => {
      const p = new URLSearchParams(window.location.search).get('tab');
      const allowed = tabs.map((item) => item.key);
      const normalized = p === "following-boards" ? "followed-boards" : p;
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
  nextDef && expCap > expBase ?
  Math.min(100, Math.max(0, Math.round((exp - expBase) / (expCap - expBase) * 100))) :
  100;

  const toggleFollow = async () => {
    setBusy(true);
    try {
      const r = await api.post<{followed: boolean;}>(`/api/users/${user.id}/follow`);
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
      <div className={cx(styles.r_d89972fe, styles.r_b6777c6d, styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_c8d2a7ca)}>
        <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_39b2e003, styles.r_f53e30fc, styles.r_5e958be6, styles.r_0a6f1c29)}>
          <Image
            src="https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1600"
            alt=""
            fill
            className={cx(styles.r_7d85d0c2, styles.r_714816ef)}
            unoptimized />

          <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_79257b8c, styles.r_0bb032b9, styles.r_3e4c86d8, styles.r_391264db)} />
        </div>
        <div className={cx(styles.r_d89972fe, styles.r_236812d6, styles.r_60fbb771, styles.r_1ee35081, styles.r_8dddea07, styles.r_77c08e01, styles.r_0c3bc985, styles.r_c07e54fd, styles.r_4102dddf, styles.r_bf60a82f)}>
          <div className={styles.r_012fbd12}>
            <Avatar src={user.avatar} alt={user.name} size={100} ring />
          </div>
          <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
            <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
              <h1
                className={cn(cx(styles.r_d5c9b000, styles.r_69450ef1),

                vip?.isVip ? cx(styles.r_6ae7db2c, styles.r_cd3e6ea7, styles.r_0e9465c6, styles.r_db539fdb, styles.r_6c3c24f0, styles.r_f8c8e86d) : styles.r_72a4c7cd
                )}>

                {user.name}
              </h1>
              <span className={cx(styles.r_ac204c10, styles.r_990f052a, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_2689f395, styles.r_72a4c7cd, styles.r_3daca9af, styles.r_0cea1524)}>
                Lv.{user.level} · {currentDef ? t(`levels.name.${currentDef.level}`) : ''}
              </span>
              {vip?.isVip && <VipBadge size="sm" lifetime={vip.lifetime} />}
            </div>
            <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_201d4d37)}>{user.bio || t('user.noBio')}</p>

            {/* EXP 进度条 */}
            {nextDef &&
            <div className={cx(styles.r_eccd13ef, styles.r_9794ab45)}>
                <div className={cx(styles.r_60fbb771, styles.r_b7012bb2, styles.r_8ef2268e, styles.r_d058ca6d, styles.r_ed24b98e)}>
                  <span>EXP {exp} / {expCap}</span>
                  <span>{t('user.expToNext', { level: nextDef.level, need: expCap - exp })}</span>
                </div>
                <div className={cx(styles.r_b6b02c0e, styles.r_095acb27, styles.r_2cd02d11, styles.r_ac204c10, styles.r_2cf6fd42)}>
                  <div
                  className={cx(styles.r_668b21aa, styles.r_ac204c10, styles.r_6ae7db2c, styles.r_50f960a5, styles.r_529f8e24)}
                  style={{ width: `${expPercent}%` }} />

                </div>
              </div>
            }

            <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_0c3bc985, styles.r_359090c2, styles.r_ed24b98e)}>
              <span>{t('user.joinedAt', { date: formatDate(user.joinedAt) })}</span>
              <span>·</span>
              <button
                type="button"
                onClick={() => selectTab('posts')}
                className={styles.r_b5a12a16}>

                <span className={cx(styles.r_e83a7042, styles.r_72a4c7cd)}>{user.posts}</span> {t('user.stats.posts')}
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => selectTab('followers')}
                className={styles.r_b5a12a16}>

                <span className={cx(styles.r_e83a7042, styles.r_72a4c7cd)}>{formatNumber(user.followers)}</span> {t('user.stats.followers')}
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => selectTab('following')}
                className={styles.r_b5a12a16}>

                <span className={cx(styles.r_e83a7042, styles.r_72a4c7cd)}>{formatNumber(user.following)}</span> {t('user.stats.following')}
              </button>
              {vip?.isVip &&
              <span className={styles.r_ae5ebb30}>
                  · 👑{' '}
                  {vip.lifetime ?
                t('user.vip.lifetime') :
                daysLeft !== null && daysLeft !== undefined ?
                t('user.vip.remainDays', { days: daysLeft }) :
                t('user.vip.member')}
                </span>
              }
            </div>
          </div>
          <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
            {isMe ?
            <>
                <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className={cx(styles.r_2ed430b2, styles.r_86021721, styles.r_dd702538, styles.r_41a0398f, styles.r_1b08d87e)}>

                  {t('user.actions.privacy')}
                </button>
                <button
                type="button"
                className={cx(styles.r_2ed430b2, styles.r_86021721, styles.r_dd702538, styles.r_41a0398f, styles.r_1b08d87e)}
                disabled
                title={t('user.actions.editProfileUnavailable')}>

                  <Icon name="edit" size={12} />
                  {t('user.actions.editProfile')}
                </button>
              </> :

            <>
                <Link href={`/messages?to=${user.id}`} className={cx(styles.r_2ed430b2, styles.r_86021721, styles.r_41a0398f, styles.r_1b08d87e)}>
                  <Icon name="message" size={14} />
                  {t('user.actions.message')}
                </Link>
                <button
                type="button"
                onClick={toggleFollow}
                disabled={busy}
                className={cn('btn', followed ? cx(styles.r_990f052a, styles.r_72a4c7cd, styles.r_3daca9af, styles.r_0cea1524, styles.r_74ef519b) : 'btn-primary')}>

                  {followed ? t('user.actions.unfollow') : t('user.actions.follow')}
                </button>
              </>
            }
          </div>
        </div>
      </div>

      <div className={cx(styles.r_fb88ccaa, styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_1384f66f, styles.r_65fdbade, styles.r_88b684d2)}>
        {tabs.map((item) =>
        <button
          key={item.key}
          onClick={() => selectTab(item.key)}
          className={cn(cx(styles.r_d89972fe, styles.r_e82ae8be, styles.r_f0faeb26, styles.r_e7ee55ac, styles.r_fc7473ca, styles.r_ceb69a6b),

          tab === item.key ? cx(styles.r_5f6a59f1, styles.r_2689f395) : cx(styles.r_5fa66415, styles.r_9825203a)
          )}>

            {item.label ?? t(item.labelKey!)}
            {tab === item.key &&
          <span className={cx(styles.r_da4dbfbc, styles.r_b6027879, styles.r_189f036c, styles.r_10db0d55, styles.r_ac204c10, styles.r_45499621)} />
          }
          </button>
        )}
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_0d304f90, styles.r_4c57394d)}>
        <div className={styles.r_7e0b7cdf}>
          {tab === 'posts' && (
          posts.length > 0 ?
          <UserPostList posts={posts} /> :

          <Empty icon="🌱" title={t('user.empty.posts')} />)
          }

          {tab === 'comments' && (
          comments.length > 0 ?
          <UserCommentList comments={comments} /> :

          <Empty icon="💬" title="暂无评论" />)
          }

          {tab === 'products' &&
          <UserProductsTab
            products={products}
            filter={productFilter}
            onFilterChange={setProductFilter} />

          }

          {tab === 'likes' && (
          likedPosts.length > 0 ?
          <UserPostList posts={likedPosts} /> :

          <Empty icon="❤️" title={t('user.empty.likes')} />)
          }

          {tab === 'collects' && (
          collectedPosts.length > 0 ?
          <UserPostList posts={collectedPosts} /> :

          <Empty icon="⭐" title={t('user.empty.collects')} />)
          }

          {tab === 'following' &&
          <FollowListTab userId={user.id} kind="following" isMe={isMe} />
          }
          {tab === 'followers' &&
          <FollowListTab userId={user.id} kind="followers" isMe={isMe} />
          }
          {tab === "followed-boards" && <FollowedBoardsTab isMe={isMe} />}

          {tab === 'badges' && <BadgeWall badges={user.badges} />}

          {tab === 'about' && <AboutTab user={user} />}
        </div>

        <div className={styles.r_b43b4c08}>
          <div className={styles.r_8e63407b}>
            <div className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}>{t('user.badges.featured')}</div>
            <div className={cx(styles.r_f3c543ad, styles.r_32aac21b, styles.r_77a2a20e)}>
              {user.badges.
              filter((b) => b.obtained).
              slice(0, 8).
              map((b) =>
              <div
                key={b.id}
                title={b.name}
                className={cx(styles.r_f3c543ad, styles.r_508ebf85, styles.r_67d66567, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_7ebecbb6, styles.r_3febee09)}>

                    {b.icon}
                  </div>
              )}
            </div>
            <button
              onClick={() => selectTab('badges')}
              className={cx(styles.r_eccd13ef, styles.r_6da6a3c3, styles.r_ca6bf630, styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_f673f4a7)}>

              {t('user.badges.viewAll')}
            </button>
          </div>

          <div className={styles.r_8e63407b}>
            <div className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}>{t('user.badges.activityData')}</div>
            <div className={cx(styles.r_6f7e013d, styles.r_359090c2)}>
              <StatRow label={t('user.stats.totalPosts')} value={String(user.posts)} />
              <StatRow label={t('user.stats.followers')} value={formatNumber(user.followers)} />
              <StatRow label={t('user.stats.following')} value={formatNumber(user.following)} />
              <StatRow label={t('user.stats.badgesEarned')} value={String(user.badges.filter((b) => b.obtained).length)} />
            </div>
          </div>
        </div>
      </div>
      {isMe &&
      <PrivacySettingsDialog
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        initialPrivacy={profilePrivacy}
        onPrivacyChange={setProfilePrivacy} />

      }
    </>);

}

function UserPostList({ posts }: {posts: Post[];}) {
  return (
    <div className={cx(styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
      {posts.map((post, index) =>
      <PostListItem
        key={post.id}
        post={post}
        showDivider={index < posts.length - 1} />

      )}
    </div>);

}

type PrivacyState = {
  showFollowing: boolean;
  showFollowers: boolean;
};

function PrivacySettingsDialog({
  open,
  onClose,
  initialPrivacy,
  onPrivacyChange





}: {open: boolean;onClose: () => void;initialPrivacy: PrivacyState;onPrivacyChange: (privacy: PrivacyState) => void;}) {
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
        [field]: !privacy[field]
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
      <div className={styles.r_3e7ce58d}>
        <p className={cx(styles.r_fc7473ca, styles.r_18550d59, styles.r_23531fd3)}>
          控制其他用户能否看到你的社交关系列表。你自己始终可以看到完整信息。
        </p>

        <div className={styles.r_6ed543e2}>
          <PrivacyOptionRow
            icon="user"
            title="公开我的关注列表"
            subtitle="关闭后，其他人无法看到你关注了哪些用户。"
            checked={privacy.showFollowing}
            saving={saving === 'showFollowing'}
            onChange={() => toggle('showFollowing')} />

          <PrivacyOptionRow
            icon="heart"
            title="公开我的粉丝列表"
            subtitle="关闭后，其他人无法看到谁关注了你。"
            checked={privacy.showFollowers}
            saving={saving === 'showFollowers'}
            onChange={() => toggle('showFollowers')} />

          <div className={cx(styles.r_c10ff8c0, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_d058ca6d, styles.r_7054e276, styles.r_23531fd3)}>
            关注数和粉丝数仍会公开展示，只隐藏具体用户列表；“关注的板块”始终仅自己可见。
          </div>
        </div>
      </div>
    </Dialog>);

}

function PrivacyOptionRow({
  icon,
  title,
  subtitle,
  checked,
  saving,
  onChange







}: {icon: 'user' | 'heart';title: string;subtitle: string;checked: boolean;saving: boolean;onChange: () => void;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_0c3bc985, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_8e63407b)}>
      <div className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_3960ffc2, styles.r_1004c0c3)}>
        <span className={cx(styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_012fbd12, styles.r_67d66567, styles.r_c10ff8c0, styles.r_7ebecbb6, styles.r_5f6a59f1)}>
          <Icon name={icon} size={16} />
        </span>
        <div className={styles.r_7e0b7cdf}>
          <div className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{title}</div>
          <div className={cx(styles.r_15e1b1f4, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>{subtitle}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={saving}
        className={cn(cx(styles.r_d89972fe, styles.r_f6fe9024, styles.r_edaba517, styles.r_012fbd12, styles.r_ac204c10, styles.r_ceb69a6b),

        checked ? styles.r_45499621 : styles.r_ee1b532e,
        saving && styles.r_f2868c22
        )}
        aria-pressed={checked}>

        <span
          className={cn(cx(styles.r_da4dbfbc, styles.r_58fcccb7, styles.r_1af92b74, styles.r_cd0d9c51, styles.r_72470489, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_ed9d3d83, styles.r_eadef238),

          checked ? styles.r_3cbbeaaa : styles.r_850292e4
          )} />

      </button>
    </div>);

}

function UserCommentList({ comments }: {comments: UserCommentItem[];}) {
  return (
    <div className={cx(styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
      {comments.map((comment, index) => {
        const content = comment.contentText || stripRichText(comment.content) || "[图片]";
        const postTitle = comment.post.title || comment.post.contentText || '无标题帖子';
        return (
          <Link
            key={comment.id}
            href={`/post/${comment.post.id}#comments`}
            className={cn(cx(styles.r_0214b4b3, styles.r_8e63407b, styles.r_ceb69a6b, styles.r_80751c7f),

            index < comments.length - 1 && cx(styles.r_65fdbade, styles.r_88b684d2)
            )}>

            <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3, styles.r_d058ca6d, styles.r_bb87c54c)}>
              <span>{formatDate(comment.createdAt)}</span>
              <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}>
                <Icon name="heart" size={12} />
                {formatNumber(comment.likes)}
              </span>
            </div>
            <p className={cx(styles.r_054cb4e3, styles.r_fc7473ca, styles.r_18550d59, styles.r_399e11a5)}>{content}</p>
            <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_c10ff8c0, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_e7eab4cb)}>
              <Icon name="comment" size={13} className={cx(styles.r_012fbd12, styles.r_b17d6a13)} />
              <span className={cx(styles.r_012fbd12, styles.r_6c4cc49e)}>评论于</span>
              <span className={cx(styles.r_7e0b7cdf, styles.r_f283ea9b, styles.r_2689f395)}>{postTitle}</span>
            </div>
          </Link>);

      })}
    </div>);

}

function UserProductsTab({
  products,
  filter,
  onFilterChange




}: {products: UserMarketProduct[];filter: ProductFilter;onFilterChange: (filter: ProductFilter) => void;}) {
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
    <div className={styles.r_6ed543e2}>
      <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
        <div className={cx(styles.r_52083e7d, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_eb6a3cef, styles.r_359090c2, styles.r_438b2237)}>
          {[
          { key: 'all' as const, label: '全部', count: counts.all },
          { key: 'on_sale' as const, label: '在售', count: counts.on_sale },
          { key: 'sold' as const, label: '已售', count: counts.sold }].
          map((item) =>
          <button
            key={item.key}
            type="button"
            onClick={() => onFilterChange(item.key)}
            className={cn(cx(styles.r_c10ff8c0, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_ceb69a6b),

            filter === item.key ? cx(styles.r_6bceb016, styles.r_2689f395, styles.r_72a4c7cd) : cx(styles.r_02eb621e, styles.r_5756b7b4, styles.r_9825203a)


            )}>

              {item.label} {item.count}
            </button>
          )}
        </div>
        <span className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>{filteredProducts.length} 个商品</span>
      </div>

      {filteredProducts.length > 0 ?
      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_1004c0c3, styles.r_e00ad816, styles.r_19d9b25e)}>
          {filteredProducts.map((product) =>
        <UserProductCard key={product.id} product={product} />
        )}
        </div> :

      <Empty icon="商品" title="暂无商品" />
      }
    </div>);

}

function UserProductCard({ product }: {product: UserMarketProduct;}) {
  const images = product.images?.length ? product.images : [product.cover];
  const sold = isProductSold(product);
  const taxonLabels = product.taxons.map((taxon) => taxon.label).filter(Boolean);

  return (
    <article className={cx(styles.r_60fbb771, styles.r_2743d360, styles.r_7e0b7cdf, styles.r_8dddea07, styles.r_2cd02d11, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_ceb69a6b, styles.r_a5c39c39, styles.r_ab1dd417)}>
      <Link href={product.url} className={styles.r_0214b4b3}>
        <div className={cx(styles.r_d89972fe, styles.r_6903eb63, styles.r_7ebecbb6)}>
          <Image
            src={product.cover}
            alt={product.title}
            fill
            sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
            className={cx(styles.r_abbc99d9, styles.r_7d85d0c2)}
            unoptimized />

          {images.length > 1 &&
          <div className={cx(styles.r_da4dbfbc, styles.r_f6babb33, styles.r_7b2d6393, styles.r_ac204c10, styles.r_95a04d1b, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_2689f395, styles.r_72a4c7cd)}>
              +{images.length - 1}
            </div>
          }
          {sold &&
          <span className={cx(styles.r_da4dbfbc, styles.r_d83be576, styles.r_9a2db8f9, styles.r_c10ff8c0, styles.r_272d24a2, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_2689f395, styles.r_72a4c7cd)}>
              已售
            </span>
          }
        </div>
      </Link>

      <div className={cx(styles.r_60fbb771, styles.r_fb7302e5, styles.r_36e579c0, styles.r_8dddea07, styles.r_58284b4e, styles.r_eb6e8b88)}>
        <Link
          href={product.url}
          className={cx(styles.r_054cb4e3, styles.r_ef52b116, styles.r_4d2392e8, styles.r_e83a7042, styles.r_4120bb12, styles.r_4ddaa618, styles.r_ceb69a6b, styles.r_9825203a)}>

          {product.title}
        </Link>
        {product.description &&
        <p className={cx(styles.r_f50e2015, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>
            {stripRichText(product.description)}
          </p>
        }
        <div className={cx(styles.r_60fbb771, styles.r_6f27f4f7, styles.r_8ef2268e, styles.r_77a2a20e)}>
          <div className={cx(styles.r_9669b98a, styles.r_69450ef1, styles.r_18550d59, styles.r_595fceba)}>{formatPrice(product.price)}</div>
          <span className={cx(styles.r_012fbd12, styles.r_d058ca6d, styles.r_69335b95)}>
            {sold ? '已售' : `库存 ${product.stock}`}
          </span>
        </div>
        {taxonLabels.length > 0 &&
        <div className={cx(styles.r_60fbb771, styles.r_0c5f3b25, styles.r_1eb5c6df, styles.r_44ee8ba0, styles.r_2cd02d11)}>
            {taxonLabels.slice(0, 2).map((label) =>
          <span key={label} className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_5f6a59f1)}>
                {label}
              </span>
          )}
          </div>
        }
        <div className={cx(styles.r_9953408a, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_b950dda2, styles.r_88b684d2, styles.r_f46b61a9, styles.r_d058ca6d, styles.r_7b89cd85)}>
          <span className={styles.r_f283ea9b}>{product.shipFrom ? `发货地 ${product.shipFrom}` : formatDate(product.createdAt)}</span>
          <span className={cx(styles.r_52083e7d, styles.r_012fbd12, styles.r_3960ffc2, styles.r_77a2a20e)}>
            <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}><Icon name="eye" size={12} />{product.views}</span>
            <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}><Icon name="message" size={12} />{product.comments}</span>
          </span>
        </div>
      </div>
    </article>);

}

function isProductSold(product: UserMarketProduct) {
  return product.status === 'sold_out' || product.listingStatus === 'sold_out' || product.stock <= 0;
}

function stripRichText(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function StatRow({ label, value }: {label: string;value: string;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
      <span className={styles.r_69335b95}>{label}</span>
      <span className={cx(styles.r_2689f395, styles.r_399e11a5)}>{value}</span>
    </div>);

}

function BadgeWall({ badges }: {badges: Badge[];}) {
  const { t } = useI18n();
  const obtained = badges.filter((b) => b.obtained);
  const locked = badges.filter((b) => !b.obtained);
  const percent = badges.length > 0 ? Math.round(obtained.length / badges.length * 100) : 0;
  return (
    <div className={styles.r_b3542e05}>
      <div>
        <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <div className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>{t('user.badges.obtainedCount', { n: obtained.length })}</div>
          <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>
            {t('user.badges.completionRate', { percent })}
          </div>
        </div>
        <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_1004c0c3, styles.r_898c0bcb, styles.r_38298f26)}>
          {obtained.map((b) =>
          <BadgeCard key={b.id} badge={b} />
          )}
        </div>
      </div>
      {locked.length > 0 &&
      <div>
          <div className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}>{t('user.badges.lockedCount', { n: locked.length })}</div>
          <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_1004c0c3, styles.r_898c0bcb, styles.r_38298f26)}>
            {locked.map((b) =>
          <BadgeCard key={b.id} badge={b} locked />
          )}
          </div>
        </div>
      }
    </div>);

}

function BadgeCard({ badge, locked }: {badge: Badge;locked?: boolean;}) {
  return (
    <div
      className={cn(cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_eb6e8b88, styles.r_ca6bf630, styles.r_eadef238, styles.r_0ca49668),

      locked && styles.r_0b8c506a
      )}>

      <div
        className={cn(cx(styles.r_a77ed4d9, styles.r_f3c543ad, styles.r_73a13409, styles.r_7e74e5fe, styles.r_67d66567, styles.r_a217b4ea, styles.r_751fb0d1),

        locked ? styles.r_7ebecbb6 : cx(styles.r_39b2e003, styles.r_49a47a82, styles.r_6c2a384d)
        )}>

        {badge.icon}
      </div>
      <div className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_399e11a5)}>{badge.name}</div>
      <div className={cx(styles.r_15e1b1f4, styles.r_1dc571a3, styles.r_e9fadafb, styles.r_69335b95)}>{badge.description}</div>
    </div>);

}

function AboutTab({ user }: {user: User;}) {
  const { t } = useI18n();
  return (
    <div className={cx(styles.r_c07e54fd, styles.r_6ed543e2, styles.r_fc7473ca)}>
      <InfoRow label={t('user.info.username')} value={user.name} />
      <InfoRow label={t('user.info.userId')} value={user.id} />
      <InfoRow label={t('user.info.level')} value={`Lv.${user.level}`} />
      <InfoRow label={t('user.info.joinDate')} value={formatDate(user.joinedAt)} />
      <InfoRow label={t('user.info.bio')} value={user.bio ?? t('user.info.empty')} />
    </div>);

}

function InfoRow({ label, value }: {label: string;value: string;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_0c3bc985, styles.r_ec0091ee)}>
      <div className={cx(styles.r_69da7e4f, styles.r_012fbd12, styles.r_359090c2, styles.r_69335b95)}>{label}</div>
      <div className={cx(styles.r_36e579c0, styles.r_399e11a5)}>{value}</div>
    </div>);

}

/* ---------------- 关注 / 粉丝 Tab ---------------- */

function FollowListTab({
  userId,
  kind,
  isMe




}: {userId: string;kind: 'following' | 'followers';isMe: boolean;}) {
  const { t } = useI18n();
  const [list, setList] = useState<User[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setBlocked(null);
    api.
    get<{items: User[];total: number;}>(
      `/api/users/${userId}/${kind}`
    ).
    then((r) => {
      setList(r.items);
      setTotal(r.total);
    }).
    catch((e) => {
      if (e instanceof ApiError && e.status === 403) {
        setBlocked(e.message);
      } else {
        setBlocked(e instanceof Error ? e.message : t('error.generic'));
      }
    }).
    finally(() => setLoading(false));
  }, [userId, kind, t]);

  if (loading) {
    return <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</div>;
  }

  if (blocked) {
    return (
      <div className={cx(styles.r_845f5336, styles.r_ca6bf630)}>
        <div className={styles.r_a95699d9}>🔒</div>
        <div className={cx(styles.r_eccd13ef, styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>{blocked}</div>
        <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_6c4cc49e)}>
          {kind === 'following' ? t('user.hidden.following') : t('user.hidden.followers')}
          {isMe &&
          <>
              <br />
              <Link href="/settings/privacy" className={cx(styles.r_5f6a59f1, styles.r_f673f4a7)}>
                {t('user.hidden.goToSettings')}
              </Link>
            </>
          }
        </div>
      </div>);

  }

  if (!list || list.length === 0) {
    return (
      <Empty
        icon={kind === 'following' ? '🤝' : '👥'}
        title={kind === 'following' ? t('user.empty.following') : t('user.empty.followers')} />);


  }

  return (
    <>
      <div className={cx(styles.r_1bb88326, styles.r_359090c2, styles.r_69335b95)}>{t('user.totalCount', { n: total })}</div>
      <ul className={styles.r_6f7e013d}>
        {list.map((u) =>
        <li key={u.id} className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_eb6e8b88)}>
            <Link href={`/user/${u.id}`}>
              <Avatar src={u.avatar} alt={u.name} size={44} />
            </Link>
            <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
              <UserName user={u} size="sm" />
              {u.bio &&
            <div className={cx(styles.r_15e1b1f4, styles.r_f50e2015, styles.r_d058ca6d, styles.r_69335b95)}>{u.bio}</div>
            }
              <div className={cx(styles.r_b6b02c0e, styles.r_1dc571a3, styles.r_6c4cc49e)}>
                Lv.{u.level} · {formatNumber(u.followers)} · {u.posts}
              </div>
            </div>
            <Link href={`/user/${u.id}`} className={styles.r_dd702538}>{t('nav.myProfile')}</Link>
          </li>
        )}
      </ul>
    </>);

}

/* ---------------- 关注的板块 Tab(仅自己可见) ---------------- */

function FollowedBoardsTab({ isMe }: {isMe: boolean;}) {
  const { t } = useI18n();
  const [list, setList] = useState<Board[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isMe) {
      setLoading(false);
      return;
    }
    api.
    get<Board[]>('/api/boards/followed').
    then(setList).
    catch(() => setList([])).
    finally(() => setLoading(false));
  }, [isMe]);

  if (!isMe) {
    return (
      <div className={cx(styles.r_845f5336, styles.r_ca6bf630)}>
        <div className={styles.r_a95699d9}>🔒</div>
        <div className={cx(styles.r_eccd13ef, styles.r_4ee73492, styles.r_e83a7042)}>{t('user.privateBoards')}</div>
        <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_6c4cc49e)}>
          {t('user.privateBoardsHint')}
        </div>
      </div>);

  }

  if (loading) {
    return <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</div>;
  }
  if (!list || list.length === 0) {
    return <Empty icon="⭐" title={t('user.empty.followedBoards')} desc={t('user.empty.followedBoardsHint')} />;
  }

  return (
    <ul className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_77a2a20e, styles.r_e4d6f343)}>
      {list.map((b) =>
      <li key={b.id}>
          <Link
          href={boardUrl(b)}
          className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_eb6e8b88, styles.r_b8627687, styles.r_9e85ac05)}>

            <span className={cx(styles.r_3febee09, styles.r_012fbd12)}>{b.icon}</span>
            <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
              <div className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{b.name}</div>
              <div className={cx(styles.r_1dc571a3, styles.r_6c4cc49e)}>
                {b.path.map((p) => p.name).join(' · ')}
              </div>
            </div>
            <span className={cx(styles.r_012fbd12, styles.r_d058ca6d, styles.r_69335b95)}>
              📝 {b.posts}
            </span>
          </Link>
        </li>
      )}
    </ul>);

}