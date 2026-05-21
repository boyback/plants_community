/**
 * 临时查看脚本:列出 sidebar_left / sidebar_right 的 system_menus
 * 用法: npx tsx scripts/inspect-sidebar-menus.ts
 */
import { prisma } from '../src/lib/db';

async function main() {
  const rows = await prisma.systemMenu.findMany({
    where: { location: { in: ['sidebar_left', 'sidebar_right'] } },
    orderBy: { orderIdx: 'asc' },
    select: {
      id: true,
      name: true,
      cardKey: true,
      location: true,
      orderIdx: true,
      enabled: true,
      type: true,
      path: true,
    },
  });
  console.table(rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
