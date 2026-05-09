'use client';

import { useEffect, useState } from 'react';
import type { SpeciesPhoto } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Lightbox } from '@/components/ui/Lightbox';
import { api, ApiError } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface PhotosResp {
  items: SpeciesPhoto[];
  canUpload: boolean;
  uploadReason: string | null;
  moderation: 'auto' | 'manual';
}

interface Props {
  speciesId: string;
}

/**
 * 品种现场照块:
 *  - 瀑布流式 3 列(移动 2 列)
 *  - 每张右下角「👍 N」按钮(顶/取消顶)
 *  - 钉顶角标 📌
 *  - 顶部上传区(权限不足时禁用 + 提示)
 *  - 点击图片打开 lightbox
 *  - 上传成功后乐观插入头部
 */
export function SpeciesPhotoPanel({ speciesId }: Props) {
  const { user } = useAuth();
  const [list, setList] = useState<SpeciesPhoto[]>([]);
  const [canUpload, setCanUpload] = useState(false);
  const [uploadReason, setUploadReason] = useState<string | null>(null);
  const [moderation, setModeration] = useState<'auto' | 'manual'>('auto');
  const [loading, setLoading] = useState(true);
  const [lbIdx, setLbIdx] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PhotosResp>(`/api/species/${speciesId}/photos`)
      .then((r) => {
        if (cancelled) return;
        setList(r.items);
        setCanUpload(r.canUpload);
        setUploadReason(r.uploadReason);
        setModeration(r.moderation);
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [speciesId, user?.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const onVote = async (p: SpeciesPhoto) => {
    if (!user) return showToast('请先登录');
    if (p.uploader.id === user.id) return showToast('不能给自己投票');
    // 乐观更新
    const wasVoted = p.myVoted;
    const next = list.map((x) =>
      x.id === p.id
        ? { ...x, myVoted: !wasVoted, votes: x.votes + (wasVoted ? -1 : 1) }
        : x
    );
    setList(next);
    try {
      if (wasVoted) {
        await api.delete<{ votes: number }>(
          `/api/species/${speciesId}/photos/${p.id}/vote`
        );
      } else {
        await api.post<{ votes: number }>(
          `/api/species/${speciesId}/photos/${p.id}/vote`,
          {}
        );
      }
      // 顶完重新排序(pinned 优先 + votes 倒序)
      setList((cur) =>
        [...cur].sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          if (a.votes !== b.votes) return b.votes - a.votes;
          return a.createdAt.localeCompare(b.createdAt);
        })
      );
    } catch (e) {
      // 回滚
      setList(list);
      showToast(e instanceof ApiError ? e.message : '操作失败');
    }
  };

  const onUploaded = (p: SpeciesPhoto, needReview: boolean) => {
    if (needReview) {
      showToast('已提交,等待管理员审核 ⏳');
    } else {
      setList([p, ...list]);
      showToast('上传成功 ✅');
    }
    setShowUpload(false);
  };

  const onDelete = async (p: SpeciesPhoto) => {
    if (!user) return;
    const isMine = p.uploader.id === user.id;
    const isAdmin = user.role === 'admin' || user.role === 'moderator';
    if (!isMine && !isAdmin) return;
    if (!confirm('删除这张照片?')) return;
    try {
      await api.delete(`/api/species/${speciesId}/photos/${p.id}`);
      setList(list.filter((x) => x.id !== p.id));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '删除失败');
    }
  };

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">📸 现场照</h3>
        {canUpload ? (
          <button
            type="button"
            className="btn-primary !text-xs"
            onClick={() => setShowUpload(true)}
          >
            <Icon name="plus" size={12} />
            上传
          </button>
        ) : (
          uploadReason && (
            <span className="text-[10px] text-leaf-700/60" title={uploadReason}>
              🔒 {uploadReason}
            </span>
          )
        )}
      </div>

      {loading ? (
        <PhotoGridSkeleton />
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-leaf-200 py-8 text-center text-xs text-leaf-700/70">
          还没有现场照,
          {canUpload ? '快来贡献第一张吧 🌱' : '等待肉友贡献'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {list.map((p, i) => {
            const isMine = user?.id === p.uploader.id;
            const isAdmin =
              user?.role === 'admin' || user?.role === 'moderator';
            return (
              <div key={p.id} className="group relative">
                <button
                  type="button"
                  onClick={() => setLbIdx(i)}
                  className="block w-full overflow-hidden rounded-lg bg-leaf-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.caption ?? ''}
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </button>

                {/* 钉顶角标 */}
                {p.pinned && (
                  <span
                    className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-medium text-white shadow"
                    title="管理员置顶"
                  >
                    📌
                  </span>
                )}

                {/* 上传者 + 顶按钮 */}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <div className="flex min-w-0 items-center gap-1 text-[10px] text-white">
                    <Avatar
                      src={p.uploader.avatar}
                      alt={p.uploader.name}
                      size={14}
                    />
                    <span className="truncate">{p.uploader.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onVote(p)}
                    disabled={isMine}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium shadow transition-colors',
                      p.myVoted
                        ? 'bg-amber-500 text-white'
                        : 'bg-white/90 text-ink-800 hover:bg-white',
                      isMine && 'cursor-not-allowed opacity-60'
                    )}
                    title={isMine ? '不能给自己投票' : p.myVoted ? '取消顶' : '顶一下'}
                  >
                    👍 {p.votes}
                  </button>
                </div>

                {/* 删除按钮(本人/管理员) */}
                {(isMine || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
                    className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-500/90 text-[10px] text-white shadow group-hover:inline-flex"
                    title="删除"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 提示信息 */}
      {moderation === 'manual' && canUpload && (
        <div className="mt-2 text-[10px] text-leaf-700/60">
          ℹ️ 当前为审核模式,上传后需管理员通过才会展示
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        images={list.map((p) => p.url)}
        index={lbIdx}
        onClose={() => setLbIdx(null)}
        onChange={setLbIdx}
      />

      {/* 上传弹窗 */}
      {showUpload && (
        <UploadDialog
          speciesId={speciesId}
          onClose={() => setShowUpload(false)}
          onUploaded={onUploaded}
        />
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-leaf-900/85 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function PhotoGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square animate-pulse rounded-lg bg-leaf-100/70"
        />
      ))}
    </div>
  );
}

function UploadDialog({
  speciesId,
  onClose,
  onUploaded,
}: {
  speciesId: string;
  onClose: () => void;
  onUploaded: (p: SpeciesPhoto, needReview: boolean) => void;
}) {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!url.trim()) {
      setErr('请填写图片 URL');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const r = await api.post<{ photo: SpeciesPhoto; needReview: boolean }>(
        `/api/species/${speciesId}/photos`,
        { url: url.trim(), caption: caption.trim() || undefined }
      );
      onUploaded(r.photo, r.needReview);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '上传失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">📸 上传现场照</h3>
          <button
            onClick={onClose}
            className="text-leaf-700/70 hover:text-leaf-700"
          >
            ×
          </button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-xs text-leaf-700/80">图片 URL</div>
            <input
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs text-leaf-700/80">说明(选填)</div>
            <input
              className="input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={200}
              placeholder="例如:阳台早上 9 点拍的"
            />
          </label>
          {url && (
            <div className="overflow-hidden rounded-lg bg-leaf-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="block max-h-48 w-full object-cover"
              />
            </div>
          )}
        </div>
        {err && <div className="mt-2 text-xs text-rose-600">{err}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? '上传中…' : '上传'}
          </button>
        </div>
      </div>
    </div>
  );
}
