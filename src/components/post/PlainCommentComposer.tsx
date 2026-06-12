'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useConcurrentUpload } from '@/components/upload/useConcurrentUpload';
import type { ConcurrentUploadingItem } from '@/components/upload/useConcurrentUpload';
import { cn } from '@/lib/utils';
import styles from './PlainCommentComposer.module.scss';
import { cx } from '@/lib/style-utils';



const ACCEPT_IMAGE = 'image/jpeg,image/png,image/webp,image/gif,.heic,.heif';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

type CommentUploadEntry =
{type: 'uploaded';key: string;url: string;} |
{type: 'uploading';key: string;url: string;item: ConcurrentUploadingItem;};

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
  maxImages = 9















}: {title?: string;value: string;onChange: (value: string) => void;onSubmit: () => void;placeholder: string;submitLabel?: string;submitting?: boolean;error?: string | null;maxLength?: number;minHeight?: number;className?: string;images?: string[];onImagesChange?: (images: string[]) => void;maxImages?: number;}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  const [attachmentOrder, setAttachmentOrder] = useState<string[]>([]);
  const canUploadImages = Boolean(onImagesChange);
  const {
    uploadingItems,
    isUploading,
    handleFiles,
    retryUpload,
    removeUploadingItem
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
          return prev.map((key) => key === uploadingKey ? uploadedKey : key);
        }
        return prev.includes(uploadedKey) ? prev : [...prev, uploadedKey];
      });
    }
  });
  const isEmpty = value.trim().length === 0 && images.length === 0;
  const uploadingById = new Map(uploadingItems.map((item) => [item.id, item]));
  const imageSet = new Set(images);
  const uploadEntries = attachmentOrder.reduce<CommentUploadEntry[]>((entries, key) => {
    if (key.startsWith("uploaded:")) {
      const url = key.slice("uploaded:".length);
      if (imageSet.has(url)) entries.push({ type: 'uploaded', key, url });
      return entries;
    }
    if (key.startsWith("uploading:")) {
      const id = key.slice("uploading:".length);
      const item = uploadingById.get(id);
      if (item) entries.push({
        type: 'uploading',
        key,
        url: item.url ?? item.localUrl,
        item
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
    <div className={cn(styles.r_6ed543e2, className)}>
      {title ? <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_6d623258)}>{title}</div> : null}
      <div className={cx(styles.r_5f22e64f, styles.r_5ecb649e, styles.r_cb11fec3)} style={{ backgroundColor: 'rgba(51, 51, 51, .02)' }}>
        <input
          ref={pickerRef}
          type="file"
          accept={ACCEPT_IMAGE}
          multiple
          className={styles.r_99d72c7f}
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = '';
          }} />

        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cx(styles.r_0214b4b3, styles.r_6da6a3c3, styles.r_6aef3201, styles.r_119b2aa0, styles.r_7f19cdf4, styles.r_fc7473ca, styles.r_18550d59, styles.r_399e11a5, styles.r_df37b1fd, styles.r_e4a886d4, styles.r_e9c2b353)}
          style={{ minHeight }} />

        {uploadEntries.length > 0 &&
        <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
            {uploadEntries.map((entry) =>
          entry.type === 'uploaded' ?
          <CommentImageTile
            key={entry.key}
            url={entry.url}
            status="uploaded"
            onRemove={() => {
              const next = images.filter((url) => url !== entry.url);
              imagesRef.current = next;
              onImagesChange?.(next);
              setAttachmentOrder((prev) => prev.filter((key) => key !== uploadedOrderKey(entry.url)));
            }} /> :


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
            onRetry={() => void retryUpload(entry.item)} />


          )}
          </div>
        }
        <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_6f27f4f7, styles.r_8ef2268e, styles.r_1004c0c3)}>
          <div className={cx(styles.r_7e0b7cdf, styles.r_d058ca6d, styles.r_6c4cc49e)}>
            {error ? <span className={styles.r_fa512798}>{error}</span> : null}
          </div>
          <div className={cx(styles.r_60fbb771, styles.r_012fbd12, styles.r_3960ffc2, styles.r_0c3bc985)}>
            <button
              type="button"
              aria-label="图片"
              onClick={() => pickerRef.current?.click()}
              disabled={!canUploadImages || isUploading || images.length + uploadingItems.length >= maxImages}
              className={cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_67d66567, styles.r_421ac2be, styles.r_66a36c90, styles.r_ceb69a6b, styles.r_9cab05a6, styles.r_3364420b, styles.r_5f533b3a, styles.r_bda7a224)}>

              <Icon name="image" size={19} />
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isEmpty || submitting || isUploading}
              className={cx(styles.r_426b8b75, styles.r_012fbd12, styles.r_e82ae8be, styles.r_421ac2be, styles.r_9c6a87c1, styles.r_d139dd09, styles.r_fc7473ca, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_56bf8ae8, styles.r_0bdeb0f4, styles.r_5f533b3a, styles.r_bda7a224)}>

              {submitting ? '发送中...' : isUploading ? '上传中...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>);

}

function CommentImageTile({
  url,
  status,
  progress,
  error,
  onRemove,
  onRetry







}: {url: string;status: 'uploading' | 'uploaded' | 'error';progress?: number;error?: string;onRemove: () => void;onRetry?: () => void;}) {
  const percent = Math.max(0, Math.min(100, Math.round(progress ?? 0)));

  return (
    <div
      className={cn(cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_4b4cc48e, styles.r_d524f8b8, styles.r_2cd02d11, styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_54720a96),

      status === 'uploading' ? cx(styles.r_a29b7a64, styles.r_691861bc) : styles.r_88b684d2,
      status === 'error' && cx(styles.r_959f4a9f, styles.r_0759a0f1)
      )}>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className={cn(cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2),

        status === 'uploading' ? styles.r_2a2db466 : styles.r_3972e98d,
        status === 'error' && styles.r_2fcf49fa
        )} />

      <button
        type="button"
        onClick={onRemove}
        className={cx(styles.r_da4dbfbc, styles.r_68d3fc19, styles.r_c55dcda2, styles.r_145745bf, styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_db1c7bcb, styles.r_d058ca6d, styles.r_72a4c7cd, styles.r_3972e98d, styles.r_67d6184a, styles.r_527b812d, styles.r_ed9efdb6)}
        title={status === 'uploading' ? '取消上传' : '移除'}>

        x
      </button>

      {status === 'uploading' &&
      <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_236812d6, styles.r_f3c543ad, styles.r_67d66567, styles.r_b0d7388d, styles.r_72a4c7cd)}>
          <div className={cx(styles.r_60fbb771, styles.r_baceed34, styles.r_8dddea07, styles.r_3960ffc2, styles.r_58284b4e)}>
            <div className={cx(styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_afbdd13a, styles.r_ac204c10, styles.r_65935df5, styles.r_9c15994f, styles.r_9fd93a7d)} />
            <div className={cx(styles.r_3a1268a4, styles.r_6da6a3c3, styles.r_2cd02d11, styles.r_ac204c10, styles.r_bd2d6173)}>
              <div
              className={cx(styles.r_668b21aa, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_9824fc78, styles.r_233c0494)}
              style={{ width: `${percent}%` }} />

            </div>
            <span className={cx(styles.r_1dc571a3, styles.r_c2385a46)}>{percent}%</span>
          </div>
        </div>
      }

      {status === 'uploaded' &&
      <div className={cx(styles.r_da4dbfbc, styles.r_57045bd8, styles.r_7971386c, styles.r_236812d6, styles.r_07389a77, styles.r_db1c7bcb, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_72a4c7cd)}>
          已上传
        </div>
      }

      {status === 'error' &&
      <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_236812d6, styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_44ee8ba0, styles.r_9db85c5e, styles.r_d5eab218, styles.r_72a4c7cd)}>
          <span className={styles.r_1dc571a3}>{error ?? '上传失败'}</span>
          {onRetry &&
        <button type="button" onClick={onRetry} className={cx(styles.r_1dc571a3, styles.r_c82b67c8)}>
              重试
            </button>
        }
        </div>
      }
    </div>);

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