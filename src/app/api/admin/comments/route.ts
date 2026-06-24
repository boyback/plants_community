/**
 * GET /api/admin/comments?status=all|active|deleted&q=&page=1
 *
 * 评论列表(含删除态)。分页 50/页。
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { jsonWithUserPendants } from '@/lib/api';

export const dynamic = 'force-dynamic';

const PER = 50;

export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'all';
  const q = (url.searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));

  const where: Record<string, unknown> = {};
  if (status === 'active') where.deleted = false;
  else if (status === 'deleted') where.deleted = true;
  if (q) {
    where.OR = [
      { content: { contains: q } },
      { contentText: { contains: q } },
      { author: { name: { contains: q } } },
      { author: { handle: { contains: q } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PER,
      skip: (page - 1) * PER,
      select: {
        id: true,
        content: true,
        contentText: true,
        deleted: true,
        deleteReason: true,
        deletedAt: true,
        likes: true,
        createdAt: true,
        postId: true,
        author: {
          select: { id: true, name: true, handle: true, avatar: true, equipPendantId: true, level: true, role: true },
        },
        post: { select: { id: true, title: true } },
      },
    }),
    prisma.comment.count({ where }),
  ]);

  return jsonWithUserPendants({
    ok: true,
    data: { items, total, page, perPage: PER },
  });
}
