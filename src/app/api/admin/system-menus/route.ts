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

    const menus = await prisma.systemMenu.findMany({
      orderBy: { orderIdx: 'asc' },
    });

    return NextResponse.json(menus);
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

    const { slug, name, description, icon, path, orderIdx } = await request.json();

    if (!slug || !name || !path) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 检查 slug 是否已存在
    const existing = await prisma.systemMenu.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug 已存在' }, { status: 400 });
    }

    const menu = await prisma.systemMenu.create({
      data: {
        slug,
        name,
        description: description || null,
        icon: icon || '',
        path,
        orderIdx: orderIdx ?? 0,
        enabled: true,
      },
    });

    return NextResponse.json(menu);
  } catch (error) {
    console.error('创建系统菜单失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}