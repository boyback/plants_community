/**
 * 大文件上传 — 单分片
 *
 *   POST /api/upload/chunk
 *   multipart/form-data: { uploadId, index, chunk(File) }
 *
 * 写入 data/upload-chunks/<uploadId>/<index>
 */
import { promises as fs } from 'fs';
import path from 'path';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getChunkDir } from '@/lib/upload';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req) => {
  const me = await requireUser();
  const form = await req.formData();
  const uploadId = String(form.get('uploadId') ?? '');
  const indexStr = String(form.get('index') ?? '');
  const chunk = form.get('chunk');

  if (!uploadId || !uploadId.startsWith(`${me.id}_`)) {
    return fail(403, '无权操作此 uploadId');
  }
  const index = Number(indexStr);
  if (!Number.isInteger(index) || index < 0) {
    return fail(400, '分片索引非法');
  }
  if (!(chunk instanceof File)) return fail(400, '缺少 chunk 字段');

  const dir = path.join(getChunkDir(), uploadId);
  await fs.mkdir(dir, { recursive: true });
  const buf = Buffer.from(await chunk.arrayBuffer());
  await fs.writeFile(path.join(dir, String(index)), buf);

  return { ok: true, index, size: buf.byteLength };
});
