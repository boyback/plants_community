'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { cn, formatNumber } from '@/lib/utils';
import type { Post } from '@/lib/types';
import { api, ApiError } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';

export function PostActions({
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
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(null), 2000);
  };

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
      const res = await api.post<{ liked: boolean; total: number }>(
        `/api/posts/${post.id}/like`
      );
      setLiked(res.liked);
      setLikes(res.total);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t('detail.post.opFail'));
    }
  };

  const toggleCollect = async () => {
    if (!ensureLogin()) return;
    try {
      const res = await api.post<{ collected: boolean }>(
        `/api/posts/${post.id}/collect`
      );
      setSaved(res.collected);
      showToast(res.collected ? t('detail.post.collectSuccess') : t('detail.post.collectUnsetSuccess'));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t('detail.post.opFail'));
    }
  };

  const share = (channelKey: 'wechat' | 'weibo' | 'link') => {
    if (channelKey === 'link' && typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href).catch(() => null);
    }
    showToast(t('detail.post.shareSuccess', { channel: t(`detail.post.shareChannels.${channelKey}`) }));
  };

  return (
    <div className="relative hidden md:block">
      <div className="card flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-3">
          <ActionBtn
            active={liked}
            onClick={toggleLike}
            icon="heart"
            label={formatNumber(likes)}
            activeCls="text-rose-500 bg-rose-50"
          />
          <ActionBtn icon="comment" label={String(post.comments)} />
          <ActionBtn
            active={saved}
            onClick={toggleCollect}
            icon="star"
            label={saved ? t('detail.post.collected') : t('detail.post.collect')}
            activeCls="text-amber-500 bg-amber-50"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 hidden text-xs text-leaf-700/70 md:inline">{t('detail.post.shareTo')}</span>
          {(['wechat', 'weibo', 'link'] as const).map((k) => {
            const emoji = k === 'wechat' ? '💬' : k === 'weibo' ? '🌐' : '🔗';
            const name = t(`detail.post.shareChannels.${k}`);
            return (
              <button
                key={k}
                onClick={() => share(k)}
                className="grid h-9 w-9 place-items-center rounded-none text-base hover:bg-leaf-50"
                title={t('detail.post.shareToX', { name })}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-800 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
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
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
        active ? activeCls : 'text-ink-700/80 hover:bg-leaf-50'
      )}
    >
      <Icon name={icon} size={16} fill={active ? 'currentColor' : 'none'} />
      {label}
    </button>
  );
}
