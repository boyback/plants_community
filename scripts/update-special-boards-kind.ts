import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始更新特殊板块类型...\n');

  // 更新晒图广场
  const shaitu = await prisma.category.updateMany({
    where: { slug: 'shaitu' },
    data: { kind: 'system' },
  });
  console.log(`✓ 更新晒图广场: ${shaitu.count} 条记录`);

  // 更新交易市场
  const market = await prisma.category.updateMany({
    where: { slug: 'jiaoyi' },
    data: { kind: 'system' },
  });
  console.log(`✓ 更新交易市场: ${market.count} 条记录`);

  // 验证结果
  const specialBoards = await prisma.category.findMany({
    where: {
      slug: { in: ['shaitu', 'jiaoyi'] },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      enabled: true,
    },
  });

  console.log('\n当前特殊板块状态:');
  specialBoards.forEach((board) => {
    console.log(`  - ${board.name} (${board.slug}): kind=${board.kind}, enabled=${board.enabled}`);
  });

  console.log('\n✅ 更新完成！');
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
