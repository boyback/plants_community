'use client';

import { useRef, useState } from 'react';
import { useChunkUpload } from '@/lib/hooks/useChunkUpload';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

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
  onFileSelected,
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
    <div className={cn('relative shrink-0', className)}>
      <label
        className={cn(
          'group flex h-[95px] w-[95px] cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed text-xs transition-colors',
          isUploading || disabled
            ? 'opacity-50 cursor-not-allowed'
            : dragOver
            ? 'border-leaf-500 bg-leaf-50/60'
            : 'border-leaf-200 bg-leaf-50/30 hover:border-leaf-400 hover:bg-leaf-50/50',
        )}
      >
        {isUploading ? (
          <span className="text-[10px] text-leaf-600">
            {status === 'hashing' ? '校验中…' : `上传中 ${Math.round(progress * 100)}%`}
          </span>
        ) : (
          <>
            <Icon name="plus" size={16} className="text-leaf-600" />
            <span className="text-[10px] text-leaf-700/70">图片</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,.heic,.heif"
          className="hidden"
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
          }}
        />
      </label>
    </div>
  );
}
