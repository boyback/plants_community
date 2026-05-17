import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * 获取启用的系统菜单（公开接口，供前端使用）
 */
export async function GET() {
  try {
    const menus = await prisma.systemMenu.findMany({
      where: { enabled: true },
      orderBy: { orderIdx: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        icon: true,
        path: true,
      },
    });

    return Response.json(menus);
  } catch (error) {
    console.error('获取系统菜单失败:', error);
    return Response.json({ error: '获取失败' }, { status: 500 });
  }
}