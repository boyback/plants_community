import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function extractId(url: string): string {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[2] || '';
}

// GET /api/albums/[id]/comments - 获取评论
export const GET = handler(async (req) => {
  const id = extractId(req.url);
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '20')));

  const [comments, total] = await Promise.all([
    prisma.albumComment.findMany({
      where: { albumId: id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    }),
    prisma.albumComment.count({ where: { albumId: id } }),
  ]);

  return {
    items: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
    })),
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
});

// POST /api/albums/[id]/comments - 添加评论
export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = extractId(req.url);
  const body = await req.json();

  if (!body.content || body.content.trim().length === 0) {
    return fail(400, '评论内容不能为空');
  }

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return fail(404, '相册不存在');

  const comment = await prisma.albumComment.create({
    data: {
      albumId: id,
      userId: me.id,
      content: body.content.trim(),
    },
    include: {
      user: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  return comment;
});
