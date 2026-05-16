import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { entryId: string } }
) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 检查作品是否存在
    const entry = await prisma.contestEntry.findUnique({
      where: { id: params.entryId },
      include: {
        contest: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: '作品不存在' }, { status: 404 });
    }

    // 检查大赛是否允许投票
    if (!entry.contest.allowVoting) {
      return NextResponse.json({ error: '该大赛不允许投票' }, { status: 400 });
    }

    if (entry.contest.status !== 'voting' && entry.contest.status !== 'active') {
      return NextResponse.json({ error: '当前不在投票期' }, { status: 400 });
    }

    // 检查是否已投票
    const existingVote = await prisma.contestVote.findUnique({
      where: {
        entryId_userId: {
          entryId: params.entryId,
          userId,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json({ error: '已经投过票了' }, { status: 400 });
    }

    // 创建投票
    const vote = await prisma.contestVote.create({
      data: {
        entryId: params.entryId,
        userId,
      },
    });

    // 更新作品投票数
    await prisma.contestEntry.update({
      where: { id: params.entryId },
      data: {
        voteCount: { increment: 1 },
      },
    });

    // 更新大赛总投票数
    await prisma.photoContest.update({
      where: { id: entry.contestId },
      data: {
        voteCount: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true, vote });
  } catch (error) {
    console.error('投票失败:', error);
    return NextResponse.json({ error: '投票失败' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { entryId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 查找投票
    const vote = await prisma.contestVote.findUnique({
      where: {
        entryId_userId: {
          entryId: params.entryId,
          userId,
        },
      },
      include: {
        entry: true,
      },
    });

    if (!vote) {
      return NextResponse.json({ error: '未找到投票记录' }, { status: 404 });
    }

    // 删除投票
    await prisma.contestVote.delete({
      where: {
        entryId_userId: {
          entryId: params.entryId,
          userId,
        },
      },
    });

    // 更新作品投票数
    await prisma.contestEntry.update({
      where: { id: params.entryId },
      data: {
        voteCount: { decrement: 1 },
      },
    });

    // 更新大赛总投票数
    await prisma.photoContest.update({
      where: { id: vote.entry.contestId },
      data: {
        voteCount: { decrement: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('取消投票失败:', error);
    return NextResponse.json({ error: '取消投票失败' }, { status: 500 });
  }
}
