'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FloatingActionRail } from '@/components/ui/FloatingActionRail';
import { toast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client-api';

type SpeciesActionItem = {
  id: string;
  speciesId: string;
  name: string;
  url: string;
  collected: boolean;
  collectTotal: number;
  compared: boolean;
};

export function SpeciesDetailActions({ species }: { species: SpeciesActionItem }) {
  const router = useRouter();
  const [collected, setCollected] = useState(species.collected);
  const [collectTotal, setCollectTotal] = useState(species.collectTotal);
  const [collectBusy, setCollectBusy] = useState(false);
  const [compared, setCompared] = useState(species.compared);
  const [compareBusy, setCompareBusy] = useState(false);

  const toggleFavorite = async () => {
    if (collectBusy) return;
    setCollectBusy(true);
    try {
      const res = await api.post<{ collected: boolean; total: number }>(`/api/species/${species.speciesId}/collect`);
      setCollected(res.collected);
      setCollectTotal(res.total);
      toast.success(res.collected ? '已收藏到我的图鉴，可到 /plants/favorites 查看' : '已取消收藏');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      } else {
        toast.error(e instanceof ApiError ? e.message : '操作失败');
      }
    } finally {
      setCollectBusy(false);
    }
  };

  const toggleCompare = async () => {
    if (compareBusy) return;
    setCompareBusy(true);
    try {
      const res = await api.post<{ compared: boolean; total: number }>(`/api/species/${species.speciesId}/compare`);
      setCompared(res.compared);
      toast.success(res.compared ? `已加入对比列表(${res.total}/4)，可到 /plants/compare 查看` : `已移出对比列表(${res.total}/4)`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      } else {
        toast.error(e instanceof ApiError ? e.message : '操作失败');
      }
    } finally {
      setCompareBusy(false);
    }
  };

  const share = async () => {
    const url = typeof window === 'undefined' ? species.url : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${species.name} - 植物图鉴`, url });
      } else {
        await navigator.clipboard?.writeText(url);
        toast.success('链接已复制');
      }
    } catch {
      toast.error('分享失败，请稍后再试');
    }
  };

  return (
    <FloatingActionRail
      items={[
        { icon: 'share', label: '分享', onClick: share },
        {
          icon: 'bookmark',
          label: collected ? '已收藏' : '收藏',
          count: collectTotal,
          active: collected,
          activeCls: 'bg-amber-50 text-amber-600',
          onClick: toggleFavorite,
          disabled: collectBusy,
        },
        {
          icon: 'link',
          label: compared ? '已对比' : '对比',
          active: compared,
          activeCls: 'bg-leaf-50 text-leaf-800',
          onClick: toggleCompare,
          disabled: compareBusy,
        },
      ]}
    />
  );
}
