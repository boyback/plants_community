import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * 获取单个系统菜单项
 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const menu = await prisma.systemMenu.findUnique({ where: { id } });

    if (!menu) {
      return NextResponse.json({ error: '不存在' }, { status: 404 });
    }

    return NextResponse.json(menu);
  } catch (error) {
    console.error('获取系统菜单失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

/**
 * 更新系统菜单项
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    let iconValue: string = '';
    if (Array.isArray(body.icons)) {
      iconValue = JSON.stringify(body.icons);
    } else if (typeof body.icon === 'string') {
      iconValue = body.icon;
    }

    await prisma.$executeRawUnsafe(
      `UPDATE system_menus SET slug = ?, name = ?, description = ?, icon = ?, path = ?, location = ?, cardKey = ?, type = ?, orderIdx = ?, enabled = ?, updatedAt = NOW() WHERE id = ?`,
      body.slug || null,
      body.name || null,
      body.description || null,
      iconValue,
      body.path || null,
      body.location || 'sidebar_left',
      body.cardKey || null,
      body.type || 'button',
      body.orderIdx || 0,
      body.enabled !== undefined ? (body.enabled ? 1 : 0) : 1,
      id
    );

    const updated = await prisma.systemMenu.findUnique({ where: { id } });

    return Response.json(updated);
  } catch (error) {
    console.error('更新系统菜单失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

/**
 * 删除系统菜单项
 */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.systemMenu.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除系统菜单失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}