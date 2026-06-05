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
import { api, ApiError } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import type { Post } from '@/lib/types';

export function MobileActionBar({
  post,
  initialLiked = false,
  initialCollected = false,
}: {
  post: Post;
  initialLiked?: boolean;
  initialCollected?: boolean;
}) {
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
      const r = await api.post<{ liked: boolean; total: number }>(
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
      const r = await api.post<{ collected: boolean }>(`/api/posts/${post.id}/collect`);
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
    el.className = 'fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-ink-800 px-4 py-2 text-xs text-white shadow-lg';
    el.textContent = t('detail.post.shareSuccess', { channel: t(`detail.post.shareChannels.${key}`) });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  };

  return (
    <>
      {/* 占位,避免内容被遮挡 */}
      <div className="h-16 md:hidden" aria-hidden />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-leaf-100 bg-white/95 backdrop-blur md:hidden"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-[640px] items-center gap-1.5 px-3 py-2">
          <BottomBtn
            icon="thumbs-up"
            label={formatNumber(likes)}
            active={liked}
            activeCls="text-rose-500"
            onClick={toggleLike}
          />
          <BottomBtn
            icon="bookmark"
            label={saved ? t('detail.post.collected') : t('detail.post.collect')}
            active={saved}
            activeCls="text-amber-500"
            onClick={toggleCollect}
          />
          <BottomBtn
            icon="comment"
            label={String(post.comments)}
            onClick={scrollToComments}
          />
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="ml-auto rounded-full bg-leaf-500 px-4 py-2 text-xs font-medium text-white"
          >
            {t('detail.post.shareTo')}
          </button>
        </div>
      </div>

      <BottomSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={t('detail.post.shareTo')}
      >
        <div className="grid grid-cols-3 gap-3 p-5">
          {([
            { key: 'wechat', icon: 'message' },
            { key: 'weibo', icon: 'globe' },
            { key: 'link', icon: 'link' },
          ] as const).map(({ key, icon }) => {
            return (
              <button
                key={key}
                type="button"
                onClick={() => share(key)}
                className="flex flex-col items-center gap-2 rounded-lg bg-leaf-50/60 p-4 text-ink-700 transition-colors hover:bg-leaf-100 hover:text-leaf-800"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-leaf-700 shadow-sm">
                  <Icon name={icon} size={18} />
                </span>
                <span className="text-xs">{t(`detail.post.shareChannels.${key}`)}</span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}

function BottomBtn({
  icon,
  label,
  onClick,
  active,
  activeCls,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  onClick?: () => void;
  active?: boolean;
  activeCls?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 rounded-none px-3 py-1 text-[11px] transition-colors',
        active ? activeCls : 'text-ink-700/80'
      )}
    >
      <Icon name={icon} size={20} fill={active ? 'currentColor' : 'none'} />
      <span className="leading-none">{label}</span>
    </button>
  );
}
