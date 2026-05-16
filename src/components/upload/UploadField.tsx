'use client';

import { useRef, useState, useCallback } from 'react';
import { useChunkUpload } from '@/lib/hooks/useChunkUpload';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { CropImageDialog } from './CropImageDialog';
import { Lightbox } from '@/components/ui/Lightbox';

export type UploadKind = 'image' | 'video';

interface Props {
  kind: UploadKind;
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  allowExternal?: boolean;
  className?: string;
  /** 是否显示裁剪开关（默认 false） */
  showCropToggle?: boolean;
  /** 简化模式：只显示文件上传，隐藏模式切换（默认 false） */
  simpleMode?: boolean;
}

type Mode = 'file' | 'url' | 'live';

const ACCEPT: Record<UploadKind, string> = {
  image:
    'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif',
  video: 'video/mp4,video/webm,video/quicktime',
};

const ACCEPT_LIVE = '.heic,.heif,.mov,image/heic,image/heif,video/quicktime';

function basename(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

/** 单张图片的上传状态 */
interface UploadingItem {
  id: string;
  file: File;
  localUrl: string;
  progress: number;
  status: 'hashing' | 'uploading' | 'uploaded' | 'error';
  error?: string;
  resultUrl?: string;
}

export function UploadField({
  kind,
  value,
  onChange,
  max = kind === 'image' ? 999 : 1,
  allowExternal = true,
  className,
  showCropToggle = false,
  simpleMode = false,
}: Props) {
  const [mode, setMode] = useState<Mode>('file');
  const [urlInput, setUrlInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const liveRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // 上传队列（单图独立进度）
  const [uploading, setUploading] = useState<UploadingItem[]>([]);

  // 裁剪相关
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropQueue, setCropQueue] = useState<string[]>([]);

  // Lightbox
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const canUseLive =
    kind === 'image' &&
    (user?.role === 'admin' || user?.role === 'moderator');

  const remaining = Math.max(0, max - value.length);

  const removeAt = (i: number) => onChange(value.filter((_, k) => k !== i));

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

  // 单文件上传（独立进度追踪）
  const uploadSingle = useCallback(
    async (file: File): Promise<{ url: string; id: string } | null> => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const localUrl = URL.createObjectURL(file);

      const item: UploadingItem = {
        id,
        file,
        localUrl,
        progress: 0,
        status: 'hashing',
      };
      setUploading((prev) => [...prev, item]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const resp = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!resp.ok) throw new Error('上传失败');
        const data = await resp.json();
        const url = data.url || data.data?.url;

        setUploading((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: 'uploaded', resultUrl: url, progress: 100 } : u
          )
        );

        return { url, id };
      } catch (e) {
        setUploading((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, status: 'error', error: e instanceof Error ? e.message : '上传失败' }
              : u
          )
        );
        return null;
      }
    },
    []
  );

  // 重试单个上传
  const retryUpload = useCallback(
    async (item: UploadingItem) => {
      setUploading((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, status: 'hashing', progress: 0, error: undefined } : u
        )
      );
      const result = await uploadSingle(item.file);
      if (result) {
        if (cropEnabled) {
          setCropQueue((prev) => [...prev, result.url]);
        } else {
          onChange([...value, result.url]);
        }
        removeUploading(result.id);
      }
    },
    [uploadSingle, cropEnabled, value, onChange]
  );

  // 从上传队列移除
  const removeUploading = (id: string) => {
    setUploading((prev) => prev.filter((u) => u.id !== id));
  };

  // 处理文件选择
  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    for (const f of list) {
      if (value.length + uploading.length >= max) break;

      if (kind === 'image' && !f.type.startsWith('image/')) continue;
      if (kind === 'video' && !f.type.startsWith('video/')) continue;

      const result = await uploadSingle(f);
      if (result) {
        if (cropEnabled) {
          // 上传成功后弹出裁剪
          setCropQueue((prev) => [...prev, result.url]);
        } else {
          // 直接添加到列表
          onChange([...value, result.url]);
        }
        // 从上传队列中移除已完成的项
        removeUploading(result.id);
      }
    }
  };

  // 裁剪确认
  const onCropConfirm = (croppedUrl: string) => {
    onChange([...value, croppedUrl]);
    // 处理下一个裁剪队列
    setCropQueue((prev) => prev.slice(1));
    setCropSrc(null);
  };

  // 裁剪取消
  const onCropCancel = () => {
    // 跳过当前裁剪，处理下一个
    setCropQueue((prev) => prev.slice(1));
    setCropSrc(null);
  };

  // 当 cropQueue 变化时，弹出第一个
  if (cropQueue.length > 0 && !cropSrc) {
    setCropSrc(cropQueue[0]);
  }

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

    const imgFormData = new FormData();
    imgFormData.append('file', heic);
    const imgResp = await fetch('/api/upload', { method: 'POST', body: imgFormData });
    if (!imgResp.ok) return;
    const imgData = await imgResp.json();
    const imgUrl = imgData.url || imgData.data?.url;
    if (!imgUrl) return;

    const movFormData = new FormData();
    movFormData.append('file', mov);
    const movResp = await fetch('/api/upload', { method: 'POST', body: movFormData });
    if (!movResp.ok) return;
    const movData = await movResp.json();
    const movUrl = movData.url || movData.data?.url;

    if (movUrl && imgData.id && movData.id) {
      try {
        await fetch('/api/upload/link-live-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageId: imgData.id,
            movId: movData.id,
          }),
        });
      } catch {
        // ignore
      }
    }
    onChange([...value, imgUrl]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const busy = uploading.some((u) => u.status === 'uploading' || u.status === 'hashing');

  return (
    <div className={cn('space-y-2', className)}>
      {/* mode tab - 简化模式下隐藏 */}
      {/* 暂时注释掉模式切换功能
      {!simpleMode && (
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
              title="管理员专用 · 上传 iOS Live Photo"
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
      )}
      */}

      {/* 文件上传区 - 所有图片在同一个网格 */}
      {(simpleMode || mode === 'file') && (
        <>
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
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 p-2 transition-colors',
              dragOver && 'ring-2 ring-leaf-400 bg-leaf-50/40'
            )}
          >
            {/* 已确认的图片 */}
            {value.map((u, i) => (
              <div key={`done-${i}`} className="group relative aspect-square overflow-hidden">
                {kind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u}
                    alt=""
                    className="h-full w-full cursor-pointer object-cover hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxIdx(i)}
                  />
                ) : (
                  <video
                    src={u}
                    controls
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="移除"
                >
                  ×
                </button>
              </div>
            ))}

            {/* 上传中的图片 */}
            {uploading.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden bg-leaf-50"
              >
                <img
                  src={item.localUrl}
                  alt=""
                  className={cn(
                    'h-full w-full object-cover',
                    item.status === 'uploaded' && 'opacity-60'
                  )}
                />
                {/* 进度覆盖层 */}
                {item.status !== 'uploaded' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                    {item.status === 'hashing' && (
                      <div className="text-[10px] text-white">校验中…</div>
                    )}
                    {item.status === 'uploading' && (
                      <>
                        <div className="mb-1 h-1 w-16 overflow-hidden rounded-full bg-white/30">
                          <div
                            className="h-full bg-leaf-400 transition-[width]"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-white">{Math.round(item.progress)}%</div>
                      </>
                    )}
                    {item.status === 'error' && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-[10px] text-rose-300">失败</div>
                        <button type="button" onClick={() => retryUpload(item)} className="text-[10px] text-white underline">
                          重试
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* 上传完成 - 裁剪按钮 */}
                {item.status === 'uploaded' && (
                  <div className="absolute right-1 top-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.resultUrl) {
                          setCropQueue((prev) => [...prev, item.resultUrl!]);
                          removeUploading(item.id);
                        }
                      }}
                      className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-[10px] text-white hover:bg-black/80"
                      title="裁剪"
                    >
                      ✂️
                    </button>
                  </div>
                )}
                {/* 移除按钮 */}
                {item.status !== 'uploaded' && (
                  <button
                    type="button"
                    onClick={() => removeUploading(item.id)}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {/* 上传按钮 - 在最后 */}
            {remaining > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
                }}
                className={cn(
                  'flex aspect-square flex-col items-center justify-center gap-1 border-2 border-dashed text-xs transition-colors',
                  dragOver
                    ? 'border-leaf-500 bg-leaf-50/60'
                    : 'border-leaf-200 bg-leaf-50/30 hover:border-leaf-400 hover:bg-leaf-50/50',
                  busy && 'opacity-40 cursor-not-allowed'
                )}
              >
                <Icon name="plus" size={16} className="text-leaf-600" />
                <span className="text-[10px] text-leaf-700/70">
                  {kind === 'image' ? '图片' : '视频'}
                </span>
              </button>
            )}
          </div>
          {/* 裁剪开关 */}
          {showCropToggle && kind === 'image' && (
            <label className="flex items-center gap-2 text-xs text-leaf-700/70 mt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={cropEnabled}
                onChange={(e) => setCropEnabled(e.target.checked)}
                className="h-3.5 w-3.5 accent-leaf-500 rounded"
              />
              上传后裁剪
            </label>
          )}
        </>
      )}

      {/* 裁剪对话框 */}
      {!simpleMode && mode === 'url' && (
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

      {/* 实况图上传 - 正方形网格 */}
      {!simpleMode && mode === 'live' && (
        <>
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
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {/* 上传按钮 */}
            {remaining > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => liveRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 border-2 border-dashed border-leaf-200 bg-leaf-50/30 text-xs transition-colors hover:border-leaf-400 hover:bg-leaf-50/50"
              >
                <Icon name="plus" size={16} className="text-leaf-600" />
                <span className="text-[10px] text-leaf-700/70">实况图</span>
              </button>
            )}
          </div>
          <div className="text-[10px] text-leaf-700/60">
            同时选 <b>1 个 .HEIC</b> + <b>1 个同名 .MOV</b>(Cmd/Ctrl + 点击多选)
          </div>
        </>
      )}

      {/* 裁剪对话框 */}
      {cropSrc && (
        <CropImageDialog
          src={cropSrc}
          onCancel={onCropCancel}
          onConfirm={onCropConfirm}
        />
      )}

      {/* Lightbox */}
      {kind === 'image' && value.length > 0 && (
        <Lightbox
          images={value}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onChange={setLightboxIdx}
        />
      )}
    </div>
  );
}
