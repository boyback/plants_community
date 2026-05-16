import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: '.env.local' });
const prisma = new PrismaClient();

async function main() {
  // 删除之前创建的测试记录贴
  const titles = [
    '我的胧月成长记录 - 从叶插到爆盆',
    '生石花蜕皮全记录 - 惊心动魄的60天',
    '黑法师度夏实录 - 休眠期观察',
  ];

  const deleted = await prisma.post.deleteMany({
    where: {
      title: { in: titles },
    },
  });

  console.log(`✓ 删除了 ${deleted.count} 条旧的测试记录贴`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
