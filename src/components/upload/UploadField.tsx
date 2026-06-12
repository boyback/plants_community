'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Lightbox } from '@/components/ui/Lightbox';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { CropImageDialog } from './CropImageDialog';
import { useConcurrentUpload } from './useConcurrentUpload';
import styles from './UploadField.module.scss';
import { cx } from '@/lib/style-utils';



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
  video: 'video/mp4,video/webm,video/quicktime'
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
  itemClassName = styles.r_b59cd297,
  itemImageClassName = styles.r_7d85d0c2,
  firstItemLabel,
  showCropToggle = false
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
    removeUploadingItem
  } = useConcurrentUpload({
    value,
    onChange,
    max,
    validateFile,
    onUploaded: cropEnabled && kind === 'image' ?
    (urls) => setCropQueue((prev) => [...prev, ...urls]) :
    undefined
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
    const url = event.dataTransfer.getData("text/uri-list") || event.dataTransfer.getData('text/plain');
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
    <div className={cn(styles.r_6f7e013d, className)}>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT[kind]}
        multiple={kind === 'image' && max > 1}
        className={styles.r_99d72c7f}
        disabled={isUploading || remainingCount === 0}
        onChange={(event) => {
          if (event.target.files) void handleFiles(event.target.files);
          event.target.value = '';
        }} />


      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(cx(styles.r_f3c543ad, styles.r_77a2a20e, styles.r_7660b450, styles.r_ceb69a6b),

        gridClassName,
        dragOver && cx(styles.r_efb55408, styles.r_16b1efa5, styles.r_5aa69808)
        )}>

        {value.map((url, index) =>
        <div key={`${url}-${index}`} className={cn(cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_2cd02d11), itemClassName)}>
            {kind === 'image' ?
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className={cn(cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_34516836, styles.r_67d6184a, styles.r_961c6c3a), itemImageClassName)}
            onClick={() => setLightboxIdx(index)} /> :


          <video src={url} controls preload="metadata" className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)} />
          }
            <button
            type="button"
            onClick={() => removeAt(index)}
            className={cx(styles.r_da4dbfbc, styles.r_68d3fc19, styles.r_c55dcda2, styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_db1c7bcb, styles.r_d058ca6d, styles.r_72a4c7cd, styles.r_7065497e, styles.r_67d6184a, styles.r_181f3d6c)}
            title="移除">

              x
            </button>
            {firstItemLabel && index === 0 &&
          <span className={cx(styles.r_da4dbfbc, styles.r_57045bd8, styles.r_7971386c, styles.r_db1c7bcb, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_72a4c7cd)}>
                {firstItemLabel}
              </span>
          }
          </div>
        )}

        {uploadingItems.map((item) =>
        <div key={item.id} className={cn(cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_2cd02d11, styles.r_7ebecbb6), itemClassName)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
            src={item.url ?? item.localUrl}
            alt=""
            className={cn(cx(styles.r_668b21aa, styles.r_6da6a3c3),

            item.status === 'uploading' ? styles.r_f2868c22 : styles.r_3972e98d,
            itemImageClassName
            )} />

            {item.status !== 'uploaded' &&
          <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_fd9dca32)}>
                {item.status === 'uploading' ?
            <>
                    <div className={cx(styles.r_a77ed4d9, styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_afbdd13a, styles.r_ac204c10, styles.r_65935df5, styles.r_0f9b8dce, styles.r_9fd93a7d)} />
                    <div className={cx(styles.r_1dc571a3, styles.r_72a4c7cd)}>上传中</div>
                  </> :

            <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_44ee8ba0)}>
                    <div className={cx(styles.r_1dc571a3, styles.r_f554fc59)}>失败</div>
                    <button type="button" onClick={() => void retryUpload(item)} className={cx(styles.r_1dc571a3, styles.r_72a4c7cd, styles.r_c82b67c8)}>
                      重试
                    </button>
                  </div>
            }
              </div>
          }
            <button
            type="button"
            onClick={() => removeUploadingItem(item.id)}
            className={cx(styles.r_da4dbfbc, styles.r_68d3fc19, styles.r_c55dcda2, styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_db1c7bcb, styles.r_d058ca6d, styles.r_72a4c7cd, styles.r_7065497e, styles.r_67d6184a, styles.r_181f3d6c)}>

              x
            </button>
          </div>
        )}

        {remainingCount > 0 && !isUploading &&
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_44ee8ba0, styles.r_65935df5, styles.r_a29b7a64, styles.r_359090c2, styles.r_ceb69a6b),

          itemClassName,
          dragOver ? cx(styles.r_d3b27cd9, styles.r_a8a62ca4) : cx(styles.r_691861bc, styles.r_54720a96, styles.r_0a7c2f87, styles.r_98dc6304)


          )}>

            {kind === 'video' ?
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/icons/upload-video.svg" alt="" className={cx(styles.r_f6fe9024, styles.r_ae2181c7)} /> :

          <Icon name="plus" size={16} className={styles.r_b17d6a13} />
          }
            <span className={cx(styles.r_1dc571a3, styles.r_69335b95)}>{kind === 'image' ? '图片' : '上传视频'}</span>
          </button>
        }
      </div>

      {showCropToggle && kind === 'image' &&
      <label className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_34516836, styles.r_7f691228, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2, styles.r_69335b95)}>
          <input
          type="checkbox"
          checked={cropEnabled}
          onChange={(event) => setCropEnabled(event.target.checked)}
          className={cx(styles.r_7fc7f732, styles.r_bf600f8e, styles.r_07389a77, styles.r_5f66c7c0)} />

          上传后裁剪
        </label>
      }

      {cropSrc &&
      <CropImageDialog src={cropSrc} onCancel={onCropCancel} onConfirm={onCropConfirm} />
      }

      {kind === 'image' && value.length > 0 &&
      <Lightbox images={value} index={lightboxIdx} onClose={() => setLightboxIdx(null)} onChange={setLightboxIdx} />
      }
    </div>);

}