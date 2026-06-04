'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { cn, formatNumber } from '@/lib/utils';
import type { Post } from '@/lib/types';
import { api, ApiError } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/Toast';
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
      toast.error(e instanceof ApiError ? e.message : t('detail.post.opFail'));
    }
  };

  const toggleCollect = async () => {
    if (!ensureLogin()) return;
    try {
      const res = await api.post<{ collected: boolean }>(
        `/api/posts/${post.id}/collect`
      );
      setSaved(res.collected);
      toast.success(res.collected ? t('detail.post.collectSuccess') : t('detail.post.collectUnsetSuccess'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('detail.post.opFail'));
    }
  };

  const share = (channelKey: 'wechat' | 'weibo' | 'link') => {
    if (channelKey === 'link' && typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href).catch(() => null);
    }
    toast.success(t('detail.post.shareSuccess', { channel: t(`detail.post.shareChannels.${channelKey}`) }));
  };

  const scrollToComments = () => {
    document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative hidden border-t border-leaf-100 bg-white px-5 py-3 md:block md:px-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center justify-around gap-2">
          <ActionBtn
            active={liked}
            onClick={toggleLike}
            icon="heart"
            label={`喜欢 ${formatNumber(likes)}`}
            activeCls="text-rose-500 bg-rose-50"
          />
          <ActionBtn
            onClick={scrollToComments}
            icon="comment"
            label={`评论 ${formatNumber(post.comments)}`}
          />
          <ActionBtn
            active={saved}
            onClick={toggleCollect}
            icon="star"
            label={saved ? t('detail.post.collected') : t('detail.post.collect')}
            activeCls="text-amber-500 bg-amber-50"
          />
          <ActionBtn
            icon="share"
            label={t('detail.post.shareChannels.link')}
            onClick={() => share('link')}
          />
        </div>
        <div className="flex items-center gap-1 border-l border-leaf-100 pl-3">
          {(['wechat', 'weibo', 'link'] as const).map((k) => {
            const name = t(`detail.post.shareChannels.${k}`);
            return (
              <button
                key={k}
                onClick={() => share(k)}
                className="grid h-9 w-9 place-items-center rounded-xl text-ink-500 hover:bg-leaf-50 hover:text-leaf-800"
                title={t('detail.post.shareToX', { name })}
              >
                <Icon name={k === 'link' ? 'link' : 'share'} size={15} />
              </button>
            );
          })}
        </div>
      </div>
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
        'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-medium transition-colors',
        active ? activeCls : 'text-ink-700/80 hover:bg-leaf-50'
      )}
    >
      <Icon name={icon} size={16} fill={active ? 'currentColor' : 'none'} />
      {label}
    </button>
  );
}
