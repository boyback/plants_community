'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import styles from './FollowBoardButton.module.scss';
import { cx } from '@/lib/style-utils';



/**
 * 板块关注按钮。
 * 通过 GET /api/boards/followed 拉一次用户全部关注,前端判断是否已关注,
 * 避免为每个板块页单独做一个 GET is-following。
 */
export function FollowBoardButton({
  type,
  slug,
  categorySlug,
  genusSlug,
  size = 'md',
  className







}: {type: 'board' | 'genus' | 'species';slug: string;categorySlug?: string;genusSlug?: string;size?: 'sm' | 'md' | 'lg';className?: string;}) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const [followed, setFollowed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setFollowed(null);
      return;
    }
    api.
    get<Array<{level: string;slug: string;path: Array<{level: string;slug: string;}>;}>>(
      '/api/boards/followed'
    ).
    then((list) => {
      const hit = list.some(
        (b) => b.level === type && b.slug === slug && matchContext(b, categorySlug, genusSlug)
      );
      setFollowed(hit);
    }).
    catch(() => setFollowed(false));
  }, [user, type, slug, categorySlug, genusSlug]);

  const toggle = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setBusy(true);
    try {
      const body = { type, slug, categorySlug, genusSlug };
      if (followed) {
        await api.delete('/api/boards/follow', body);
        setFollowed(false);
      } else {
        await api.post('/api/boards/follow', body);
        setFollowed(true);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('detail.board.opFail'));
    } finally {
      setBusy(false);
    }
  };

  const sizeCls =
  size === 'sm' ? cx(styles.r_dd702538, styles.r_92172c7d, styles.r_95e16551) : size === 'lg' ? cx(styles.r_4f43b5cb, styles.r_af7490b1) : cx(styles.r_dd702538, styles.r_23b4e5ed);

  if (!user) {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn('btn-outline', sizeCls, className)}>

        {t('detail.board.followShort')}
      </button>);

  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || followed === null}
      className={cn(
        'btn',
        sizeCls,
        followed ? cx(styles.r_f2b23104, styles.r_5f6a59f1, styles.r_d8a68f7c) : cx(styles.r_45499621, styles.r_72a4c7cd, styles.r_24f5f8c9),


        className
      )}>

      {followed === null ? '⋯' : followed ? t('detail.board.following') : t('detail.board.followFull')}
    </button>);

}

function matchContext(
board: {path: Array<{level: string;slug: string;}>;},
categorySlug?: string,
genusSlug?: string)
: boolean {
  if (categorySlug) {
    const c = board.path.find((p) => p.level === 'category');
    if (!c || c.slug !== categorySlug) return false;
  }
  if (genusSlug) {
    const g = board.path.find((p) => p.level === 'genus');
    if (!g || g.slug !== genusSlug) return false;
  }
  return true;
}