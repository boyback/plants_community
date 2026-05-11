/**
 * GET /api/topics/ranking?page=1&pageSize=50
 *
 * 公开查询话题排行榜，从 TopicRanking 预聚合表读取。
 */
import { NextResponse } from 'next/server';
import { handler } from '@/lib/api';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 50;

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || DEFAULT_PAGE_SIZE)));
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.topicRanking.findMany({
      orderBy: { postCount: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.topicRanking.count(),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
});
