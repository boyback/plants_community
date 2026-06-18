'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PostListItem } from '@/components/post/PostListItem';
import { UserIdentity } from '@/components/ui/UserIdentity';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { Dialog } from '@/components/ui/Dialog';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
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
  parentId: string | null;
  parent: {
    id: string;
    content: string;
    contentText: string | null;
    deleted: boolean;
    author: {
      id: string;
      name: string;
      avatar: string;
      level: number;
    };
    parent: {
      id: string;
      author: {
        id: string;
        name: string;
        avatar: string;
        level: number;
      };
    } | null;
  } | null;
  post: {
    id: string;
    title: string;
    contentText: string | null;
  };
};

type UserLikedItem =
  | {
      type: 'post';
      likedAt: string;
      post: Post;
    }
  | {
      type: 'journal';
      likedAt: string;
      journal: {
        id: string;
        stage: string;
        stageLabel: string | null;
        note: string;
        images: string;
        likes: number;
        postId: string;
        postTitle: string;
      };
    }
  | {
      type: 'album';
      likedAt: string;
      album: {
        id: string;
        title: string;
        cover: string | null;
        likeCount: number;
        imageCount: number;
        createdAt: string;
        user: { id: string; name: string; avatar: string };
      };
    };

type UserCollectedItem =
  | {
      type: 'post';
      collectedAt: string;
      post: Post;
    }
  | {
      type: 'marketItem';
      collectedAt: string;
      marketItem: {
        id: string;
        listingId: string;
        title: string;
        description: string;
        cover: string;
        price: number;
        stock: number;
        soldCount: number;
        collectCount: number;
        status: 'on_sale' | 'sold_out' | 'off_shelf';
        listing: {
          id: string;
          title: string;
          shipFrom: string;
          status: 'on_sale' | 'sold_out' | 'off_shelf' | 'pending_review';
        };
      };
    }
  | {
      type: 'species';
      collectedAt: string;
      species: {
        id: string;
        slug: string;
        name: string;
        latinName: string;
        cover: string;
        difficulty: number;
        genusSlug: string;
        genusName: string;
        boardSlug: string | null;
        boardName: string | null;
        collectCount: number;
        postCount: number;
      };
    };

type UserCollectedMarketItem = Extract<UserCollectedItem, { type: 'marketItem' }>['marketItem'];
type UserCollectedSpecies = Extract<UserCollectedItem, { type: 'species' }>['species'];

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
{ key: 'about', labelKey: 'user.tabs.about' }];


export function UserPageClient({
  user,
  isMe,
  initialFollowed,
  posts,
  comments,
  likedItems,
  collectedItems,
  products,
  exp = 0,
  vip,
  daysLeft












}: {user: User;isMe: boolean;initialFollowed: boolean;posts: Post[];comments: UserCommentItem[];likedItems: UserLikedItem[];collectedItems: UserCollectedItem[];products: UserMarketProduct[];exp?: number;vip?: {isVip: boolean;lifetime: boolean;expireAt: string | null;};daysLeft?: number | null;}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === 'undefined') return 'posts';
    const p = new URLSearchParams(window.location.search).get('tab');
    const allowed: TabKey[] = [
    'posts', 'comments', 'products', 'likes', 'collects', 'following', 'followers',
    "followed-boards", 'about'];

    // 支持�?tab �?following-boards
    const normalized = p === "following-boards" ? "followed-boards" : p;
    return allowed.includes(normalized as TabKey) ? normalized as TabKey : 'posts';
  });
  const [followed, setFollowed] = useState(initialFollowed);
  const [productFilter, setProductFilter] = useState<ProductFilter>('all');
  const [badgeCenterOpen, setBadgeCenterOpen] = useState(false);
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

  // 计算下一�?EXP
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
          <div className={styles.profileHeroIdentity}>
            <UserIdentity
              user={{ ...user, vip }}
              size="xl"
              variant="profile"
              asLink={false}
              avatarRing={false}
              className={styles.profileIdentity}
              nameClassName={styles.profileIdentityName}
              textClassName={styles.profileIdentityText}
              subtitle={
                <span className={styles.profileIdentityMeta}>
                  <span className={styles.profileIdentityLevel}>Lv.{user.level} · {currentDef ? t(`levels.name.${currentDef.level}`) : ''}</span>
                  <span className={styles.profileIdentityBio}>{user.bio || t('user.noBio')}</span>
                  {nextDef &&
                  <span className={styles.profileIdentityExp}>
                    <span className={styles.profileIdentityExpTop}>
                      <span>EXP {exp} / {expCap}</span>
                      <span>{t('user.expToNext', { level: nextDef.level, need: expCap - exp })}</span>
                    </span>
                    <span className={styles.profileIdentityExpTrack}>
                      <span
                        className={styles.profileIdentityExpFill}
                        style={{ width: `${expPercent}%` }} />
                    </span>
                  </span>
                  }
                  <span className={styles.profileIdentityStats}>
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
                  </span>
                </span>
              }
            />
          </div>
          <div className={styles.profileActions}>
            {isMe ?
            <>
                <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPrivacyOpen(true)}
                className={styles.profileActionButton}>

                  {t('user.actions.privacy')}
                </Button>
                <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cx(styles.r_2ed430b2, styles.r_86021721, styles.r_dd702538, styles.r_41a0398f, styles.r_1b08d87e)}
                disabled
                title={t('user.actions.editProfileUnavailable')}>

                  <Icon name="edit" size={12} />
                  {t('user.actions.editProfile')}
                </Button>
              </> :

            <>
                <ButtonLink href={`/messages?to=${user.id}`} variant="ghost" size="sm" className={styles.profileActionButton}>
                  <Icon name="message" size={14} />
                  {t('user.actions.message')}
                </ButtonLink>
                <Button
                type="button"
                onClick={toggleFollow}
                disabled={busy}
                variant={followed ? 'ghost' : 'primary'}
                size="sm"
                className={followed ? styles.profileActionButton : undefined}>

                  {followed ? t('user.actions.unfollow') : t('user.actions.follow')}
                </Button>
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
          likedItems.length > 0 ?
          <UserLikedList items={likedItems} /> :

          <Empty icon="❤️" title={t('user.empty.likes')} />)
          }

          {tab === 'collects' && (
          collectedItems.length > 0 ?
          <UserCollectedList items={collectedItems} /> :

          <Empty icon="⭐" title={t('user.empty.collects')} />)
          }

          {tab === 'following' &&
          <FollowListTab userId={user.id} kind="following" isMe={isMe} />
          }
          {tab === 'followers' &&
          <FollowListTab userId={user.id} kind="followers" isMe={isMe} />
          }
          {tab === "followed-boards" && <FollowedBoardsTab isMe={isMe} />}

          {tab === 'about' && <AboutTab user={user} />}
        </div>

        <div className={styles.r_b43b4c08}>
          <div className={styles.sidebarBadgeCard}>
            <div className={styles.sidebarBadgeHeader}>
              <div className={styles.sidebarBadgeTitle}>徽章墙</div>
              <button
                type="button"
                className={styles.sidebarBadgeArrow}
                onClick={() => setBadgeCenterOpen(true)}
                aria-label="查看徽章大全">
                &gt;
              </button>
            </div>
            <div className={styles.sidebarBadgeBody}>
              {user.badges.filter((b) => b.obtained).length > 0 ?
              <div className={styles.sidebarBadgeWall}>
                  {user.badges.
                  filter((b) => b.obtained).
                  map((b) =>
                  <BadgeIconTile key={b.id} badge={b} compact />
                  )}
                </div> :
              <Empty icon="🏅" title="暂未获得徽章" />
              }
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
      <BadgeCenterDialog
        open={badgeCenterOpen}
        onClose={() => setBadgeCenterOpen(false)}
        badges={user.badges} />
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
        const parentAuthor = comment.parent?.author?.name;
        const grandParentAuthor = comment.parent?.parent?.author?.name;
        const parentPreview = comment.parent && !comment.parent.deleted ?
        comment.parent.contentText || stripRichText(comment.parent.content) :
        '';
        return (
          <Link
            key={comment.id}
            href={`/post/${comment.post.id}#comment-${comment.id}`}
            className={cn(cx(styles.r_0214b4b3, styles.r_8e63407b, styles.r_ceb69a6b, styles.r_80751c7f),

            index < comments.length - 1 && cx(styles.r_65fdbade, styles.r_88b684d2)
            )}>

            <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3, styles.r_d058ca6d, styles.r_bb87c54c)}>
              <span>{formatDate(comment.createdAt)}</span>
              <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}>
                {comment.parentId && <span className={styles.commentReplyBadge}>回复</span>}
                <Icon name="heart" size={12} />
                {formatNumber(comment.likes)}
              </span>
            </div>
            <p className={cx(styles.r_054cb4e3, styles.r_fc7473ca, styles.r_18550d59, styles.r_399e11a5)}>{content}</p>
            {parentAuthor &&
            <div className={styles.commentReplyContext}>
              回复 {parentAuthor}
              {grandParentAuthor ? ' 的回复' : ''}
              <span>{parentPreview || '原评论已删除'}</span>
            </div>
            }
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

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
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

