/**
 * 创建三条记录贴测试数据
 * 运行: npx tsx prisma/seed-journal-test.ts
 */
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// 加载环境变量
config({ path: '.env.local' });

const prisma = new PrismaClient();

const img = [
  'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000',
  'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1000',
  'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000',
  'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000',
  'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000',
  'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=1000',
  'https://images.unsplash.com/photo-1558603668-6570496b66f8?w=1000',
  'https://images.unsplash.com/photo-1615671524827-c1fe3973b648?w=1000',
  'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1000',
  'https://images.unsplash.com/photo-1487700160041-babef9c3cb55?w=1000',
  'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=1000',
  'https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=1000',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1000',
  'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1000',
];

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400 * 1000);
}

async function main() {
  console.log('🌱 创建记录贴测试数据...');

  // 获取第一个用户和第一个板块
  const user = await prisma.user.findFirst();
  const board = await prisma.board.findFirst();

  if (!user || !board) {
    console.error('❌ 需要先运行 npm run db:seed 创建基础数据');
    return;
  }

  console.log(`✓ 使用用户: ${user.name}`);
  console.log(`✓ 使用板块: ${board.name}`);

  // 记录贴 1: 有配图的记录
  const journal1 = await prisma.post.create({
    data: {
      type: 'journal',
      title: '我的胧月成长记录 - 从叶插到爆盆',
      content: '',
      cover: img[0],
      images: JSON.stringify([img[0]]),
      tags: JSON.stringify(['胧月', '叶插', '成长记录']),
      views: 856,
      shares: 12,
      createdAt: daysAgo(5),
      authorId: user.id,
      boardId: board.id,
      journal: {
        create: {
          subjectName: '阳台1号胧月',
          startDate: daysAgo(90),
          endReason: 'alive',
          entries: {
            create: [
              {
                entryDate: daysAgo(90),
                stage: 'germinate',
                note: '叶插第一天，选了几片健康的叶子，放在土面上',
                images: JSON.stringify([img[0], img[1]]),
                orderIdx: 0,
              },
              {
                entryDate: daysAgo(75),
                stage: 'growing',
                note: '15天后开始生根了！小芽芽也冒出来了，好激动',
                images: JSON.stringify([img[1], img[2], img[3]]),
                orderIdx: 1,
              },
              {
                entryDate: daysAgo(60),
                stage: 'growing',
                note: '一个月了，小苗已经长到1cm高，母叶还很饱满',
                images: JSON.stringify([img[2]]),
                orderIdx: 2,
              },
            ],
          },
        },
      },
    },
  });
  console.log(`✓ 创建记录贴 1: ${journal1.title}`);

  // 记录贴 2: 配图较多的记录
  const journal2 = await prisma.post.create({
    data: {
      type: 'journal',
      title: '生石花蜕皮全记录 - 惊心动魄的60天',
      content: '',
      cover: img[3],
      images: JSON.stringify([img[3]]),
      tags: JSON.stringify(['生石花', '蜕皮', '番杏科']),
      views: 1243,
      shares: 28,
      createdAt: daysAgo(3),
      authorId: user.id,
      boardId: board.id,
      journal: {
        create: {
          subjectName: '我的第一颗石头',
          startDate: daysAgo(60),
          endReason: 'alive',
          entries: {
            create: [
              {
                entryDate: daysAgo(60),
                stage: 'growing',
                note: '发现开始蜕皮了，老皮开始裂开，能看到里面的新叶',
                images: JSON.stringify([img[3], img[4]]),
                orderIdx: 0,
              },
              {
                entryDate: daysAgo(45),
                stage: 'growing',
                note: '蜕皮中期，完全断水，新叶慢慢吸收老皮的养分',
                images: JSON.stringify([img[4], img[5], img[0], img[1]]),
                orderIdx: 1,
              },
              {
                entryDate: daysAgo(30),
                stage: 'growing',
                note: '老皮已经干瘪，新叶饱满圆润，马上就要完成蜕皮了',
                images: JSON.stringify([img[5]]),
                orderIdx: 2,
              },
            ],
          },
        },
      },
    },
  });
  console.log(`✓ 创建记录贴 2: ${journal2.title}`);

  // 记录贴 3: 没有配图的记录
  const journal3 = await prisma.post.create({
    data: {
      type: 'journal',
      title: '黑法师度夏实录 - 休眠期观察',
      content: '',
      cover: img[2],
      images: JSON.stringify([img[2]]),
      tags: JSON.stringify(['黑法师', '度夏', '休眠']),
      views: 642,
      shares: 8,
      createdAt: daysAgo(10),
      authorId: user.id,
      boardId: board.id,
      journal: {
        create: {
          subjectName: '阳台黑法师',
          startDate: daysAgo(45),
          endReason: 'alive',
          entries: {
            create: [
              {
                entryDate: daysAgo(45),
                stage: 'summer',
                note: '入夏第一天，开始控水，叶片开始收拢',
                images: JSON.stringify([]),
                orderIdx: 0,
              },
              {
                entryDate: daysAgo(30),
                stage: 'summer',
                note: '休眠中期，叶片完全包裹住茎干，这是正常现象',
                images: JSON.stringify([]),
                orderIdx: 1,
              },
              {
                entryDate: daysAgo(15),
                stage: 'summer',
                note: '持续高温，继续断水，等待秋天苏醒',
                images: JSON.stringify([img[2]]),
                orderIdx: 2,
              },
            ],
          },
        },
      },
    },
  });
  console.log(`✓ 创建记录贴 3: ${journal3.title}`);

  // 记录贴 4: 15 张图片测试（测试 +N 蒙层显示）
  const journal4 = await prisma.post.create({
    data: {
      type: 'journal',
      title: '多肉拼盘大合集 - 15 种不同品种',
      content: '',
      cover: img[0],
      images: JSON.stringify([img[0]]),
      tags: JSON.stringify(['拼盘', '多肉合集', '品种展示']),
      views: 2156,
      shares: 45,
      createdAt: daysAgo(1),
      authorId: user.id,
      boardId: board.id,
      journal: {
        create: {
          subjectName: '我的多肉大家庭',
          startDate: daysAgo(30),
          endReason: 'alive',
          entries: {
            create: [
              {
                entryDate: daysAgo(30),
                stage: 'growing',
                note: '今天拍了所有多肉的照片，记录一下大家的状态，一共 15 个品种！',
                images: JSON.stringify(img), // 全部 15 张图片
                orderIdx: 0,
              },
              {
                entryDate: daysAgo(15),
                stage: 'growing',
                note: '半个月后的对比，大家都长得很好',
                images: JSON.stringify([img[0], img[1], img[2]]),
                orderIdx: 1,
              },
            ],
          },
        },
      },
    },
  });
  console.log(`✓ 创建记录贴 4: ${journal4.title}`);

  console.log('\n✅ 完成！创建了 4 条记录贴测试数据');
  console.log('   - 记录贴 1: 有 2-3 张配图的记录');
  console.log('   - 记录贴 2: 有 4+ 张配图的记录（测试 +N 显示）');
  console.log('   - 记录贴 3: 混合有图和无图的记录');
  console.log('   - 记录贴 4: 有 15 张配图的记录（测试 +6 蒙层显示）');
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
