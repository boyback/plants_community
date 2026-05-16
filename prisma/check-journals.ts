import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: '.env.local' });
const prisma = new PrismaClient();

async function main() {
  const journals = await prisma.post.findMany({
    where: { type: 'journal' },
    include: {
      journal: {
        include: {
          entries: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(`找到 ${journals.length} 条记录贴:\n`);

  journals.forEach((post, i) => {
    console.log(`${i + 1}. ${post.title}`);
    console.log(`   ID: ${post.id}`);
    console.log(`   创建时间: ${post.createdAt}`);
    console.log(`   Journal数据: ${post.journal ? '✓' : '✗'}`);
    if (post.journal) {
      console.log(`   记录条数: ${post.journal.entries.length}`);
      post.journal.entries.forEach((e, j) => {
        console.log(`     ${j + 1}. ${e.stage} - ${e.note.substring(0, 30)}... (图片: ${JSON.parse(e.images as string).length})`);
      });
    }
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
