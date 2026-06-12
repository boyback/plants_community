'use client';

import { useRef, useState } from 'react';
import { useChunkUpload } from '@/lib/hooks/useChunkUpload';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import styles from './ImageUploader.module.scss';
import { cx } from '@/lib/style-utils';



interface Props {
  /** 上传成功后回调,传入 CDN URL */
  onUpload: (url: string) => void;
  /** 容器 class */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 文件选中时回调(可用来通知父组件开始上传) */
  onFileSelected?: () => void;
}

export function ImageUploader({
  onUpload,
  className,
  disabled,
  onFileSelected
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, progress, status, error, reset } = useChunkUpload();
  const [dragOver, setDragOver] = useState(false);

  const isUploading = status === 'uploading' || status === 'hashing';

  const handleFile = async (file: File) => {
    const result = await upload(file, 'image');
    if (result) {
      toast.success('图片插入成功');
      onUpload(result.url);
      reset();
    } else if (error) {
      toast.error(error);
    }
  };

  return (
    <div className={cn(cx(styles.r_d89972fe, styles.r_012fbd12), className)}>
      <label
        className={cn(cx(styles.r_64292b1c, styles.r_60fbb771, styles.r_70e33b9a, styles.r_ade815fe, styles.r_34516836, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_44ee8ba0, styles.r_65935df5, styles.r_a29b7a64, styles.r_359090c2, styles.r_ceb69a6b),

        isUploading || disabled ? cx(styles.r_0b8c506a, styles.r_29b733e4) :

        dragOver ? cx(styles.r_d3b27cd9, styles.r_a8a62ca4) : cx(styles.r_691861bc, styles.r_54720a96, styles.r_0a7c2f87, styles.r_98dc6304)


        )}>

        {isUploading ?
        <span className={cx(styles.r_1dc571a3, styles.r_b17d6a13)}>
            {status === 'hashing' ? '校验中…' : `上传中 ${Math.round(progress * 100)}%`}
          </span> :

        <>
            <Icon name="plus" size={16} className={styles.r_b17d6a13} />
            <span className={cx(styles.r_1dc571a3, styles.r_69335b95)}>图片</span>
          </>
        }
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.heic,.heif"
          className={styles.r_99d72c7f}
          disabled={isUploading || disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              onFileSelected?.();
              void handleFile(f);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f && f.type.startsWith('image/')) {
              onFileSelected?.();
              void handleFile(f);
            }
          }} />

      </label>
    </div>);

}