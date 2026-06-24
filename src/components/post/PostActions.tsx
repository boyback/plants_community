'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FloatingActionRail } from '@/components/ui/FloatingActionRail';
import type { Post } from '@/lib/types';
import { api, ApiError } from "@/lib/client-api";
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nContext';
import styles from './PostActions.module.scss';
import { cx } from '@/lib/style-utils';



export function PostActions({
  post,
  initialLiked = false,
  initialCollected = false,
  initialCollectedTotal = 0





}: {post: Post;initialLiked?: boolean;initialCollected?: boolean;initialCollectedTotal?: number;}) {
  const { user, equip } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialCollected);
  const [likes, setLikes] = useState(post.likes);
  const [collects, setCollects] = useState(initialCollectedTotal);

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
      const res = await api.post<{liked: boolean;total: number;}>(
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
      const res = await api.post<{collected: boolean;total: number;}>(
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
        detail: text
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
    <FloatingActionRail
      anchorSelector="[data-post-detail-card]"
      items={[
      { icon: 'share', label: '分享', onClick: () => share('link') },
      {
        icon: 'bookmark',
        label: '收藏',
        count: collects,
        active: saved,
        activeCls: cx(styles.r_67d2289d, styles.r_47d65ecb),
        onClick: toggleCollect
      },
      {
        icon: "thumbs-up",
        label: '点赞',
        count: likes,
        active: liked,
        activeCls: cx(styles.r_0759a0f1, styles.r_595fceba),
        reactionSkin: equip.reaction ?? null,
        onClick: toggleLike
      },
      { icon: 'comment', label: '评论', count: post.comments, onClick: scrollToComments },
      { icon: 'alert', label: '举报', onClick: report }]
      } />);


}
