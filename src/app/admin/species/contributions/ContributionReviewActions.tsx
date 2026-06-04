'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';

export function ContributionReviewActions({
  id,
  disabled,
  images,
  existingImages,
}: {
  id: string;
  disabled?: boolean;
  images?: string[];
  existingImages?: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>(images ?? []);
  const [cover, setCover] = useState('');
  const [preview, setPreview] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const existingSet = new Set(existingImages ?? []);

  const review = async (status: 'approved' | 'rejected', applyToSpecies = false) => {
    if (busy || disabled) return;
    setBusy(applyToSpecies ? 'apply' : status);
    try {
      const applyOptions = images?.length
        ? {
            images: selectedImages.length > 0 ? selectedImages : images,
            cover: cover || undefined,
          }
        : undefined;
      await api.patch(`/api/admin/species/contributions/${id}/review`, {
        status,
        applyToSpecies,
        applyOptions,
        reviewNote: reviewNote.trim() || undefined,
      });
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '审核失败');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 p-6" onClick={() => setPreview('')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-h-full max-w-full rounded-xl bg-white object-contain" />
        </div>
      )}

      {images?.length ? (
        <div className="rounded-lg border border-ink-100 bg-white p-2 text-left">
          <div className="mb-2 flex items-center justify-between text-[10px] text-ink-500">
            <span>写入图片</span>
            <button
              type="button"
              disabled={disabled || Boolean(busy)}
              onClick={() => setSelectedImages(selectedImages.length === images.length ? [] : images)}
              className="font-medium text-leaf-700 disabled:opacity-50"
            >
              {selectedImages.length === images.length ? '清空' : '全选'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {images.map((url, index) => {
              const checked = selectedImages.includes(url);
              const duplicated = existingSet.has(url);
              return (
                <div
                  key={url}
                  className={`relative overflow-hidden rounded border ${checked ? 'border-leaf-500' : 'border-ink-100 opacity-50'}`}
                  title={`图片 ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-12 w-full cursor-zoom-in object-cover" onClick={() => setPreview(url)} />
                  <button
                    type="button"
                    disabled={disabled || Boolean(busy)}
                    onClick={() => {
                      setSelectedImages((prev) => (prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]));
                      if (cover === url) setCover('');
                    }}
                    className="absolute left-1 top-1 rounded bg-white/90 px-1 text-[9px] font-semibold text-ink-700"
                  >
                    {checked ? '选中' : '跳过'}
                  </button>
                  {duplicated && <span className="absolute bottom-1 left-1 rounded bg-rose-600 px-1 text-[9px] font-semibold text-white">重复</span>}
                </div>
              );
            })}
          </div>
          <select
            value={cover}
            disabled={disabled || Boolean(busy)}
            onChange={(e) => setCover(e.target.value)}
            className="mt-2 h-7 w-full rounded border border-ink-100 px-2 text-[10px] outline-none focus:border-leaf-300"
          >
            <option value="">不改封面</option>
            {selectedImages.map((url, index) => (
              <option key={url} value={url}>设第 {index + 1} 张为封面</option>
            ))}
          </select>
        </div>
      ) : null}

      <textarea
        value={reviewNote}
        disabled={disabled || Boolean(busy)}
        onChange={(e) => setReviewNote(e.target.value)}
        placeholder="审核备注，可选"
        className="min-h-14 w-full rounded-lg border border-ink-100 px-2 py-1 text-[10px] outline-none focus:border-leaf-300"
        maxLength={500}
      />

      <div className="flex justify-end gap-1">
        <button
          type="button"
          disabled={disabled || Boolean(busy)}
          onClick={() => void review('approved', true)}
          className="rounded border border-amber-200 px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'apply' ? '写入中...' : '写入并通过'}
        </button>
        <button
          type="button"
          disabled={disabled || Boolean(busy)}
          onClick={() => void review('approved')}
          className="rounded border border-leaf-200 px-2 py-1 text-[10px] font-medium text-leaf-700 hover:bg-leaf-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'approved' ? '通过中...' : '通过'}
        </button>
        <button
          type="button"
          disabled={disabled || Boolean(busy)}
          onClick={() => void review('rejected')}
          className="rounded border border-rose-200 px-2 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'rejected' ? '拒绝中...' : '拒绝'}
        </button>
      </div>
    </div>
  );
}
