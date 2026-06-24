import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/albums - 获取相册列表（晒图广场）
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '20')));
  const userId = url.searchParams.get('userId') || undefined;

  const where = {
    isPublic: true,
    ...(userId ? { userId } : {}),
  };

  const [albums, total] = await Promise.all([
    prisma.album.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, avatar: true, equipPendantId: true },
        },
        images: {
          orderBy: { orderIdx: 'asc' },
          take: 9,
          select: { id: true, url: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
    }),
    prisma.album.count({ where }),
  ]);

  return {
    items: albums.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      cover: a.cover || a.images[0]?.url || null,
      imageCount: a.imageCount,
      viewCount: a.viewCount,
      likeCount: a._count.likes,
      commentCount: a._count.comments,
      createdAt: a.createdAt.toISOString(),
      user: a.user,
      images: a.images.map((img) => img.url),
    })),
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
});

// POST /api/albums - 创建相册
const CreateBody = z.object({
  title: z.string().min(1, '标题不能为空').max(50, '标题不超过50字'),
  description: z.string().max(500, '描述不超过500字').optional(),
  isPublic: z.boolean().optional().default(true),
  images: z.array(z.string()).min(1, '至少需要1张图片').max(100, '最多100张图片'),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = CreateBody.parse(await req.json());

  const album = await prisma.album.create({
    data: {
      userId: me.id,
      title: body.title,
      description: body.description,
      isPublic: body.isPublic,
      cover: body.images[0],
      imageCount: body.images.length,
      images: {
        create: body.images.map((url, i) => ({ url, orderIdx: i })),
      },
    },
    include: {
      images: { orderBy: { orderIdx: 'asc' } },
    },
  });

  return album;
});
