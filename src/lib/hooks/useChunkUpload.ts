'use client';

import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/client-api';

/**
 * 文件上传(自动选择直传 / 分片秒传)
 *
 * 行为:
 *   - 文件 ≤ 5MB:走老 /api/upload(单次)
 *   - 文件 > 5MB:走 /api/upload/init|chunk|finish 三步分片
 *   - sha256 秒传:init 命中已有 → 直接拿 url
 *   - 失败重试:分片级别,每片最多重试 3 次
 *   - 进度上报:已传字节 / 总字节
 *
 * 使用:
 *   const { upload, progress, status, error, abort } = useChunkUpload();
 *   const url = await upload(file, 'image');
 */

export interface UploadResult {
  /** UploadFile.id(用于 Live Photo 关联等后续操作) */
  id?: string;
  url: string;
  mime: string;
  size: number;
  kind: 'image' | 'video';
}

export type UploadStatus = 'idle' | 'hashing' | 'uploading' | 'done' | 'error' | 'aborted';

const CHUNK_THRESHOLD = 5 * 1024 * 1024;
const CHUNK_SIZE = 5 * 1024 * 1024;
const SINGLE_CONCURRENCY = 3;
const MAX_RETRY = 3;

export function useChunkUpload() {
  const [progress, setProgress] = useState(0); // 0-1
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setStatus('aborted');
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setStatus('idle');
    setError(null);
  }, []);

  const upload = useCallback(
    async (file: File, kind: 'image' | 'video'): Promise<UploadResult | null> => {
      reset();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        // —— 图片最小尺寸校验(防极端小图)——
        // 跳过 HEIC(浏览器无法本地预览,服务端会转 JPEG 后再上传到云)
        if (
          kind === 'image' &&
          !/\.(heic|heif)$/i.test(file.name) &&
          !/^image\/(heic|heif)$/.test(file.type)
        ) {
          const dim = await readImageDimensions(file).catch(() => null);
          if (dim && (dim.width < 320 || dim.height < 320)) {
            setStatus('error');
            setError(
              `图片尺寸过小(${dim.width}x${dim.height}),最小要求 320x320`
            );
            return null;
          }
        }

        // 走老接口的小文件路径
        if (file.size <= CHUNK_THRESHOLD) {
          setStatus('uploading');
          const fd = new FormData();
          fd.append('file', file);
          // 直接 fetch(/api/upload 现有)
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: fd,
            signal: ac.signal,
          });
          const json = await res.json();
          console.log(json);
          if (!res.ok || !json.ok) {
            throw new Error(json?.error?.message ?? '上传失败');
          }
          setProgress(1);
          setStatus('done');
          return {
            id: json.data.id,
            url: json.data.url,
            mime: json.data.mime ?? file.type,
            size: file.size,
            kind,
          };
        }

        // 大文件:计算 sha256
        setStatus('hashing');
        const sha256 = await sha256OfFile(file, (p) => setProgress(p * 0.05));

        // init
        setStatus('uploading');
        const init = await api.post<{
          instant: boolean;
          id?: string;
          url?: string;
          mime?: string;
          size?: number;
          uploadId?: string;
          chunkSize?: number;
          totalChunks?: number;
          uploadedIndices?: number[];
          globalHashUrl?: string | null;
        }>('/api/upload/init', {
          sha256,
          size: file.size,
          mime: file.type,
          filename: file.name,
          kind,
        });

        if (init.instant && init.url) {
          setProgress(1);
          setStatus('done');
          return {
            id: init.id,
            url: init.url,
            mime: init.mime ?? file.type,
            size: init.size ?? file.size,
            kind,
          };
        }

        // 分片上传
        const totalChunks = init.totalChunks!;
        const uploadId = init.uploadId!;
        const uploadedSet = new Set(init.uploadedIndices ?? []);
        const totalBytes = file.size;
        let uploadedBytes = uploadedSet.size * CHUNK_SIZE;
        if (uploadedBytes > totalBytes) uploadedBytes = totalBytes;

        const tasks: number[] = [];
        for (let i = 0; i < totalChunks; i++) {
          if (!uploadedSet.has(i)) tasks.push(i);
        }

        const updateProgress = () => {
          // 已传字节:resumed + 已成功的本次分片
          const ratio = Math.min(uploadedBytes / totalBytes, 1);
          // hash 阶段已占 0-5%;上传阶段 5-100%
          setProgress(0.05 + ratio * 0.95);
        };
        updateProgress();

        // 并发跑分片(简单池)
        let cursor = 0;
        const runOne = async (): Promise<void> => {
          while (true) {
            if (ac.signal.aborted) return;
            const idx = cursor++;
            if (idx >= tasks.length) return;
            const chunkIndex = tasks[idx]!;
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, totalBytes);
            const blob = file.slice(start, end);

            let attempts = 0;
            while (true) {
              attempts++;
              try {
                const fd = new FormData();
                fd.append('uploadId', uploadId);
                fd.append('index', String(chunkIndex));
                fd.append('chunk', blob);
                const res = await fetch('/api/upload/chunk', {
                  method: 'POST',
                  body: fd,
                  signal: ac.signal,
                });
                if (!res.ok) {
                  const j = await res.json().catch(() => null);
                  throw new Error(j?.error?.message ?? `chunk ${chunkIndex} HTTP ${res.status}`);
                }
                uploadedBytes += end - start;
                updateProgress();
                break;
              } catch (e) {
                if (ac.signal.aborted) return;
                if (attempts >= MAX_RETRY) throw e;
                // 指数退避
                await new Promise((r) => setTimeout(r, 500 * 2 ** attempts));
              }
            }
          }
        };

        await Promise.all(
          Array.from({ length: SINGLE_CONCURRENCY }).map(() => runOne())
        );

        if (ac.signal.aborted) {
          setStatus('aborted');
          return null;
        }

        // finish
        const fin = await api.post<UploadResult>('/api/upload/finish', {
          uploadId,
          sha256,
          totalChunks,
          mime: file.type,
          filename: file.name,
        });
        setProgress(1);
        setStatus('done');
        return fin;
      } catch (e: unknown) {
        if (ac.signal.aborted) {
          setStatus('aborted');
          return null;
        }
        const msg = e instanceof Error ? e.message : '上传失败';
        setError(msg);
        setStatus('error');
        return null;
      } finally {
        abortRef.current = null;
      }
    },
    [reset]
  );

  return { upload, progress, status, error, abort, reset };
}

