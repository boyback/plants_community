import { prisma } from '../src/lib/db';

async function main() {
  console.log('更新新手村菜单位置...');

  await prisma.systemMenu.update({
    where: { slug: 'beginner' },
    data: { location: 'sidebar', orderIdx: 1 },
  });

  console.log('✓ 新手村已设置为侧边栏');

  // 显示所有菜单
  const menus = await prisma.systemMenu.findMany({ orderBy: { orderIdx: 'asc' } });
  console.log('\n当前菜单:');
  for (const m of menus) {
    console.log(`  ${m.location === 'sidebar' ? '📌' : '  '} ${m.name} (${m.slug}) - ${m.location}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());