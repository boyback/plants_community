/**
 * Live Photo 反查:给一组图片 URL,查出每个对应的 Live Photo 视频 URL
 *
 * 因为 Post.images 是字符串数组,Live Photo 关联存在 UploadFile 表,
 * 所以详情页/PostBody 渲染时需要这一步反查。
 */
import { prisma } from './db';

export interface LivePhotoMap {
  /** key 是图片 URL,value 是配套 Live Photo 视频 URL */
  [imageUrl: string]: string;
}

/**
 * 给一组图片 URL 查询它们的 Live Photo 视频 URL
 *
 * 一次 prisma 查询(in 操作),返回 imageUrl → movUrl 的映射
 */
export async function lookupLivePhotos(
  imageUrls: string[]
): Promise<LivePhotoMap> {
  if (imageUrls.length === 0) return {};
  const images = await prisma.uploadFile.findMany({
    where: {
      url: { in: imageUrls },
      kind: 'image',
      livePhotoMovId: { not: null },
    },
    select: { url: true, livePhotoMovId: true },
  });
  const movIds = images.map((i) => i.livePhotoMovId!).filter(Boolean);
  if (movIds.length === 0) return {};
  const movs = await prisma.uploadFile.findMany({
    where: { id: { in: movIds } },
    select: { id: true, url: true },
  });
  const movMap = new Map(movs.map((m) => [m.id, m.url]));
  const result: LivePhotoMap = {};
  for (const img of images) {
    const movUrl = movMap.get(img.livePhotoMovId!);
    if (movUrl) result[img.url] = movUrl;
  }
  return result;
}