function BadgeIconTile({ badge, locked = false, compact = false }: {badge: Badge;locked?: boolean;compact?: boolean;}) {
  return (
    <div className={cn(compact ? styles.sidebarBadgeIconTile : styles.badgeTile, locked && styles.r_0b8c506a)} title={badge.description || badge.name}>
      <div className={compact ? styles.sidebarBadgeIcon : styles.badgeTileIcon}>{badge.icon}</div>
      {!compact && <div className={styles.badgeTileLabel}>{badge.name}</div>}
      {!compact && <div className={badge.obtained ? styles.badgeStateOn : styles.badgeStateOff}>{badge.obtained ? '已激活' : '未激活'}</div>}
    </div>);

}

function UserLikedList({ items }: {items: UserLikedItem[];}) {
  return (
    <div className={styles.likedList}>
      {items.map((item) => {
        if (item.type === 'post') {
          return <LikedPostCard key={`post-${item.post.id}`} post={item.post} likedAt={item.likedAt} />;
        }

        if (item.type === 'journal') {
          const images = parseJsonArray(item.journal.images);
          const title = item.journal.stageLabel || item.journal.stage || '成长记录';
          return (
            <LikedJournalCard
              key={`journal-${item.journal.id}`}
              postId={item.journal.postId}
              entryId={item.journal.id}
              likedAt={item.likedAt}
              title={title}
              desc={item.journal.note}
              cover={images[0]}
              meta={`来自 ${item.journal.postTitle}`}
              likes={item.journal.likes}
            />
          );
        }

        return (
          <LikedAlbumCard
            key={`album-${item.album.id}`}
            albumId={item.album.id}
            likedAt={item.likedAt}
            title={item.album.title}
            desc={`共 ${formatNumber(item.album.imageCount)} 张图片`}
            cover={item.album.cover ?? undefined}
            meta={`来自 ${item.album.user.name}`}
            likes={item.album.likeCount}
          />
        );
      })}
    </div>
  );
}

function LikedPostCard({ post, likedAt }: {post: Post;likedAt: string;}) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(true);
  const [likes, setLikes] = useState(post.likes);
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    setBusy(true);
    const previousLiked = liked;
    const previousLikes = likes;
    setLiked(!previousLiked);
    setLikes(Math.max(0, previousLikes + (previousLiked ? -1 : 1)));
    try {
      const res = await api.post<{liked: boolean; total: number;}>(`/api/posts/${post.id}/like`);
      setLiked(res.liked);
      setLikes(res.total);
    } catch (e) {
      setLiked(previousLiked);
      setLikes(previousLikes);
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="none" className={styles.likedPostCard}>
      <div className={styles.likedItemHeader}>
        <span className={styles.likedType}>帖子</span>
        <span>{formatDate(likedAt)}</span>
      </div>
      <PostListItem
        post={post}
        showDivider={false}
        liked={liked}
        likeCount={likes}
        likeBusy={busy}
        onLikeClick={toggleLike}
      />
    </Card>
  );
}

