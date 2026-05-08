import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_SIZE,
  getUploadDriver,
  getExtForMime,
  sniffImageMime,
} from '@/lib/upload';

export const dynamic = 'force-dynamic';

// Next.js 15 App Router 默认即支持 multipart;Node 18+ 内置 Web FormData
export const POST = handler(async (req) => {
  const me = await requireUser();

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return fail(400, '缺少 file 字段');

  if (file.size > MAX_UPLOAD_SIZE) {
    return fail(400, `文件过大,最大允许 ${Math.round(MAX_UPLOAD_SIZE / 1024 / 1024)} MB`);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageMime(buf);
  if (!sniffed || !ALLOWED_MIME_TYPES.includes(sniffed)) {
    return fail(400, '仅支持 jpg / png / webp / gif 图片');
  }

  // 生成 key:uploads/{userId}/{yyyymm}/{cuid}.{ext}
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ext = getExtForMime(sniffed);
  const id =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const key = `${me.id}/${ym}/${id}.${ext}`;

  const driver = getUploadDriver();
  const url = await driver.put(key, buf, sniffed);

  return {
    url,
    key,
    mime: sniffed,
    size: file.size,
  };
});
