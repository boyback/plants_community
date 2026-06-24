import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type ParsedAlbumComment = {
  content: string;
  images: string[];
};

function extractId(url: string): string {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[2] || '';
}

function parseAlbumCommentContent(raw: string): ParsedAlbumComment {
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === 'object' && Array.isArray(value.images)) {
      return {
        content: typeof value.text === 'string' ? value.text : '',
        images: value.images.filter((item: unknown): item is string => typeof item === 'string'),
      };
    }
  } catch {
    // Old album comments are stored as plain text.
  }
  return { content: raw, images: [] };
}

function stringifyAlbumCommentContent(content: string, images: string[]) {
  if (images.length === 0) return content;
  return JSON.stringify({ text: content, images });
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
          select: { id: true, name: true, avatar: true, equipPendantId: true },
        },
      },
    }),
    prisma.albumComment.count({ where: { albumId: id } }),
  ]);

  return {
    items: comments.map((c) => ({
      id: c.id,
      ...parseAlbumCommentContent(c.content),
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
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const images = Array.isArray(body.images)
    ? body.images
        .filter((item: unknown): item is string => typeof item === 'string' && item.length > 0)
        .slice(0, 9)
    : [];

  if (!content && images.length === 0) {
    return fail(400, '评论内容不能为空');
  }

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return fail(404, '相册不存在');

  const comment = await prisma.albumComment.create({
    data: {
      albumId: id,
      userId: me.id,
      content: stringifyAlbumCommentContent(content, images),
    },
    include: {
      user: {
        select: { id: true, name: true, avatar: true, equipPendantId: true },
      },
    },
  });

  return {
    id: comment.id,
    content,
    images,
    createdAt: comment.createdAt.toISOString(),
    user: comment.user,
  };
});