// 浏览器端 sha256:用 SubtleCrypto + 流式读取
async function sha256OfFile(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<string> {
  if (!crypto.subtle) {
    // 兜底:加载 spark-md5 或者警告
    throw new Error('当前浏览器不支持 SHA256');
  }
  const chunkSize = 4 * 1024 * 1024;
  // 单次散列:把整个文件读成 ArrayBuffer 再 digest(适合 ≤ ~200MB,内存可接受)
  // 大于此尺寸的视频 100MB 上限内,够用
  const chunks: ArrayBuffer[] = [];
  let offset = 0;
  while (offset < file.size) {
    const slice = file.slice(offset, offset + chunkSize);
    const buf = await slice.arrayBuffer();
    chunks.push(buf);
    offset += chunkSize;
    onProgress?.(Math.min(offset / file.size, 1));
  }
  // 拼接
  const total = chunks.reduce((s, c) => s + c.byteLength, 0);
  const merged = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) {
    merged.set(new Uint8Array(c), p);
    p += c.byteLength;
  }
  const digest = await crypto.subtle.digest('SHA-256', merged);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 读取图片自然尺寸(用 createObjectURL + Image)
 * GIF 取首帧尺寸,够用
 */
async function readImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片读取失败'));
    };
    img.src = url;
  });
}
