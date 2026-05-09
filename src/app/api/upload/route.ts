import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  ALLOWED_IMAGE_MIME,
  MAX_UPLOAD_SIZE,
  getUploadDriver,
  getExtForMime,
  sniffImageMime,
  normalizeImageBuffer,
  sha256OfBuffer,
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

  const rawBuf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageMime(rawBuf);
  if (!sniffed || !ALLOWED_IMAGE_MIME.includes(sniffed)) {
    return fail(400, '仅支持 jpg / png / webp / gif / heic 图片');
  }

  // HEIC/HEIF 服务端转 JPEG(浏览器普遍不识别)
  const { buf, mime: finalMime } = await normalizeImageBuffer(rawBuf, sniffed);

  // 生成 key:uploads/{userId}/{yyyymm}/{cuid}.{ext}
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ext = getExtForMime(finalMime);
  const id =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const key = `${me.id}/${ym}/${id}.${ext}`;

  const driver = getUploadDriver();
  const url = await driver.put(key, buf, finalMime);

  // 落 UploadFile 表(秒传 + Live Photo 配对都依赖它)
  // 注意:hash 用最终落地的 buffer(转换后)
  const sha256 = await sha256OfBuffer(buf);
  let row;
  try {
    row = await prisma.uploadFile.create({
      data: {
        uploaderId: me.id,
        sha256,
        mime: finalMime,
        kind: 'image',
        size: buf.length,
        storageKey: key,
        url,
      },
    });
  } catch {
    // 已存在(同 sha256 + uploader),返回已有记录
    row = await prisma.uploadFile.findUnique({
      where: {
        uploaderId_sha256: { uploaderId: me.id, sha256 },
      },
    });
    if (!row) throw new Error('upload create + find both failed');
  }

  return {
    id: row.id,
    url: row.url,
    key,
    mime: finalMime,
    size: buf.length,
    originalMime: sniffed,
    converted: sniffed !== finalMime,
  };
});
