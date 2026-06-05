'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useConcurrentUpload } from '@/components/upload/useConcurrentUpload';
import type { ConcurrentUploadingItem } from '@/components/upload/useConcurrentUpload';
import { cn } from '@/lib/utils';

const ACCEPT_IMAGE = 'image/jpeg,image/png,image/webp,image/gif,.heic,.heif';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

type CommentUploadEntry =
  | { type: 'uploaded'; key: string; url: string }
  | { type: 'uploading'; key: string; url: string; item: ConcurrentUploadingItem };

export function PlainCommentComposer({
  title,
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel = '发送',
  submitting = false,
  error,
  maxLength = 2000,
  minHeight = 132,
  className,
  images = [],
  onImagesChange,
  maxImages = 9,
}: {
  title?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  submitLabel?: string;
  submitting?: boolean;
  error?: string | null;
  maxLength?: number;
  minHeight?: number;
  className?: string;
  images?: string[];
  onImagesChange?: (images: string[]) => void;
  maxImages?: number;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  const [attachmentOrder, setAttachmentOrder] = useState<string[]>([]);
  const canUploadImages = Boolean(onImagesChange);
  const {
    uploadingItems,
    isUploading,
    handleFiles,
    retryUpload,
    removeUploadingItem,
  } = useConcurrentUpload({
    value: images,
    onChange: onImagesChange ?? (() => undefined),
    max: maxImages,
    validateFile: validateCommentImage,
    onUploadedItem: (id, url) => {
      const nextImages = [...imagesRef.current, url].slice(0, maxImages);
      imagesRef.current = nextImages;
      onImagesChange?.(nextImages);
      setAttachmentOrder((prev) => {
        const uploadingKey = uploadingOrderKey(id);
        const uploadedKey = uploadedOrderKey(url);
        if (prev.includes(uploadingKey)) {
          return prev.map((key) => (key === uploadingKey ? uploadedKey : key));
        }
        return prev.includes(uploadedKey) ? prev : [...prev, uploadedKey];
      });
    },
  });
  const isEmpty = value.trim().length === 0 && images.length === 0;
  const uploadingById = new Map(uploadingItems.map((item) => [item.id, item]));
  const imageSet = new Set(images);
  const uploadEntries = attachmentOrder.reduce<CommentUploadEntry[]>((entries, key) => {
    if (key.startsWith('uploaded:')) {
      const url = key.slice('uploaded:'.length);
      if (imageSet.has(url)) entries.push({ type: 'uploaded', key, url });
      return entries;
    }
    if (key.startsWith('uploading:')) {
      const id = key.slice('uploading:'.length);
      const item = uploadingById.get(id);
      if (item) entries.push({
        type: 'uploading',
        key,
        url: item.url ?? item.localUrl,
        item,
      });
      return entries;
    }
    return entries;
  }, []);

  useEffect(() => {
    imagesRef.current = images;
    setAttachmentOrder((prev) => {
      const activeUploadingKeys = new Set(uploadingItems.map((item) => uploadingOrderKey(item.id)));
      const activeUploadedKeys = new Set(images.map(uploadedOrderKey));
      const next = prev.filter((key) => activeUploadingKeys.has(key) || activeUploadedKeys.has(key));

      for (const item of uploadingItems) {
        const key = uploadingOrderKey(item.id);
        if (!next.includes(key)) next.push(key);
      }
      for (const url of images) {
        const key = uploadedOrderKey(url);
        if (!next.includes(key)) next.push(key);
      }

      return next;
    });
  }, [images, uploadingItems]);

  return (
    <div className={cn('space-y-3', className)}>
      {title ? <div className="text-sm font-semibold text-ink-950">{title}</div> : null}
      <div className="rounded-lg px-[18px] py-4" style={{ backgroundColor: 'rgba(51, 51, 51, .02)' }}>
        <input
          ref={pickerRef}
          type="file"
          accept={ACCEPT_IMAGE}
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="block w-full resize-none border-0 bg-transparent text-sm leading-6 text-ink-800 outline-none placeholder:text-ink-400 focus:ring-0"
          style={{ minHeight }}
        />
        {uploadEntries.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {uploadEntries.map((entry) =>
              entry.type === 'uploaded' ? (
                <CommentImageTile
                  key={entry.key}
                  url={entry.url}
                  status="uploaded"
                  onRemove={() => {
                    const next = images.filter((url) => url !== entry.url);
                    imagesRef.current = next;
                    onImagesChange?.(next);
                    setAttachmentOrder((prev) => prev.filter((key) => key !== uploadedOrderKey(entry.url)));
                  }}
                />
              ) : (
                <CommentImageTile
                  key={entry.key}
                  url={entry.url}
                  status={entry.item.status}
                  progress={entry.item.progress}
                  error={entry.item.error}
                  onRemove={() => {
                    removeUploadingItem(entry.item.id);
                    setAttachmentOrder((prev) => prev.filter((key) => key !== uploadingOrderKey(entry.item.id)));
                  }}
                  onRetry={() => void retryUpload(entry.item)}
                />
              )
            )}
          </div>
        )}
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0 text-[11px] text-leaf-700/60">
            {error ? <span className="text-rose-500">{error}</span> : null}
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <button
              type="button"
              aria-label="图片"
              onClick={() => pickerRef.current?.click()}
              disabled={!canUploadImages || isUploading || images.length + uploadingItems.length >= maxImages}
              className="grid h-8 w-8 place-items-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Icon name="image" size={19} />
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isEmpty || submitting || isUploading}
              className="h-10 shrink-0 whitespace-nowrap rounded-md bg-ink-700 px-5 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {submitting ? '发送中...' : isUploading ? '上传中...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentImageTile({
  url,
  status,
  progress,
  error,
  onRemove,
  onRetry,
}: {
  url: string;
  status: 'uploading' | 'uploaded' | 'error';
  progress?: number;
  error?: string;
  onRemove: () => void;
  onRetry?: () => void;
}) {
  const percent = Math.max(0, Math.min(100, Math.round(progress ?? 0)));

  return (
    <div
      className={cn(
        'group relative h-[90px] w-[90px] overflow-hidden rounded-md border bg-leaf-50/30',
        status === 'uploading' ? 'border-dashed border-leaf-200' : 'border-leaf-100',
        status === 'error' && 'border-rose-200 bg-rose-50'
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className={cn(
          'absolute inset-0 h-full w-full object-cover',
          status === 'uploading' ? 'opacity-40' : 'opacity-100',
          status === 'error' && 'opacity-25'
        )}
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 z-20 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
        title={status === 'uploading' ? '取消上传' : '移除'}
      >
        x
      </button>

      {status === 'uploading' && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/30 text-white">
          <div className="flex w-16 flex-col items-center gap-1.5">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/35">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-150"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[10px] leading-none">{percent}%</span>
          </div>
        </div>
      )}

      {status === 'uploaded' && (
        <div className="absolute bottom-1 left-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
          已上传
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-black/45 px-2 text-white">
          <span className="text-[10px]">{error ?? '上传失败'}</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="text-[10px] underline">
              重试
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function validateCommentImage(file: File): string | null {
  const allowed =
    file.type.startsWith('image/') ||
    /\.(heic|heif)$/i.test(file.name);
  if (!allowed) return '请选择图片格式的文件';
  if (file.size > MAX_IMAGE_SIZE) return '单张图片不能超过 10 MB';
  return null;
}

function uploadedOrderKey(url: string) {
  return `uploaded:${url}`;
}

function uploadingOrderKey(id: string) {
  return `uploading:${id}`;
}
