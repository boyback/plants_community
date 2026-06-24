import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jsonWithUserPendants } from '@/lib/api';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contest = await prisma.photoContest.findUnique({
      where: { id: params.id },
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
    });

    if (!contest) {
      return NextResponse.json({ error: '大赛不存在' }, { status: 404 });
    }

    // 增加浏览数
    await prisma.photoContest.update({
      where: { id: params.id },
      data: { viewCount: { increment: 1 } },
    });

    return jsonWithUserPendants(contest);
  } catch (error) {
    console.error('获取大赛详情失败:', error);
    return NextResponse.json({ error: '获取大赛详情失败' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      cover,
      theme,
      rules,
      prizes,
      status,
      startAt,
      endAt,
      votingStartAt,
      votingEndAt,
      maxEntriesPerUser,
      allowVoting,
      allowComments,
      featured,
    } = body;

    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (cover !== undefined) updateData.cover = cover;
    if (theme !== undefined) updateData.theme = theme;
    if (rules !== undefined) updateData.rules = JSON.stringify(rules);
    if (prizes !== undefined) updateData.prizes = JSON.stringify(prizes);
    if (status !== undefined) updateData.status = status;
    if (startAt !== undefined) updateData.startAt = new Date(startAt);
    if (endAt !== undefined) updateData.endAt = new Date(endAt);
    if (votingStartAt !== undefined) updateData.votingStartAt = votingStartAt ? new Date(votingStartAt) : null;
    if (votingEndAt !== undefined) updateData.votingEndAt = votingEndAt ? new Date(votingEndAt) : null;
    if (maxEntriesPerUser !== undefined) updateData.maxEntriesPerUser = maxEntriesPerUser;
    if (allowVoting !== undefined) updateData.allowVoting = allowVoting;
    if (allowComments !== undefined) updateData.allowComments = allowComments;
    if (featured !== undefined) updateData.featured = featured;

    const contest = await prisma.photoContest.update({
      where: { id: params.id },
      data: updateData,
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
    console.error('更新大赛失败:', error);
    return NextResponse.json({ error: '更新大赛失败' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.photoContest.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除大赛失败:', error);
    return NextResponse.json({ error: '删除大赛失败' }, { status: 500 });
  }
}
