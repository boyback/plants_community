'use client';

/**
 * 移动端帖子详情页底部黏底操作栏。
 *
 * 仅在 < md 显示;桌面端保持原 PostActions 卡片不变。
 * 内置:点赞、收藏、评论锚点、分享 BottomSheet
 *
 * 注意:这个组件不接管业务逻辑,只是把 PostActions 的接口在移动端换一种表现。
 * 通过 props 接入同一份状态。
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { cn, formatNumber } from '@/lib/utils';
import { api, ApiError } from "@/lib/client-api";
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import type { Post } from '@/lib/types';
import styles from './MobileActionBar.module.scss';
import { cx } from '@/lib/style-utils';



export function MobileActionBar({
  post,
  initialLiked = false,
  initialCollected = false




}: {post: Post;initialLiked?: boolean;initialCollected?: boolean;}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialCollected);
  const [likes, setLikes] = useState(post.likes);
  const [shareOpen, setShareOpen] = useState(false);

  const ensureLogin = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return false;
    }
    return true;
  };

  const toggleLike = async () => {
    if (!ensureLogin()) return;
    try {
      const r = await api.post<{liked: boolean;total: number;}>(
        `/api/posts/${post.id}/like`
      );
      setLiked(r.liked);
      setLikes(r.total);
    } catch (e) {
      console.warn(e instanceof ApiError ? e.message : 'op failed');
    }
  };

  const toggleCollect = async () => {
    if (!ensureLogin()) return;
    try {
      const r = await api.post<{collected: boolean;}>(`/api/posts/${post.id}/collect`);
      setSaved(r.collected);
    } catch (e) {
      console.warn(e instanceof ApiError ? e.message : 'op failed');
    }
  };

  const scrollToComments = () => {
    const el = document.getElementById('comments');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const share = (key: 'wechat' | 'weibo' | 'link') => {
    if (key === 'link' && typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href).catch(() => null);
    }
    setShareOpen(false);
    // 简易 toast
    const el = document.createElement('div');
    el.className = cx(styles.r_7bc55599, styles.r_c81f89e1, styles.r_e632769a, styles.r_db5a366a, styles.r_efaa0701, styles.r_ac204c10, styles.r_01d0b06c, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_359090c2, styles.r_72a4c7cd, styles.r_06bbb431);
    el.textContent = t('detail.post.shareSuccess', { channel: t(`detail.post.shareChannels.${key}`) });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  };

  return (
    <>
      {/* 占位,避免内容被遮挡 */}
      <div className={cx(styles.r_acaee621, styles.r_e477a6af)} aria-hidden />

      <div className={cx(styles.r_7bc55599, styles.r_3f6397bf, styles.r_189f036c, styles.r_0f2fff0a, styles.r_b950dda2, styles.r_88b684d2, styles.r_f5ebd4d0, styles.r_0b2e8c28, styles.r_e477a6af)}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className={cx(styles.r_0e12dc7d, styles.r_60fbb771, styles.r_cb7721dc, styles.r_3960ffc2, styles.r_58284b4e, styles.r_0e17f2bd, styles.r_03b4dd7f)}>
          <BottomBtn
            icon="thumbs-up"
            label={formatNumber(likes)}
            active={liked}
            activeCls={styles.r_fa512798}
            onClick={toggleLike} />

          <BottomBtn
            icon="bookmark"
            label={saved ? t('detail.post.collected') : t('detail.post.collect')}
            active={saved}
            activeCls={styles.r_1dd48761}
            onClick={toggleCollect} />

          <BottomBtn
            icon="comment"
            label={String(post.comments)}
            onClick={scrollToComments} />

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className={cx(styles.r_fb56d9cf, styles.r_ac204c10, styles.r_45499621, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_359090c2, styles.r_2689f395, styles.r_72a4c7cd)}>

            {t('detail.post.shareTo')}
          </button>
        </div>
      </div>

      <BottomSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={t('detail.post.shareTo')}>

        <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_1004c0c3, styles.r_c07e54fd)}>
          {([
          { key: 'wechat', icon: 'message' },
          { key: 'weibo', icon: 'globe' },
          { key: 'link', icon: 'link' }] as
          const).map(({ key, icon }) => {
            return (
              <button
                key={key}
                type="button"
                onClick={() => share(key)}
                className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_a8a62ca4, styles.r_8e63407b, styles.r_eb6abb1f, styles.r_ceb69a6b, styles.r_2efc423a, styles.r_81be6435)}>

                <span className={cx(styles.r_f3c543ad, styles.r_426b8b75, styles.r_d854e569, styles.r_67d66567, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_5f6a59f1, styles.r_438b2237)}>
                  <Icon name={icon} size={18} />
                </span>
                <span className={styles.r_359090c2}>{t(`detail.post.shareChannels.${key}`)}</span>
              </button>);

          })}
        </div>
      </BottomSheet>
    </>);

}

function BottomBtn({
  icon,
  label,
  onClick,
  active,
  activeCls






}: {icon: Parameters<typeof Icon>[0]['name'];label: string;onClick?: () => void;active?: boolean;activeCls?: string;}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_a3899220, styles.r_0c5e9137, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_d058ca6d, styles.r_ceb69a6b),

      active ? activeCls : styles.r_b85c981b
      )}>

      <Icon name={icon} size={20} fill={active ? 'currentColor' : 'none'} />
      <span className={styles.r_c2385a46}>{label}</span>
    </button>);

}