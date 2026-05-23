'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Lightbox } from '@/components/ui/Lightbox';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { CropImageDialog } from './CropImageDialog';
import { useConcurrentUpload } from './useConcurrentUpload';

export type UploadKind = 'image' | 'video';

interface Props {
  kind: UploadKind;
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  allowExternal?: boolean;
  className?: string;
  gridClassName?: string;
  itemClassName?: string;
  itemImageClassName?: string;
  firstItemLabel?: string;
  showCropToggle?: boolean;
  simpleMode?: boolean;
}

const ACCEPT: Record<UploadKind, string> = {
  image: 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif',
  video: 'video/mp4,video/webm,video/quicktime',
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

export function UploadField({
  kind,
  value,
  onChange,
  max = kind === 'image' ? 999 : 1,
  className,
  gridClassName,
  itemClassName = 'aspect-square',
  itemImageClassName = 'object-cover',
  firstItemLabel,
  showCropToggle = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropQueue, setCropQueue] = useState<string[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const validateFile = (file: File): string | null => {
    const isHeic =
      /\.(heic|heif)$/i.test(file.name) ||
      /^image\/(heic|heif)$/i.test(file.type);
    if (kind === 'image' && !file.type.startsWith('image/') && !isHeic) {
      return '请选择图片文件';
    }
    if (kind === 'video' && !file.type.startsWith('video/')) {
      return '请选择视频文件';
    }
    const maxSize = kind === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      return `${kind === 'image' ? '图片' : '视频'}过大，最大 ${Math.round(maxSize / 1024 / 1024)} MB`;
    }
    return null;
  };

  const {
    uploadingItems,
    remainingCount,
    isUploading,
    handleFiles,
    retryUpload,
    removeUploadingItem,
  } = useConcurrentUpload({
    value,
    onChange,
    max,
    validateFile,
    onUploaded: cropEnabled && kind === 'image'
      ? (urls) => setCropQueue((prev) => [...prev, ...urls])
      : undefined,
  });

  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));

  const pushUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (value.length >= max) {
      toast.error(`最多上传 ${max} 个文件`);
      return;
    }
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length > 0) {
      void handleFiles(event.dataTransfer.files);
      return;
    }
    const url = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain');
    if (url) pushUrl(url);
  };

  const onCropConfirm = (croppedUrl: string) => {
    onChange([...value, croppedUrl].slice(0, max));
    setCropQueue((prev) => prev.slice(1));
    setCropSrc(null);
  };

  const onCropCancel = () => {
    setCropQueue((prev) => prev.slice(1));
    setCropSrc(null);
  };

  if (cropQueue.length > 0 && !cropSrc) {
    setCropSrc(cropQueue[0]);
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT[kind]}
        multiple={kind === 'image' && max > 1}
        className="hidden"
        disabled={isUploading || remainingCount === 0}
        onChange={(event) => {
          if (event.target.files) void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'grid gap-2 p-2 transition-colors',
          gridClassName,
          dragOver && 'bg-leaf-50/40 ring-2 ring-leaf-400',
        )}
      >
        {value.map((url, index) => (
          <div key={`${url}-${index}`} className={cn('group relative overflow-hidden', itemClassName)}>
            {kind === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt=""
                className={cn('h-full w-full cursor-pointer transition-opacity hover:opacity-90', itemImageClassName)}
                onClick={() => setLightboxIdx(index)}
              />
            ) : (
              <video src={url} controls preload="metadata" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
              title="移除"
            >
              x
            </button>
            {firstItemLabel && index === 0 && (
              <span className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                {firstItemLabel}
              </span>
            )}
          </div>
        ))}

        {uploadingItems.map((item) => (
          <div key={item.id} className={cn('group relative overflow-hidden bg-leaf-50', itemClassName)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url ?? item.localUrl}
              alt=""
              className={cn(
                'h-full w-full',
                item.status === 'uploading' ? 'opacity-60' : 'opacity-100',
                itemImageClassName,
              )}
            />
            {item.status !== 'uploaded' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                {item.status === 'uploading' ? (
                  <>
                    <div className="mb-2 h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <div className="text-[10px] text-white">上传中</div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-[10px] text-rose-300">失败</div>
                    <button type="button" onClick={() => void retryUpload(item)} className="text-[10px] text-white underline">
                      重试
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => removeUploadingItem(item.id)}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              x
            </button>
          </div>
        ))}

        {remainingCount > 0 && !isUploading && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-1 border-2 border-dashed text-xs transition-colors',
              itemClassName,
              dragOver
                ? 'border-leaf-500 bg-leaf-50/60'
                : 'border-leaf-200 bg-leaf-50/30 hover:border-leaf-400 hover:bg-leaf-50/50',
            )}
          >
            <Icon name="plus" size={16} className="text-leaf-600" />
            <span className="text-[10px] text-leaf-700/70">{kind === 'image' ? '图片' : '视频'}</span>
          </button>
        )}
      </div>

      {showCropToggle && kind === 'image' && (
        <label className="mt-1 flex cursor-pointer select-none items-center gap-2 text-xs text-leaf-700/70">
          <input
            type="checkbox"
            checked={cropEnabled}
            onChange={(event) => setCropEnabled(event.target.checked)}
            className="h-3.5 w-3.5 rounded accent-leaf-500"
          />
          上传后裁剪
        </label>
      )}

      {cropSrc && (
        <CropImageDialog src={cropSrc} onCancel={onCropCancel} onConfirm={onCropConfirm} />
      )}

      {kind === 'image' && value.length > 0 && (
        <Lightbox images={value} index={lightboxIdx} onClose={() => setLightboxIdx(null)} onChange={setLightboxIdx} />
      )}
    </div>
  );
}
