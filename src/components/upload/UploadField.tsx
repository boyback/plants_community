'use client';

import { useRef, useState } from 'react';
import { useChunkUpload } from '@/lib/hooks/useChunkUpload';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export type UploadKind = 'image' | 'video';

interface Props {
  kind: UploadKind;
  /** 已经选择/上传完成的 URL 列表(图片可多张,视频只 1 个) */
  value: string[];
  onChange: (next: string[]) => void;
  /** 图片可上传多少张,视频默认 1 */
  max?: number;
  /** 是否允许 URL 外链(默认 true) */
  allowExternal?: boolean;
  className?: string;
}

const ACCEPT: Record<UploadKind, string> = {
  image: 'image/jpeg,image/png,image/webp,image/gif',
  video: 'video/mp4,video/webm,video/quicktime',
};

export function UploadField({
  kind,
  value,
  onChange,
  max = kind === 'image' ? 9 : 1,
  allowExternal = true,
  className,
}: Props) {
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, progress, status, error, abort } = useChunkUpload();

  const remaining = Math.max(0, max - value.length);

  const removeAt = (i: number) =>
    onChange(value.filter((_, k) => k !== i));

  const pushUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    if (value.includes(u)) {
      setUrlInput('');
      return;
    }
    if (value.length >= max) return;
    onChange([...value, u]);
    setUrlInput('');
  };

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    // 视频只能 1 个;图片受 max 限
    const accept = list.slice(0, remaining || 1);
    const next = [...value];
    for (const f of accept) {
      const r = await upload(f, kind);
      if (r?.url) next.push(r.url);
    }
    onChange(next);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (status === 'uploading' || status === 'hashing') return;
    if (e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const busy = status === 'uploading' || status === 'hashing';

  return (
    <div className={cn('space-y-2', className)}>
      {/* mode tab */}
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={cn(
            'rounded-full px-3 py-1 transition-colors',
            mode === 'file'
              ? 'bg-leaf-500 text-white'
              : 'bg-leaf-50 text-leaf-700 hover:bg-leaf-100'
          )}
        >
          📁 上传文件
        </button>
        {allowExternal && (
          <button
            type="button"
            onClick={() => setMode('url')}
            className={cn(
              'rounded-full px-3 py-1 transition-colors',
              mode === 'url'
                ? 'bg-leaf-500 text-white'
                : 'bg-leaf-50 text-leaf-700 hover:bg-leaf-100'
            )}
          >
            🔗 添加外链
          </button>
        )}
        <span className="ml-auto text-leaf-700/60">
          {value.length}/{max}
          {kind === 'video' && (
            <span className="ml-1 text-amber-600">· 视频限大会员</span>
          )}
        </span>
      </div>

      {/* 文件 / URL 模式 */}
      {mode === 'file' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            'rounded-xl border-2 border-dashed p-4 text-center text-xs transition-colors',
            dragOver
              ? 'border-leaf-500 bg-leaf-50/60'
              : 'border-leaf-200 bg-leaf-50/30 hover:border-leaf-300'
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT[kind]}
            multiple={kind === 'image' && remaining > 1}
            className="hidden"
            disabled={busy || remaining === 0}
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={busy || remaining === 0}
            onClick={() => fileRef.current?.click()}
            className="btn-outline !text-xs"
          >
            <Icon name="plus" size={12} />
            {kind === 'image' ? '选择图片' : '选择视频'}
          </button>
          <div className="mt-2 text-[10px] text-leaf-700/70">
            {kind === 'image'
              ? '支持 jpg/png/webp/gif,单张 ≤ 10MB,可拖拽'
              : '支持 mp4/webm/mov,≤ 100MB,可拖拽'}
          </div>
          {(busy || error) && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-leaf-100">
                <div
                  className="h-full bg-leaf-500 transition-[width]"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-leaf-700/70">
                  {status === 'hashing'
                    ? '校验中…'
                    : status === 'uploading'
                    ? `上传中 ${Math.round(progress * 100)}%`
                    : status === 'aborted'
                    ? '已取消'
                    : status === 'error'
                    ? error ?? '失败'
                    : ''}
                </span>
                {busy && (
                  <button
                    type="button"
                    onClick={abort}
                    className="text-rose-600 hover:underline"
                  >
                    取消
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder={
              kind === 'image'
                ? '粘贴图片 URL,如 https://...png'
                : '粘贴视频 URL,如 https://...mp4'
            }
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                pushUrl();
              }
            }}
            disabled={remaining === 0}
          />
          <button
            type="button"
            className="btn-outline !px-3"
            onClick={pushUrl}
            disabled={remaining === 0}
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
      )}

      {mode === 'url' && allowExternal && (
        <div className="text-[10px] text-amber-700/80">
          ⚠️ 包含外链的帖子将进入审核队列,通过后才会显示
        </div>
      )}

      {/* 已选预览 */}
      {value.length > 0 && (
        <div
          className={cn(
            'grid gap-2',
            kind === 'image' ? 'grid-cols-3 md:grid-cols-6' : 'grid-cols-1'
          )}
        >
          {value.map((u, i) => (
            <div key={i} className="group relative">
              {kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ) : (
                <video
                  src={u}
                  controls
                  preload="metadata"
                  className="block w-full rounded-lg"
                />
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white hover:bg-black/80"
                title="移除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
