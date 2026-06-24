import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jsonWithUserPendants } from '@/lib/api';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'active';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status === 'active') {
      where.status = 'active';
    } else if (status === 'voting') {
      where.status = 'voting';
    } else if (status === 'upcoming') {
      where.status = 'upcoming';
    } else if (status === 'ended') {
      where.status = 'ended';
    } else if (status === 'all') {
      where.status = { in: ['upcoming', 'active', 'voting', 'ended'] };
    }

    const [contests, total] = await Promise.all([
      prisma.photoContest.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
              equipPendantId: true,
            },
          },
          _count: {
            select: {
              entries: true,
            },
          },
        },
        orderBy: [
          { featured: 'desc' },
          { startAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.photoContest.count({ where }),
    ]);

    return jsonWithUserPendants({
      items: contests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('获取大赛列表失败:', error);
    return NextResponse.json({ error: '获取大赛列表失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      cover,
      theme,
      rules,
      prizes,
      startAt,
      endAt,
      votingStartAt,
      votingEndAt,
      maxEntriesPerUser,
      allowVoting,
      allowComments,
      createdBy,
    } = body;

    // 验证必填字段
    if (!title || !description || !startAt || !endAt || !createdBy) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const contest = await prisma.photoContest.create({
      data: {
        title,
        description,
        cover: cover || null,
        theme: theme || null,
        rules: JSON.stringify(rules || []),
        prizes: JSON.stringify(prizes || []),
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        votingStartAt: votingStartAt ? new Date(votingStartAt) : null,
        votingEndAt: votingEndAt ? new Date(votingEndAt) : null,
        maxEntriesPerUser: maxEntriesPerUser || 3,
        allowVoting: allowVoting !== false,
        allowComments: allowComments !== false,
        createdBy,
        status: 'draft',
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
            equipPendantId: true,
          },
        },
      },
    });

    return jsonWithUserPendants(contest);
  } catch (error) {
    console.error('创建大赛失败:', error);
    return NextResponse.json({ error: '创建大赛失败' }, { status: 500 });
  }
}
