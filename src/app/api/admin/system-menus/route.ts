import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 获取所有系统菜单项（管理员）
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const menus = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM system_menus ORDER BY
        FIELD(location, 'header', 'sidebar_left', 'sidebar_right'),
        orderIdx ASC`
    );

    return Response.json(menus);
  } catch (error) {
    console.error('获取系统菜单失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

/**
 * 创建系统菜单项
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { slug, name, description, path, location, cardKey, type, orderIdx } = body;

    let icons: string[] = [];
    if (Array.isArray(body.icons)) {
      icons = body.icons;
    } else if (body.icon) {
      icons = [body.icon];
    }

    if (!slug || !name) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 检查 slug 是否已存在
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM system_menus WHERE slug = ?`,
      slug
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Slug 已存在' }, { status: 400 });
    }

    const iconValue = JSON.stringify(icons);
    const newId = `sm-${Date.now()}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO system_menus (id, slug, name, description, icon, path, location, cardKey, type, orderIdx, enabled, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      newId,
      slug,
      name || null,
      description || null,
      iconValue,
      path || null,
      location || 'header',
      cardKey || null,
      type || 'button',
      orderIdx ?? 0
    );

    const menu = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM system_menus WHERE id = ?`,
      newId
    );

    return Response.json(menu[0]);
  } catch (error) {
    console.error('创建系统菜单失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

/**
 * 批量更新排序
 * 请求体: { orderedIds: string[] }
 * 排序规则: header -> sidebar_left -> sidebar_right
 */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'orderedIds 必须是数组' }, { status: 400 });
    }

    // 批量更新 orderIdx
    // 使用事务确保原子性
    const updates = orderedIds.map((id: string, index: number) =>
      prisma.$executeRawUnsafe(
        `UPDATE system_menus SET orderIdx = ?, updatedAt = NOW() WHERE id = ?`,
        index,
        id
      )
    );

    await prisma.$transaction(updates);

    return Response.json({ success: true });
  } catch (error) {
    console.error('更新排序失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}