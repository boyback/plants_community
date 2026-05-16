import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearBanners() {
  console.log('开始清空轮播图数据...\n');

  try {
    const result = await prisma.banner.deleteMany({});
    console.log(`✅ 已删除 ${result.count} 条轮播图数据`);
  } catch (error) {
    console.error('❌ 删除失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearBanners()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
