/**
 * 大文件上传 — 初始化
 *
 *   POST /api/upload/init
 *   body: { sha256, size, mime, filename, kind: 'image'|'video' }
 *
 * 返回:
 *   - 已存在(秒传):{ instant: true, url }
 *   - 新文件:{ instant: false, uploadId, totalChunks, chunkSize, uploadedIndices }
 */
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser, isVipActive } from '@/lib/auth';
import {
  ALLOWED_IMAGE_MIME,
  ALLOWED_VIDEO_MIME,
  CHUNK_SIZE,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  classifyMime,
  getChunkDir,
} from '@/lib/upload';

export const dynamic = 'force-dynamic';

const Body = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  size: z.number().int().positive(),
  mime: z.string(),
  filename: z.string().max(200),
  kind: z.enum(['image', 'video']),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());

  // 校验 mime 与 kind 一致 + 大小限制
  const realKind = classifyMime(body.mime);
  if (!realKind || realKind !== body.kind) {
    return fail(400, '文件类型不被允许');
  }
  if (realKind === 'image') {
    if (!ALLOWED_IMAGE_MIME.includes(body.mime)) {
      return fail(400, '仅支持 jpg / png / webp / gif 图片');
    }
    if (body.size > MAX_IMAGE_SIZE) {
      return fail(
        400,
        `图片过大,最大 ${Math.round(MAX_IMAGE_SIZE / 1024 / 1024)} MB`
      );
    }
  } else {
    if (!ALLOWED_VIDEO_MIME.includes(body.mime)) {
      return fail(400, '仅支持 mp4 / webm / mov 视频');
    }
    if (body.size > MAX_VIDEO_SIZE) {
      return fail(
        400,
        `视频过大,最大 ${Math.round(MAX_VIDEO_SIZE / 1024 / 1024)} MB`
      );
    }
    if (!isVipActive(me)) {
      return fail(403, '视频上传仅限大会员');
    }
  }

  // 秒传:同一上传者已传过此 sha256 直接复用
  const existing = await prisma.uploadFile.findUnique({
    where: {
      uploaderId_sha256: { uploaderId: me.id, sha256: body.sha256 },
    },
  });
  if (existing) {
    return {
      instant: true,
      id: existing.id,
      url: existing.url,
      mime: existing.mime,
      size: existing.size,
    };
  }

  // 全局秒传:其他人传过的,只复用 url(不创建新行,这里我们安全起见仍给当前用户登记)
  const sameHash = await prisma.uploadFile.findFirst({
    where: { sha256: body.sha256 },
    orderBy: { createdAt: 'asc' },
  });

  // 创建 uploadId(纯文件 sha256 + uploader 拼,避免冲突)
  const uploadId = `${me.id}_${body.sha256}`;
  const totalChunks = Math.ceil(body.size / CHUNK_SIZE);

  // 已传分片扫描(用户上次传到一半)
  const tmpDir = path.join(getChunkDir(), uploadId);
  let uploadedIndices: number[] = [];
  try {
    await fs.mkdir(tmpDir, { recursive: true });
    const files = await fs.readdir(tmpDir);
    uploadedIndices = files
      .filter((f) => /^\d+$/.test(f))
      .map((f) => Number(f));
  } catch {
    // ignore
  }

  return {
    instant: false,
    uploadId,
    chunkSize: CHUNK_SIZE,
    totalChunks,
    uploadedIndices,
    /** 全局已有同 hash 的 url,前端在所有分片传完前可以提示「已找到相同文件,可直接秒传」 */
    globalHashUrl: sameHash?.url ?? null,
  };
});
