/**
 * 大文件上传 — 完成合并
 *
 *   POST /api/upload/finish
 *   body: { uploadId, sha256, totalChunks, mime, filename }
 *
 * 行为:
 *   1) 按顺序合并分片到最终 key
 *   2) 校验合并后 sha256 == 客户端给的 sha256
 *   3) 写入 UploadFile 表,清理分片
 *   4) 返回最终 url
 */
import { z } from 'zod';
import { promises as fs } from 'fs';
import { createWriteStream, createReadStream } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import {
  classifyMime,
  getChunkDir,
  getExtForMime,
  getUploadDriver,
  sha256OfFile,
} from '@/lib/upload';

export const dynamic = 'force-dynamic';

const Body = z.object({
  uploadId: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  totalChunks: z.number().int().positive(),
  mime: z.string(),
  filename: z.string().max(200),
});

async function pipeFile(src: string, ws: NodeJS.WritableStream): Promise<void> {
  return new Promise((resolve, reject) => {
    const rs = createReadStream(src);
    rs.on('error', reject);
    rs.on('end', () => resolve());
    rs.pipe(ws, { end: false });
  });
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());

  if (!body.uploadId.startsWith(`${me.id}_`)) {
    return fail(403, '无权操作此 uploadId');
  }
  const realKind = classifyMime(body.mime);
  if (!realKind) return fail(400, '文件类型不被允许');

  const tmpDir = path.join(getChunkDir(), body.uploadId);
  // 检查所有分片都已经存在
  const missing: number[] = [];
  for (let i = 0; i < body.totalChunks; i++) {
    try {
      await fs.access(path.join(tmpDir, String(i)));
    } catch {
      missing.push(i);
    }
  }
  if (missing.length > 0) {
    return fail(400, `缺少分片:${missing.slice(0, 3).join(',')}…`);
  }

  // 合并到 final key
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ext = getExtForMime(body.mime);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const key = `${me.id}/${ym}/${id}.${ext}`;
  const driver = getUploadDriver();
  const finalPath = driver.resolvePath
    ? driver.resolvePath(key)
    : path.join(process.cwd(), 'public', 'uploads', key);

  await fs.mkdir(path.dirname(finalPath), { recursive: true });
  const ws = createWriteStream(finalPath);
  let totalSize = 0;
  for (let i = 0; i < body.totalChunks; i++) {
    const cp = path.join(tmpDir, String(i));
    const stat = await fs.stat(cp);
    totalSize += stat.size;
    await pipeFile(cp, ws);
  }
  await new Promise<void>((resolve, reject) => {
    ws.on('finish', () => resolve());
    ws.on('error', reject);
    ws.end();
  });

  // 校验 hash
  const actualHash = await sha256OfFile(finalPath);
  if (actualHash !== body.sha256) {
    await fs.unlink(finalPath).catch(() => null);
    return fail(400, '文件校验失败:hash 不一致');
  }

  // 写表(秒传去重 unique 上)
  const url = `/uploads/${key}`;
  const created = await prisma.uploadFile.create({
    data: {
      uploaderId: me.id,
      sha256: body.sha256,
      mime: body.mime,
      kind: realKind,
      size: totalSize,
      storageKey: key,
      url,
    },
  });

  // 清理分片
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => null);

  return {
    url: created.url,
    mime: created.mime,
    size: created.size,
    kind: created.kind,
  };
});
