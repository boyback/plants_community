import { prisma } from '../src/lib/db';

async function main() {
  console.log('开始创建轮播图数据...');

  // 先清空现有的轮播图
  await prisma.banner.deleteMany({});
  console.log('已清空现有轮播图');

  // 创建三条轮播图
  const banners = [
    {
      title: '晒图广场',
      subtitle: '分享你的多肉美照，记录植物成长的每一个精彩瞬间',
      image: '/images/banners/shaitu.jpg',
      link: '/shaitu',
      tint: '#10b981', // 绿色
      orderIdx: 1,
      enabled: true,
      durationMs: 0,
    },
    {
      title: '交易广场',
      subtitle: '买卖交换多肉植物，与肉友们分享你的珍藏',
      image: '/images/banners/market.jpg',
      link: '/market',
      tint: '#f59e0b', // 橙色
      orderIdx: 2,
      enabled: true,
      durationMs: 0,
    },
    {
      title: '多肉社区',
      subtitle: '加入我们的多肉大家庭，一起探索植物世界的无限魅力',
      image: '/images/banners/community.jpg',
      link: '/',
      tint: '#8b5cf6', // 紫色
      orderIdx: 3,
      enabled: true,
      durationMs: 0,
    },
  ];

  for (const banner of banners) {
    const created = await prisma.banner.create({
      data: banner,
    });
    console.log(`✓ 创建轮播图: ${created.title}`);
  }

  console.log('\n轮播图创建完成！');
  console.log('注意：请将对应的图片放置到 public/images/banners/ 目录下');
  console.log('  - shaitu.jpg (晒图广场)');
  console.log('  - market.jpg (交易广场)');
  console.log('  - community.jpg (社区)');
}

main()
  .catch((e) => {
    console.error('创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
