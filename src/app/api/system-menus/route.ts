import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * 获取系统菜单（公开接口，供前端使用）
 * - 快捷入口：启用的菜单
 * - 卡片配置：启用的 cardKey 项
 */
export async function GET() {
  try {
    const rawMenus = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, slug, name, description, icon, path, location, cardKey, type, orderIdx, enabled, createdAt, updatedAt
       FROM system_menus ORDER BY orderIdx ASC`
    );

    const menus = rawMenus.filter((m: any) => {
      // 启用的菜单才返回
      if (!m.enabled) return false;
      // 有 path 的是快捷入口
      if (m.path) return true;
      // 有 cardKey 的是卡片配置
      if (m.cardKey) return true;
      return false;
    }).map((m) => {
      let icons: string[] = [];
      try {
        const parsed = JSON.parse(m.icon);
        icons = Array.isArray(parsed) ? parsed : m.icon ? [m.icon] : [];
      } catch {
        icons = m.icon ? [m.icon] : [];
      }
      return {
        ...m,
        icon: icons[0] || '',
      };
    });

    return Response.json(menus);
  } catch (error) {
    console.error('获取系统菜单失败:', error);
    return Response.json({ error: '获取失败' }, { status: 500 });
  }
}
