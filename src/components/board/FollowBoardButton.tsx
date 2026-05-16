'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { cn } from '@/lib/utils';

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
  className,
}: {
  type: 'board' | 'genus' | 'species';
  slug: string;
  categorySlug?: string;
  genusSlug?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
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
    api
      .get<Array<{ level: string; slug: string; path: Array<{ level: string; slug: string }> }>>(
        '/api/boards/followed'
      )
      .then((list) => {
        const hit = list.some(
          (b) => b.level === type && b.slug === slug && matchContext(b, categorySlug, genusSlug)
        );
        setFollowed(hit);
      })
      .catch(() => setFollowed(false));
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
      alert(e instanceof ApiError ? e.message : t('detail.board.opFail'));
    } finally {
      setBusy(false);
    }
  };

  const sizeCls =
    size === 'sm' ? '!text-xs !px-2 !py-0.5' : size === 'lg' ? '!text-sm !px-4' : '!text-xs !px-3';

  if (!user) {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn('btn-outline', sizeCls, className)}
      >
        {t('detail.board.followShort')}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || followed === null}
      className={cn(
        'btn',
        sizeCls,
        followed
          ? 'bg-leaf-100 text-leaf-700 hover:bg-leaf-200'
          : 'bg-leaf-500 text-white hover:bg-leaf-600',
        className
      )}
    >
      {followed === null ? '⋯' : followed ? t('detail.board.following') : t('detail.board.followFull')}
    </button>
  );
}

function matchContext(
  board: { path: Array<{ level: string; slug: string }> },
  categorySlug?: string,
  genusSlug?: string
): boolean {
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
