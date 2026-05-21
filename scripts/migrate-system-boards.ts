/**
 * 把 system_menus 里的「摄影大赛 / 交易中心 / 养殖交流 / 新手村」迁移到 boards 表(kind=system)。
 *
 * 行为:
 *   - 4 条 board 不存在则按计划插入,存在则跳过(幂等)
 *   - linkPath 仅对 contests / market 设置(对应页面已存在);yangzhi / beginner 留空,走 system 板块详情页
 *   - description / cover 按用户选择留空,等管理员后台填
 *   - 迁移完成后,直接删除对应的 system_menus 行
 *
 * 用法: npx tsx scripts/migrate-system-boards.ts
 */
import { prisma } from '../src/lib/db';

interface SystemBoardSeed {
  slug: string;
  name: string;
  linkPath: string | null;
  icons: string; // JSON 数组字符串
}

const SYSTEM_BOARDS: SystemBoardSeed[] = [
  {
    slug: 'contests',
    name: '摄影大赛',
    linkPath: '/contests',
    icons:
      '["https://cdn.plantcommunity.cn/cmoz85oi8000ay601io2nm9iv/202605/mp82o5z3atowcv.png"]',
  },
  {
    slug: 'market',
    name: '交易中心',
    linkPath: '/market',
    icons:
      '["https://cdn.plantcommunity.cn/cmoz85oi8000ay601io2nm9iv/202605/mp8c1ih46xy03c.png"]',
  },
  {
    slug: 'yangzhi',
    name: '养殖交流',
    linkPath: null,
    icons: '[]',
  },
  {
    slug: 'beginner',
    name: '新手村',
    linkPath: null,
    icons: '[]',
  },
];

const MENU_IDS_TO_DELETE = [
  'seed-contests',
  'seed-market',
  'seed-yangzhi',
  'seed-beginner',
];

async function main() {
  console.log('▶ 开始迁移系统菜单 → boards 表(kind=system)\n');

  // 1) 计算插入用的起始 orderIdx:接在现有最大 orderIdx 后面
  const last = await prisma.board.findFirst({ orderBy: { orderIdx: 'desc' } });
  let cursor = (last?.orderIdx ?? 0) + 1;

  let createdCount = 0;
  let skippedCount = 0;

  for (const item of SYSTEM_BOARDS) {
    const existing = await prisma.board.findUnique({ where: { slug: item.slug } });
    if (existing) {
      console.log(`  [skip]   board slug="${item.slug}" 已存在(id=${existing.id}, kind=${existing.kind})`);
      skippedCount++;
      continue;
    }
    const row = await prisma.board.create({
      data: {
        slug: item.slug,
        name: item.name,
        kind: 'system',
        description: '',
        cover: '',
        icons: item.icons,
        linkPath: item.linkPath,
        orderIdx: cursor++,
        enabled: true,
      },
    });
    console.log(
      `  [create] board id=${row.id} slug="${row.slug}" name="${row.name}" linkPath=${row.linkPath ?? '(空)'}`
    );
    createdCount++;
  }

  // 2) 删除 system_menus 旧记录
  const deleted = await prisma.systemMenu.deleteMany({
    where: { id: { in: MENU_IDS_TO_DELETE } },
  });

  console.log(
    `\n✔ 完成:新建 ${createdCount} 条 / 跳过 ${skippedCount} 条,删除 ${deleted.count} 条 system_menus 旧记录`
  );
}

main()
  .catch((err) => {
    console.error('✖ 迁移失败:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
