'use client';

import { useRef, useState } from 'react';
import { useChunkUpload } from '@/lib/hooks/useChunkUpload';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { CropAvatarDialog } from './CropAvatarDialog';
import { toast } from '@/components/ui/Toast';

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
  className,
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
  const onCropConfirm = async (out: { blob: Blob; preview: string }) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);

    const ext = out.blob.type === 'image/gif' ? 'gif' : 'png';
    const file = new File([out.blob], `avatar_${Date.now()}.${ext}`, {
      type: out.blob.type || 'image/png',
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
    <div className={cn('inline-block', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          void onPickFile(f);
        }}
      />

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
        className={cn(
          'group relative grid place-items-center rounded-full transition-all',
          dragOver && 'ring-4 ring-leaf-300',
          busy && 'cursor-progress',
          !busy && 'cursor-pointer hover:opacity-90'
        )}
        style={{ width: size, height: size }}
        title="点击或拖拽更换头像"
      >
        <Avatar src={value || '/default-avatar.svg'} alt={alt} size={size} />

        <div
          className={cn(
            'pointer-events-none absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white opacity-0 transition-opacity',
            !busy && 'group-hover:opacity-100'
          )}
        >
          <div className="flex flex-col items-center gap-1 text-[10px]">
            <Icon name="plus" size={20} />
            <span>更换头像</span>
          </div>
        </div>

        {busy && (
          <div className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-white">
            <div className="flex flex-col items-center gap-1 text-[10px]">
              <span className="text-sm font-semibold">
                {Math.round(progress * 100)}%
              </span>
              <span className="text-[10px] opacity-80">
                {status === 'hashing' ? '校验中…' : '上传中…'}
              </span>
            </div>
          </div>
        )}
      </button>

      {(busy || error) && (
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          {busy && (
            <button
              type="button"
              onClick={abort}
              className="text-rose-600 hover:underline"
            >
              取消
            </button>
          )}
          {error && <span className="text-rose-600">{error}</span>}
        </div>
      )}

      {cropSrc && (
        <CropAvatarDialog
          src={cropSrc}
          isGif={cropIsGif}
          onCancel={onCropCancel}
          onConfirm={onCropConfirm}
        />
      )}
    </div>
  );
}
