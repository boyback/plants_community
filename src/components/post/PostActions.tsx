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
  initialCollectedTotal = 0,
}: {
  post: Post;
  initialLiked?: boolean;
  initialCollected?: boolean;
  initialCollectedTotal?: number;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialCollected);
  const [likes, setLikes] = useState(post.likes);
  const [collects, setCollects] = useState(initialCollectedTotal);
  const [railOpen, setRailOpen] = useState(true);

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
      const res = await api.post<{ collected: boolean; total: number }>(
        `/api/posts/${post.id}/collect`
      );
      setSaved(res.collected);
      setCollects(res.total);
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

  const report = async () => {
    if (!ensureLogin()) return;
    const detail = window.prompt('请输入举报原因');
    if (detail === null) return;
    const text = detail.trim();
    if (!text) {
      toast.error('请输入举报原因');
      return;
    }
    try {
      await api.post('/api/reports', {
        targetType: 'post',
        targetId: post.id,
        reason: 'user_report',
        detail: text,
      });
      toast.success('举报已提交');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '举报失败');
    }
  };

  const scrollToComments = () => {
    document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="hidden md:block">
      <div
        className={cn(
          'fixed left-[max(16px,calc(50vw_-_666px))] top-1/2 z-30 w-16 -translate-y-1/2 transition-[transform,opacity] duration-200 ease-out',
          railOpen
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none -translate-x-3 opacity-0'
        )}
        aria-hidden={!railOpen}
      >
        <div className="overflow-hidden rounded-2xl border border-leaf-100 bg-white/95 p-1.5 shadow-lg shadow-ink-900/5 backdrop-blur">
          <button
            type="button"
            onClick={() => setRailOpen(false)}
            className="mb-1 grid h-8 w-full place-items-center rounded-xl text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
            title="收起操作栏"
            aria-label="收起操作栏"
          >
            <Icon name="close" size={14} />
          </button>
          <div className="space-y-1">
            <ActionBtn
              icon="share"
              label="分享"
              onClick={() => share('link')}
            />
            <ActionBtn
              active={saved}
              icon="bookmark"
              label="收藏"
              count={collects}
              activeCls="bg-amber-50 text-amber-600"
              onClick={toggleCollect}
            />
            <ActionBtn
              active={liked}
              icon="thumbs-up"
              label="点赞"
              count={likes}
              activeCls="bg-rose-50 text-rose-600"
              onClick={toggleLike}
            />
            <ActionBtn
              icon="comment"
              label="评论"
              count={post.comments}
              onClick={scrollToComments}
            />
            <ActionBtn
              icon="alert"
              label="举报"
              onClick={report}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setRailOpen(true)}
        className={cn(
          'fixed left-[max(16px,calc(50vw_-_662px))] top-1/2 z-30 grid h-12 w-8 -translate-y-1/2 place-items-center rounded-full bg-ink-100 text-ink-500 shadow-md shadow-ink-900/5 transition-[transform,opacity,background-color,color] duration-200 ease-out hover:bg-ink-200 hover:text-ink-800',
          railOpen
            ? 'pointer-events-none -translate-x-3 opacity-0'
            : 'translate-x-0 opacity-100'
        )}
        title="展开操作栏"
        aria-label="展开操作栏"
        aria-expanded={railOpen}
      >
        <Icon name="menu" size={16} />
      </button>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  count,
  onClick,
  active,
  activeCls,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  count?: number;
  onClick?: () => void;
  active?: boolean;
  activeCls?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-[11px] font-semibold leading-tight text-ink-600 transition-colors hover:bg-leaf-50 hover:text-leaf-800',
        active && (activeCls ?? 'bg-leaf-50 text-leaf-800')
      )}
      title={label}
      aria-label={label}
    >
      <Icon name={icon} size={16} fill={active ? 'currentColor' : 'none'} />
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className={cn('text-[11px] font-medium text-ink-400', active && 'text-current')}>
          {formatNumber(count)}
        </span>
      )}
    </button>
  );
}
