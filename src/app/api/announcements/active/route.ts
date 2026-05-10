/**
 * GET /api/announcements/active
 *
 * 返回当前生效中的公告列表。
 * 生效定义:enabled=true,且 (startAt 为空 OR startAt<=now),且 (endAt 为空 OR endAt>now)
 * 按 createdAt 倒序,最多 5 条。
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  const list = await prisma.announcement.findMany({
    where: {
      enabled: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gt: now } }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      content: true,
      level: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ ok: true, data: list });
}
