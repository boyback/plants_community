'use client';

import { useRef, useState } from 'react';
import { useChunkUpload } from '@/lib/hooks/useChunkUpload';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (next: string) => void;
  alt?: string;
  size?: number;
  className?: string;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif';

/**
 * 头像专用上传组件
 * - 整个圆形头像就是触发区,点击或拖拽都能选图
 * - 上传完成后立刻替换显示
 * - 支持 HEIC(服务端转 JPEG)
 * - 不支持外链 / 实况 / 多选(头像专用极简)
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
  const [toast, setToast] = useState<string | null>(null);
  const { upload, progress, status, error, abort } = useChunkUpload();

  const busy = status === 'uploading' || status === 'hashing';

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const r = await upload(file, 'image');
    if (r?.url) {
      onChange(r.url);
      showToast('✅ 已更新');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    void handleFile(e.dataTransfer.files[0]);
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
          void handleFile(f);
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

        {/* hover 蒙层 */}
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

        {/* 上传中:进度环 */}
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

      {/* 状态行(取消 / 错误) */}
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

      {toast && (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-800 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
