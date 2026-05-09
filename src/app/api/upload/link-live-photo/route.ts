/**
 * 把已上传的 HEIC/JPEG 主图与配套的 Live Photo 视频(MOV)关联起来
 *
 *   POST /api/upload/link-live-photo
 *   body: { imageId: string, movId: string }
 *
 * 校验:
 *   - 两个 UploadFile 必须存在
 *   - 都必须属于当前用户(避免跨用户篡改)
 *   - imageId 必须 kind=image,movId 必须 kind=video
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const Body = z.object({
  imageId: z.string().min(1),
  movId: z.string().min(1),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());

  const [image, mov] = await Promise.all([
    prisma.uploadFile.findUnique({ where: { id: body.imageId } }),
    prisma.uploadFile.findUnique({ where: { id: body.movId } }),
  ]);
  if (!image || !mov) return fail(404, '上传记录不存在');
  if (image.uploaderId !== me.id || mov.uploaderId !== me.id) {
    return fail(403, '只能关联自己上传的文件');
  }
  if (image.kind !== 'image') return fail(400, 'imageId 必须是 image 类型');
  if (mov.kind !== 'video') return fail(400, 'movId 必须是 video 类型');

  await prisma.$transaction([
    prisma.uploadFile.update({
      where: { id: image.id },
      data: { livePhotoMovId: mov.id },
    }),
    prisma.uploadFile.update({
      where: { id: mov.id },
      data: { livePhotoImageId: image.id },
    }),
  ]);

  return { ok: true };
});