function LikedJournalCard({
  postId,
  entryId,
  likedAt,
  title,
  desc,
  cover,
  meta,
  likes
}: {
  postId: string;
  entryId: string;
  likedAt: string;
  title: string;
  desc?: string | null;
  cover?: string;
  meta: string;
  likes: number;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(true);
  const [total, setTotal] = useState(likes);
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    setBusy(true);
    const previousLiked = liked;
    const previousTotal = total;
    setLiked(!previousLiked);
    setTotal(Math.max(0, previousTotal + (previousLiked ? -1 : 1)));
    try {
      const res = await api.post<{liked: boolean; total: number;}>(`/api/posts/${postId}/journal/${entryId}/like`);
      setLiked(res.liked);
      setTotal(res.total);
    } catch (e) {
      setLiked(previousLiked);
      setTotal(previousTotal);
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="compact" className={styles.likedMediaCard}>
      <Link href={`/post/${postId}#journal-entry-${entryId}`} className={styles.likedSimpleLink}>
        <span className={styles.likedCover}>
          {cover ? (
            <Image src={cover} alt={title} fill sizes="82px" className={styles.likedCoverImage} unoptimized />
          ) : (
            <Icon name="heart" size={24} />
          )}
        </span>
        <span className={styles.likedSimpleMain}>
          <span className={styles.likedItemHeader}>
            <span className={styles.likedType}>成长记录</span>
            <span>{formatDate(likedAt)}</span>
          </span>
          <span className={styles.likedTitle}>{title}</span>
          {desc ? <span className={styles.likedDesc}>{desc}</span> : null}
          <span className={styles.likedMeta}>{meta}</span>
        </span>
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={toggleLike}
        className={cn(styles.likedInlineAction, liked && styles.likedInlineActionActive)}
        aria-pressed={liked}
      >
        <Icon name="thumbs-up" size={14} fill={liked ? 'currentColor' : 'none'} />
        {formatNumber(total)}
      </button>
    </Card>
  );
}

function LikedAlbumCard({
  albumId,
  likedAt,
  title,
  desc,
  cover,
  meta,
  likes
}: {
  albumId: string;
  likedAt: string;
  title: string;
  desc?: string | null;
  cover?: string;
  meta: string;
  likes: number;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(true);
  const [total, setTotal] = useState(likes);
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    setBusy(true);
    const previousLiked = liked;
    const previousTotal = total;
    setLiked(!previousLiked);
    setTotal(Math.max(0, previousTotal + (previousLiked ? -1 : 1)));
    try {
      const res = await api.post<{liked: boolean;}>(`/api/albums/${albumId}/like`);
      const nextTotal = res.liked ? previousTotal + 1 : Math.max(0, previousTotal - 1);
      setLiked(res.liked);
      setTotal(nextTotal);
    } catch (e) {
      setLiked(previousLiked);
      setTotal(previousTotal);
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="compact" className={styles.likedMediaCard}>
      <Link href={`/album/${albumId}`} className={styles.likedSimpleLink}>
        <span className={styles.likedCover}>
          {cover ? (
            <Image src={cover} alt={title} fill sizes="82px" className={styles.likedCoverImage} unoptimized />
          ) : (
            <Icon name="heart" size={24} />
          )}
        </span>
        <span className={styles.likedSimpleMain}>
          <span className={styles.likedItemHeader}>
            <span className={styles.likedType}>相册</span>
            <span>{formatDate(likedAt)}</span>
          </span>
          <span className={styles.likedTitle}>{title}</span>
          {desc ? <span className={styles.likedDesc}>{desc}</span> : null}
          <span className={styles.likedMeta}>{meta}</span>
        </span>
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={toggleLike}
        className={cn(styles.likedInlineAction, liked && styles.likedInlineActionActive)}
        aria-pressed={liked}
      >
        <Icon name="thumbs-up" size={14} fill={liked ? 'currentColor' : 'none'} />
        {formatNumber(total)}
      </button>
    </Card>
  );
}

function UserCollectedList({ items }: {items: UserCollectedItem[];}) {
  return (
    <div className={styles.likedList}>
      {items.map((item) => {
        if (item.type === 'post') {
          return <CollectedPostCard key={`collect-post-${item.post.id}`} post={item.post} collectedAt={item.collectedAt} />;
        }

        if (item.type === 'marketItem') {
          return (
            <CollectedMarketItemCard
              key={`collect-market-${item.marketItem.id}`}
              item={item.marketItem}
              collectedAt={item.collectedAt}
            />
          );
        }

        return (
          <CollectedSpeciesCard
            key={`collect-species-${item.species.id}`}
            species={item.species}
            collectedAt={item.collectedAt}
          />
        );
      })}
    </div>
  );
}

function CollectedPostCard({ post, collectedAt }: {post: Post;collectedAt: string;}) {
  const { user } = useAuth();
  const router = useRouter();
  const [collected, setCollected] = useState(true);
  const [busy, setBusy] = useState(false);

  const toggleCollect = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    setBusy(true);
    const previous = collected;
    setCollected(!previous);
    try {
      const res = await api.post<{collected: boolean; total: number}>(`/api/posts/${post.id}/collect`);
      setCollected(res.collected);
    } catch (e) {
      setCollected(previous);
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="none" className={styles.likedPostCard}>
      <div className={styles.likedItemHeader}>
        <span className={styles.likedType}>帖子收藏</span>
        <span>{formatDate(collectedAt)}</span>
      </div>
      <PostListItem post={post} showDivider={false} />
      <div className={styles.likedFooter}>
        <Button type="button" size="sm" variant={collected ? 'primary' : 'outline'} disabled={busy} onClick={toggleCollect}>
          <Icon name="bookmark" size={14} fill={collected ? 'currentColor' : 'none'} />
          {collected ? '已收藏' : '收藏'}
        </Button>
      </div>
    </Card>
  );
}

function CollectedMarketItemCard({
  item,
  collectedAt
}: {
  item: UserCollectedMarketItem;
  collectedAt: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [collected, setCollected] = useState(true);
  const [busy, setBusy] = useState(false);

  const toggleCollect = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    setBusy(true);
    const previous = collected;
    setCollected(!previous);
    try {
      const res = await api.post<{collected: boolean}>(`/api/market/listings/${item.listingId}/items/${item.id}/collect`);
      setCollected(res.collected);
    } catch (e) {
      setCollected(previous);
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="compact" className={styles.likedMediaCard}>
      <Link href={`/market/${item.listingId}?item=${item.id}`} className={styles.likedSimpleLink}>
        <span className={styles.likedCover}>
          <Image src={item.cover} alt={item.title} fill sizes="82px" className={styles.likedCoverImage} unoptimized />
        </span>
        <span className={styles.likedSimpleMain}>
          <span className={styles.likedItemHeader}>
            <span className={styles.likedType}>商品收藏</span>
            <span>{formatDate(collectedAt)}</span>
          </span>
          <span className={styles.likedTitle}>{item.title}</span>
          <span className={styles.likedDesc}>{item.description}</span>
          <span className={styles.likedMeta}>{item.listing.title} · {item.listing.shipFrom || '未填写发货地'}</span>
        </span>
      </Link>
      <div className={styles.likedFooter}>
        <Button type="button" size="sm" variant={collected ? 'primary' : 'outline'} disabled={busy} onClick={toggleCollect}>
          <Icon name="bookmark" size={14} fill={collected ? 'currentColor' : 'none'} />
          {collected ? '已收藏' : '收藏'}
        </Button>
      </div>
    </Card>
  );
}

function CollectedSpeciesCard({
  species,
  collectedAt
}: {
  species: UserCollectedSpecies;
  collectedAt: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [collected, setCollected] = useState(true);
  const [busy, setBusy] = useState(false);

  const toggleCollect = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    setBusy(true);
    const previous = collected;
    setCollected(!previous);
    try {
      const res = await api.post<{collected: boolean; total: number}>(`/api/species/${species.id}/collect`);
      setCollected(res.collected);
    } catch (e) {
      setCollected(previous);
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="compact" className={styles.likedMediaCard}>
      <Link
        href={species.boardSlug ? `/plants/${species.boardSlug}/${species.genusSlug}/${species.slug}` : '/plants'}
        className={styles.likedSimpleLink}
      >
        <span className={styles.likedCover}>
          {species.cover ? (
            <Image src={species.cover} alt={species.name} fill sizes="82px" className={styles.likedCoverImage} unoptimized />
          ) : (
            <Icon name="plants" size={24} />
          )}
        </span>
        <span className={styles.likedSimpleMain}>
          <span className={styles.likedItemHeader}>
            <span className={styles.likedType}>品种收藏</span>
            <span>{formatDate(collectedAt)}</span>
          </span>
          <span className={styles.likedTitle}>{species.name}</span>
          <span className={styles.likedDesc}>{species.latinName}</span>
          <span className={styles.likedMeta}>
            {species.boardName ?? '未分板块'} · {species.genusName}
          </span>
        </span>
      </Link>
      <div className={styles.likedFooter}>
        <Button type="button" size="sm" variant={collected ? 'primary' : 'outline'} disabled={busy} onClick={toggleCollect}>
          <Icon name="bookmark" size={14} fill={collected ? 'currentColor' : 'none'} />
          {collected ? '已收藏' : '收藏'}
        </Button>
      </div>
    </Card>
  );
}

function BadgeCenterDialog({ open, onClose, badges }: {open: boolean;onClose: () => void;badges: Badge[];}) {
  return (
    <Dialog open={open} onClose={onClose} title="徽章大全" maxWidth="xl">
      <div className={styles.badgeCenterSection}>
        <div className={styles.badgeCenterTitle}>全部徽章</div>
        {badges.length > 0 ?
        <div className={styles.badgeCenterGrid}>
            {badges.map((badge) =>
          <BadgeIconTile key={badge.id} badge={badge} />
          )}
          </div> :
        <Empty icon="🏅" title="暂无徽章" />
        }
      </div>
    </Dialog>);

}

function BadgeCard({ badge, locked, compact }: {badge: Badge;locked?: boolean;compact?: boolean;}) {
  return (
    <div
      className={cn(cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_eb6e8b88, styles.r_ca6bf630, styles.r_eadef238, styles.r_0ca49668),

      locked && styles.r_0b8c506a,
      compact && styles.compactBadgeCard
      )}>

      <div
        className={cn(cx(styles.r_a77ed4d9, styles.r_f3c543ad, styles.r_73a13409, styles.r_7e74e5fe, styles.r_67d66567, styles.r_a217b4ea, styles.r_751fb0d1),

        locked ? styles.r_7ebecbb6 : cx(styles.r_39b2e003, styles.r_49a47a82, styles.r_6c2a384d),
        compact && styles.compactBadgeIcon
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
    <Card padding="loose" className={styles.aboutCard}>
      <InfoRow label={t('user.info.username')} value={user.name} />
      <InfoRow label={t('user.info.userId')} value={user.id} />
      <InfoRow label={t('user.info.level')} value={`Lv.${user.level}`} />
      <InfoRow label={t('user.info.joinDate')} value={formatDate(user.joinedAt)} />
      <InfoRow label={t('user.info.bio')} value={user.bio ?? t('user.info.empty')} />
    </Card>);

}

function InfoRow({ label, value }: {label: string;value: string;}) {
  return (
    <div className={styles.aboutRow}>
      <div className={styles.aboutLabel}>{label}</div>
      <div className={styles.aboutValue}>{value}</div>
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
      <ul className={styles.followList}>
        {list.map((u) =>
        <li key={u.id}>
            <Card padding="compact" interactive className={styles.followCard}>
              <UserIdentity
                user={u}
                size="lg"
                variant="list"
                showLevel
                className={styles.followIdentity}
                subtitle={
                  <span className={styles.followMeta}>
                    {u.bio && <span className={styles.followBio}>{u.bio}</span>}
                    <span>Lv.{u.level} · {formatNumber(u.followers)} 粉丝 · {u.posts} 帖</span>
                  </span>
                } />
              <ButtonLink href={`/user/${u.id}`} variant="outline" size="sm">
                {t('nav.myProfile')}
              </ButtonLink>
            </Card>
          </li>
        )}
      </ul>
    </>);

}

/* ---------------- 关注的板�?Tab(仅自己可�? ---------------- */

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
    <ul className={styles.followedBoardList}>
      {list.map((b) => {
        const visual = getBoardVisualImage(b);
        return (
          <li key={b.id}>
            <Card padding="compact" interactive className={styles.followedBoardCard}>
              <Link href={boardUrl(b)} className={styles.followedBoardLink}>
                <span className={styles.followedBoardCover}>
                  {visual ? (
                    <Image
                      src={visual}
                      alt={b.name}
                      fill
                      sizes="88px"
                      className={styles.followedBoardCoverImage}
                      unoptimized />
                  ) : (
                    <span className={styles.followedBoardIcon}>{b.icon || '🌿'}</span>
                  )}
                </span>
                <span className={styles.followedBoardMain}>
                  <span className={styles.followedBoardName}>{b.name}</span>
                  <span className={styles.followedBoardPath}>
                    {b.path.map((p) => p.name).join(' · ')}
                  </span>
                  {b.description ? <span className={styles.followedBoardDesc}>{b.description}</span> : null}
                </span>
                <span className={styles.followedBoardMeta}>
                  <span>{formatNumber(b.posts)} 帖</span>
                  {b.childrenCount !== undefined ? <span>{formatNumber(b.childrenCount)} 个子板块</span> : null}
                </span>
              </Link>
            </Card>
          </li>
        );
      })}
    </ul>);

}

function getBoardVisualImage(board: Board): string | null {
  if (isImageUrl(board.cover)) return board.cover;
  if (isImageUrl(board.icon)) return board.icon;
  return null;
}

function isImageUrl(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^https?:\/\//.test(value);
}
