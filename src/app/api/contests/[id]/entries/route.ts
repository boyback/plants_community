import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'latest'; // latest, popular, random

    const skip = (page - 1) * limit;

    const where: any = {
      contestId: params.id,
      approved: true,
      disqualified: false,
    };

    let orderBy: any = { createdAt: 'desc' };

    if (sort === 'popular') {
      orderBy = { voteCount: 'desc' };
    } else if (sort === 'random') {
      // MySQL random order
      orderBy = undefined;
    }

    const [entries, total] = await Promise.all([
      prisma.contestEntry.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          species: {
            select: {
              id: true,
              name: true,
              latinName: true,
            },
          },
          _count: {
            select: {
              votes: true,
              comments: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.contestEntry.count({ where }),
    ]);

    return NextResponse.json({
      items: entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('获取参赛作品失败:', error);
    return NextResponse.json({ error: '获取参赛作品失败' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      userId,
      albumId,
      title,
      description,
      imageUrl,
      images,
      speciesId,
    } = body;

    // 验证必填字段
    if (!userId || !title || !imageUrl || !images) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 检查大赛是否存在且可参赛
    const contest = await prisma.photoContest.findUnique({
      where: { id: params.id },
    });

    if (!contest) {
      return NextResponse.json({ error: '大赛不存在' }, { status: 404 });
    }

    if (contest.status !== 'active') {
      return NextResponse.json({ error: '大赛未开放参赛' }, { status: 400 });
    }

    // 检查用户参赛作品数量
    const userEntryCount = await prisma.contestEntry.count({
      where: {
        contestId: params.id,
        userId,
      },
    });

    if (userEntryCount >= contest.maxEntriesPerUser) {
      return NextResponse.json(
        { error: `每人最多提交 ${contest.maxEntriesPerUser} 个作品` },
        { status: 400 }
      );
    }

    // 创建参赛作品
    const entry = await prisma.contestEntry.create({
      data: {
        contestId: params.id,
        userId,
        albumId: albumId || null,
        title,
        description: description || null,
        imageUrl,
        images: JSON.stringify(images),
        speciesId: speciesId || null,
        approved: true, // 自动审核通过
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        species: {
          select: {
            id: true,
            name: true,
            latinName: true,
          },
        },
      },
    });

    // 更新大赛统计
    await prisma.photoContest.update({
      where: { id: params.id },
      data: {
        entryCount: { increment: 1 },
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('提交参赛作品失败:', error);
    return NextResponse.json({ error: '提交参赛作品失败' }, { status: 500 });
  }
}
