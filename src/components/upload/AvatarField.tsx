'use client';

import { useRef, useState } from 'react';
import { useChunkUpload } from '@/lib/hooks/useChunkUpload';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { CropAvatarDialog } from './CropAvatarDialog';
import { toast } from '@/components/ui/Toast';
import styles from './AvatarField.module.scss';
import { cx } from '@/lib/style-utils';



interface Props {
  value: string;
  onChange: (next: string) => void;
  alt?: string;
  size?: number;
  className?: string;
}

const ACCEPT =
'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif';

/**
 * 头像专用上传组件
 * - 圆形头像点击/拖拽触发文件选择
 * - 选完图先弹「裁剪」对话框,确认后才真上传
 * - GIF 不裁剪(保留动画),直接预览后上传
 * - 支持 HEIC(服务端会转 JPEG)
 */
export function AvatarField({
  value,
  onChange,
  alt = '头像',
  size = 96,
  className
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropIsGif, setCropIsGif] = useState(false);

  const { upload, progress, status, error, abort } = useChunkUpload();
  const busy = status === 'uploading' || status === 'hashing';

  /** 用户选完文件 → 转 dataURL → 弹裁剪 */
  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    // HEIC 浏览器不能本地展示;直接走「不裁剪」路径,直接上传
    const isHeic =
    /\.(heic|heif)$/i.test(file.name) ||
    /^image\/(heic|heif)$/.test(file.type);
    if (isHeic) {
      const r = await upload(file, 'image');
      if (r?.url) {
        onChange(r.url);
        toast.success('头像已更新');
      }
      return;
    }
    // 普通图(含 GIF):本地预览 → 裁剪
    const url = URL.createObjectURL(file);
    setCropIsGif(file.type === 'image/gif' || /\.gif$/i.test(file.name));
    setCropSrc(url);
  };

  /** 裁剪确认 → 把 blob 包成 File 喂上传 */
  const onCropConfirm = async (out: {blob: Blob;preview: string;}) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);

    const ext = out.blob.type === 'image/gif' ? 'gif' : 'png';
    const file = new File([out.blob], `avatar_${Date.now()}.${ext}`, {
      type: out.blob.type || 'image/png'
    });
    const r = await upload(file, 'image');
    URL.revokeObjectURL(out.preview);
    if (r?.url) {
      onChange(r.url);
      toast.success('头像已更新');
    }
  };

  const onCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    void onPickFile(e.dataTransfer.files[0]);
  };

  return (
    <div className={cn(styles.r_bb0c4bfc, className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className={styles.r_99d72c7f}
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          void onPickFile(f);
        }} />


      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        disabled={busy}
        className={cn(cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_f3c543ad, styles.r_67d66567, styles.r_ac204c10, styles.r_0fe7d7d8),

        dragOver && cx(styles.r_44559afb, styles.r_9b87abcd),
        busy && styles.r_1dc351fa,
        !busy && cx(styles.r_34516836, styles.r_961c6c3a)
        )}
        style={{ width: size, height: size }}
        title="点击或拖拽更换头像">

        <Avatar src={value || "/default-avatar.svg"} alt={alt} size={size} />

        <div
          className={cn(cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_7b7df044, styles.r_f3c543ad, styles.r_67d66567, styles.r_ac204c10, styles.r_fd9dca32, styles.r_72a4c7cd, styles.r_7065497e, styles.r_67d6184a),

          !busy && styles.r_181f3d6c
          )}>

          <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_1dc571a3)}>
            <Icon name="plus" size={20} />
            <span>更换头像</span>
          </div>
        </div>

        {busy &&
        <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_f3c543ad, styles.r_67d66567, styles.r_ac204c10, styles.r_f62eee65, styles.r_72a4c7cd)}>
            <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_1dc571a3)}>
              <span className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>
                {Math.round(progress * 100)}%
              </span>
              <span className={cx(styles.r_1dc571a3, styles.r_714816ef)}>
                {status === 'hashing' ? '校验中…' : '上传中…'}
              </span>
            </div>
          </div>
        }
      </button>

      {(busy || error) &&
      <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_d058ca6d)}>
          {busy &&
        <button
          type="button"
          onClick={abort}
          className={cx(styles.r_595fceba, styles.r_f673f4a7)}>

              取消
            </button>
        }
          {error && <span className={styles.r_595fceba}>{error}</span>}
        </div>
      }

      {cropSrc &&
      <CropAvatarDialog
        src={cropSrc}
        isGif={cropIsGif}
        onCancel={onCropCancel}
        onConfirm={onCropConfirm} />

      }
    </div>);

}