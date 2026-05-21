/**
 * 把左侧「板块」卡片改名为「植物板块」,并新增「系统板块」卡片。
 *
 * 行为:
 *   - seed-card-boards.name      : 板块 → 植物板块(幂等)
 *   - seed-card-system-boards    : 新插入,cardKey='card:system_boards'(已存在则跳过)
 *   - 重排左侧 sidebar_left orderIdx: 植物板块(0) → 系统板块(1) → 热门品种(2)
 *
 * 用法: npx tsx scripts/migrate-sidebar-system-boards-card.ts
 */
import { prisma } from '../src/lib/db';

async function main() {
  console.log('▶ 同步左侧侧边栏:重命名「板块」+ 新增「系统板块」卡\n');

  // 1) 重命名「板块」→「植物板块」
  const boardsRow = await prisma.systemMenu.findUnique({
    where: { id: 'seed-card-boards' },
  });
  if (boardsRow) {
    if (boardsRow.name === '植物板块') {
      console.log('  [skip]   seed-card-boards 已是「植物板块」');
    } else {
      await prisma.systemMenu.update({
        where: { id: 'seed-card-boards' },
        data: { name: '植物板块', orderIdx: 0 },
      });
      console.log('  [update] seed-card-boards: 板块 → 植物板块, orderIdx=0');
    }
  } else {
    console.warn('  [warn]   未找到 seed-card-boards');
  }

  // 2) 新增「系统板块」卡片
  const existed = await prisma.systemMenu.findUnique({
    where: { id: 'seed-card-system-boards' },
  });
  if (existed) {
    console.log(`  [skip]   seed-card-system-boards 已存在(cardKey=${existed.cardKey})`);
  } else {
    await prisma.systemMenu.create({
      data: {
        id: 'seed-card-system-boards',
        slug: 'card-system-boards',
        name: '系统板块',
        description: null,
        icon: '[]',
        path: null,
        location: 'sidebar_left',
        cardKey: 'card:system_boards',
        type: 'card',
        orderIdx: 1,
        enabled: true,
      },
    });
    console.log('  [create] seed-card-system-boards (cardKey=card:system_boards, orderIdx=1)');
  }

  // 3) 顺手整理 hot_species → orderIdx=2(原本是 0,跟 boards 撞)
  const hotSpecies = await prisma.systemMenu.findUnique({
    where: { id: 'seed-card-hot-species' },
  });
  if (hotSpecies && hotSpecies.orderIdx !== 2) {
    await prisma.systemMenu.update({
      where: { id: 'seed-card-hot-species' },
      data: { orderIdx: 2 },
    });
    console.log('  [update] seed-card-hot-species: orderIdx → 2');
  }

  // 4) 打印最终结果
  const rows = await prisma.systemMenu.findMany({
    where: { location: 'sidebar_left' },
    orderBy: { orderIdx: 'asc' },
    select: { id: true, name: true, cardKey: true, orderIdx: true, enabled: true },
  });
  console.log('\n左侧侧边栏当前菜单:');
  console.table(rows);
}

main()
  .catch((err) => {
    console.error('✖ 迁移失败:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
