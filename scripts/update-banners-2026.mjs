/**
 * 一次性更新脚本
 * 1. upsert 摄影大赛板块 paishe
 * 2. 清空 banners 表,写入 3 张新 banner
 *    - 2026 摄影大赛 → /board/paishe
 *    - 养护教程     → /board/yangzhi
 *    - 景天鉴赏     → /board/jingtian
 *
 * 使用:
 *   docker compose run --rm \
 *     -v $(pwd)/scripts:/app/scripts:ro \
 *     next node scripts/update-banners-2026.mjs
 */
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

const newBanners = [
  {
    title: '遇见多肉，遇见美好',
    subtitle: '',
    image: 'https://cdn.plantcommunity.cn/cmoz85oi8000ay601io2nm9iv/202606/mq1i4tjg0967l1.png',
    link: '/board',
    tint: 'from-leaf-900/70',
    orderIdx: 0,
    enabled: true,
    durationMs: 0,
  },
  {
    title: '探索品种之美 · 分享养护经验 · 收藏成长时光',
    subtitle: '',
    image: 'https://cdn.plantcommunity.cn/cmoz85oi8000ay601io2nm9iv/202606/mq1i4tqhkoomj4.png',
    link: '/plants',
    tint: 'from-leaf-700/70',
    orderIdx: 1,
    enabled: true,
    durationMs: 0,
  },
  {
    title: '发现生活的小确幸,记录植物成长的每一条',
    subtitle: '',
    image: 'https://cdn.plantcommunity.cn/cmoz85oi8000ay601io2nm9iv/202606/mq1i4tlekwnysu.png',
    link: '/editor?type=journal',
    tint: 'from-sand-300/60',
    orderIdx: 2,
    enabled: true,
    durationMs: 0,
  },
];

async function main() {
  console.log('🛠  更新 banners + 摄影大赛板块...\n');

  // 1. upsert 摄影大赛板块
  console.log('• upsert 板块 paishe');
  await prisma.board.upsert({
    where: { slug: 'paishe' },
    update: {
      name: '摄影大赛',
      description: '2026 多肉摄影大赛 · 投稿、评选、作品鉴赏',
      icon: '📷',
    },
    create: {
      slug: 'paishe',
      name: '摄影大赛',
      description: '2026 多肉摄影大赛 · 投稿、评选、作品鉴赏',
      cover: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800',
      icon: '📷',
      members: 0,
      orderIdx: 99,
    },
  });

  // 2. 清空 + 重写 banners
  console.log('• 清空旧 banners');
  await prisma.banner.deleteMany({});
  console.log('• 写入新 banners');
  for (const b of newBanners) {
    await prisma.banner.create({ data: b });
    console.log(`  ✓ [${b.orderIdx}] ${b.title}`);
  }

  console.log('\n✅ 完成。');
}

main()
  .catch((e) => {
    console.error('❌ 失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
