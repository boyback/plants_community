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
    title: '2026 多肉摄影大赛 征稿中',
    subtitle: '上传你最满意的多肉作品,万元奖金 · 限定徽章 · 大V 流量扶持',
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1600',
    link: '/board/paishe',
    tint: 'from-leaf-900/70',
    orderIdx: 0,
    enabled: true,
    durationMs: 0,
  },
  {
    title: '养护教程合集 · 新手必看',
    subtitle: '浇水、配土、光照、度夏越冬,从入门到精通的完整路径',
    image: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1600',
    link: '/board/yangzhi',
    tint: 'from-leaf-700/70',
    orderIdx: 1,
    enabled: true,
    durationMs: 0,
  },
  {
    title: '景天鉴赏 · 状态肉合集',
    subtitle: '拟石莲、风车、长生草,看老玩家如何把它们养出极致状态',
    image: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1600',
    link: '/board/jingtian',
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
