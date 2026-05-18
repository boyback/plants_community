import { prisma } from '../src/lib/db';

async function main() {
  console.log('初始化系统菜单...');

  const menus = [
    {
      slug: 'shaitu',
      name: '晒图广场',
      description: '用户晒图分享',
      icon: '📷',
      path: '/shaitu',
      type: 'button',
      orderIdx: 1,
      enabled: true,
    },
    {
      slug: 'market',
      name: '交易中心',
      description: '二手交易市场',
      icon: '🛒',
      path: '/market',
      type: 'button',
      orderIdx: 2,
      enabled: true,
    },
    {
      slug: 'contests',
      name: '摄影大赛',
      description: '摄影比赛活动',
      icon: '🏆',
      path: '/contests',
      type: 'button',
      orderIdx: 3,
      enabled: false,
    },
    {
      slug: 'forum',
      name: '养殖交流',
      description: '养殖经验交流',
      icon: '🌿',
      path: '/forum',
      type: 'button',
      orderIdx: 4,
      enabled: true,
    },
    {
      slug: 'beginner',
      name: '新手村',
      description: '新手入门指导',
      icon: '🌱',
      path: '/beginner',
      type: 'button',
      orderIdx: 5,
      enabled: true,
    },
  ];

  for (const menu of menus) {
    await prisma.systemMenu.upsert({
      where: { slug: menu.slug },
      update: {
        name: menu.name,
        description: menu.description,
        icon: menu.icon,
        path: menu.path,
        type: menu.type,
        orderIdx: menu.orderIdx,
        enabled: menu.enabled,
      },
      create: menu,
    });
    console.log(`✓ 菜单: ${menu.name} (${menu.slug})`);
  }

  console.log('\n系统菜单初始化完成！');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });