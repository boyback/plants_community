'use client';

import { useRef, useState } from 'react';
import { useChunkUpload } from '@/lib/hooks/useChunkUpload';
import { useAuth } from '@/context/AuthContext';
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

/** 子模式:普通文件 / 外链 / 实况(仅 admin) */
type Mode = 'file' | 'url' | 'live';

const ACCEPT: Record<UploadKind, string> = {
  // 普通图片不再接受 .mov(避免误传单个 MOV 当图片);
  // HEIC 仍允许(服务端会自动转 JPEG)
  image:
    'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif',
  video: 'video/mp4,video/webm,video/quicktime',
};

/** 实况图模式:必须同时选 1 HEIC + 1 MOV */
const ACCEPT_LIVE = '.heic,.heif,.mov,image/heic,image/heif,video/quicktime';

function basename(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

export function UploadField({
  kind,
  value,
  onChange,
  max = kind === 'image' ? 9 : 1,
  allowExternal = true,
  className,
}: Props) {
  const [mode, setMode] = useState<Mode>('file');
  const [urlInput, setUrlInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const liveRef = useRef<HTMLInputElement>(null);
  const { upload, progress, status, error, abort } = useChunkUpload();
  const { user } = useAuth();
  // 仅管理员/版主可见「实况」模式(普通用户传 Live Photo 太复杂,留给运营)
  const canUseLive =
    kind === 'image' &&
    (user?.role === 'admin' || user?.role === 'moderator');

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

    const next = [...value];
    let usedSlots = 0;

    for (const f of list) {
      if (value.length + usedSlots >= max) break;
      // 普通模式:不再处理 .mov(避免误传单个 mov 当图传)
      // 单独的 .heic 服务端会自动转 JPEG
      const r = await upload(f, kind);
      if (r?.url) {
        next.push(r.url);
        usedSlots++;
      }
    }

    onChange(next);
  };

  /** 实况图专用上传:严格校验 1 HEIC + 1 MOV 同名 */
  const handleLiveFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length !== 2) {
      alert('实况图必须同时选择 2 个文件:1 张 .HEIC 和 1 个同名 .MOV');
      return;
    }
    const heic = list.find((f) => /\.(heic|heif)$/i.test(f.name));
    const mov = list.find((f) => /\.mov$/i.test(f.name));
    if (!heic || !mov) {
      alert('需要 1 张 .HEIC + 1 个 .MOV(配套视频),目前选中的两个文件类型不对');
      return;
    }
    if (basename(heic.name) !== basename(mov.name)) {
      alert(
        `两个文件需同名才能配对为实况图:\n${heic.name}\n${mov.name}\n请确认它们来自同一张 Live Photo(导出时保留所有数据)`
      );
      return;
    }
    if (value.length >= max) {
      alert('已达图片上限');
      return;
    }

    const imgRes = await upload(heic, 'image');
    if (!imgRes?.url) return;
    const movRes = await upload(mov, 'video');
    if (movRes?.url && imgRes.id && movRes.id) {
      try {
        await fetch('/api/upload/link-live-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageId: imgRes.id,
            movId: movRes.id,
          }),
        });
      } catch {
        // ignore
      }
    }
    onChange([...value, imgRes.url]);
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
        {canUseLive && (
          <button
            type="button"
            onClick={() => setMode('live')}
            className={cn(
              'rounded-full px-3 py-1 transition-colors',
              mode === 'live'
                ? 'bg-leaf-500 text-white'
                : 'bg-leaf-50 text-leaf-700 hover:bg-leaf-100'
            )}
            title="管理员专用 · 上传 iOS Live Photo(同时选 1 HEIC + 1 同名 MOV)"
          >
            📸 实况图
          </button>
        )}
        <span className="ml-auto text-leaf-700/60">
          {value.length}/{max}
          {kind === 'video' && (
            <span className="ml-1 text-amber-600">· 视频限大会员</span>
          )}
        </span>
      </div>

      {/* 文件 / URL / 实况 三种渲染分支 */}
      {mode === 'file' && (
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
            multiple={kind === 'image'}
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
              ? '支持 jpg/png/webp/gif/heic,单张 ≤ 10MB,可拖拽'
              : '支持 mp4/webm/mov,≤ 100MB,可拖拽'}
          </div>
          <UploadProgress
            busy={busy}
            error={error}
            status={status}
            progress={progress}
            abort={abort}
          />
        </div>
      )}

      {mode === 'url' && (
        <div className="space-y-2">
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
          {allowExternal && (
            <div className="text-[10px] text-amber-700/80">
              ⚠️ 包含外链的帖子将进入审核队列,通过后才会显示
            </div>
          )}
        </div>
      )}

      {mode === 'live' && (
        <div className="rounded-xl border-2 border-dashed border-leaf-200 bg-leaf-50/30 p-4 text-center text-xs">
          <input
            ref={liveRef}
            type="file"
            accept={ACCEPT_LIVE}
            multiple
            className="hidden"
            disabled={busy || remaining === 0}
            onChange={(e) => {
              if (e.target.files) void handleLiveFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={busy || remaining === 0}
            onClick={() => liveRef.current?.click()}
            className="btn-outline !text-xs"
          >
            <Icon name="plus" size={12} />
            选择实况图(同时选 2 个文件)
          </button>
          <div className="mt-2 space-y-1 text-[10px] text-leaf-700/70">
            <div>
              📌 同时选 <b>1 个 .HEIC</b> + <b>1 个同名 .MOV</b>(Cmd/Ctrl + 点击多选)
            </div>
            <div className="text-amber-700/80">
              ⚠️ 仅管理员可见 · 用于运营级 Live Photo 上传 · 文件名前缀必须一致
            </div>
            <div className="text-leaf-700/60">
              示例:IMG_2968.HEIC + IMG_2968.MOV
            </div>
          </div>
          <UploadProgress
            busy={busy}
            error={error}
            status={status}
            progress={progress}
            abort={abort}
          />
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

function UploadProgress({
  busy,
  error,
  status,
  progress,
  abort,
}: {
  busy: boolean;
  error: string | null;
  status: string;
  progress: number;
  abort: () => void;
}) {
  if (!busy && !error) return null;
  return (
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
  );
}
