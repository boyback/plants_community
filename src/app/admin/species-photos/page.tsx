'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';

type Status = 'pending' | 'approved' | 'rejected';

interface AdminPhoto {
  id: string;
  url: string;
  caption: string | null;
  status: Status;
  votes: number;
  pinned: boolean;
  rejectReason: string | null;
  createdAt: string;
  uploader: { id: string; name: string; avatar: string; level: number };
  species: {
    id: string;
    name: string;
    slug: string;
    genusSlug: string;
    categorySlug: string;
  };
}

export default function Page() {
  const [tab, setTab] = useState<Status>('pending');
  const [items, setItems] = useState<AdminPhoto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  };

  const load = async (status: Status, more = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const cur = more ? cursor : null;
      const url = `/api/admin/species-photos?status=${status}${cur ? `&cursor=${cur}` : ''}`;
      const r = await api.get<{ items: AdminPhoto[]; nextCursor: string | null }>(url);
      setItems((prev) => (more ? [...prev, ...r.items] : r.items));
      setCursor(r.nextCursor);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setCursor(null);
    void load(tab, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const act = async (
    pid: string,
    action: 'approve' | 'reject' | 'pin' | 'unpin' | 'delete',
    reason?: string
  ) => {
    try {
      await api.patch(`/api/admin/species-photos/${pid}`, { action, reason });
      // 简单方式:从列表里移除(approve/reject 都让本 tab 不再有它)
      if (action === 'delete' || (action === 'approve' && tab !== 'approved') || (action === 'reject' && tab !== 'rejected')) {
        setItems((prev) => prev.filter((p) => p.id !== pid));
      } else {
        // pin/unpin 在原列表更新
        setItems((prev) =>
          prev.map((p) => (p.id === pid ? { ...p, pinned: action === 'pin' } : p))
        );
      }
      showToast('操作成功');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">📸 品种现场照审核</h1>

      <div className="flex gap-1 border-b border-leaf-100">
        {(['pending', 'approved', 'rejected'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'relative px-4 py-2 text-sm transition-colors',
              tab === t ? 'font-semibold text-leaf-700' : 'text-ink-700/60 hover:text-leaf-700'
            )}
          >
            {t === 'pending' ? '待审核' : t === 'approved' ? '已通过' : '已驳回'}
            {tab === t && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-leaf-500" />
            )}
          </button>
        ))}
      </div>

      {items.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-leaf-200 bg-white py-12 text-center text-sm text-leaf-700/70">
          暂无内容
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            <div className="relative aspect-square bg-leaf-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              {p.pinned && (
                <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                  📌 钉顶
                </span>
              )}
              <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">
                👍 {p.votes}
              </span>
            </div>
            <div className="space-y-2 p-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-leaf-700/70">品种:</span>
                <Link
                  href={`/board/${p.species.categorySlug}/${p.species.genusSlug}/${p.species.slug}`}
                  target="_blank"
                  className="font-medium text-leaf-700 hover:underline"
                >
                  {p.species.name}
                </Link>
              </div>
              <div className="flex items-center gap-1.5 text-leaf-700/80">
                <span>上传:</span>
                <span>
                  {p.uploader.name} · Lv.{p.uploader.level}
                </span>
              </div>
              {p.caption && (
                <div className="line-clamp-2 text-ink-700/80">{p.caption}</div>
              )}
              {p.rejectReason && (
                <div className="rounded bg-rose-50 px-2 py-1 text-rose-700">
                  驳回原因:{p.rejectReason}
                </div>
              )}

              <div className="flex flex-wrap gap-1 pt-1">
                {tab !== 'approved' && (
                  <button onClick={() => act(p.id, 'approve')} className="btn-primary !text-[11px]">
                    通过
                  </button>
                )}
                {tab !== 'rejected' && (
                  <button
                    onClick={() => {
                      const reason = window.prompt('驳回原因(可空)') ?? undefined;
                      void act(p.id, 'reject', reason || undefined);
                    }}
                    className="btn-outline !text-[11px]"
                  >
                    驳回
                  </button>
                )}
                {tab === 'approved' && (
                  <button
                    onClick={() => act(p.id, p.pinned ? 'unpin' : 'pin')}
                    className="btn-outline !text-[11px]"
                  >
                    {p.pinned ? '取消钉顶' : '设为封面'}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm('确定删除这张照片?')) void act(p.id, 'delete');
                  }}
                  className="btn-outline !text-[11px] text-rose-600"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {cursor && (
        <div className="flex justify-center pt-3">
          <button
            onClick={() => load(tab, true)}
            className="btn-outline !text-sm"
            disabled={loading}
          >
            {loading ? '加载中…' : '加载更多'}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-leaf-900/85 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
