import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomChoices<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

const albumTitles = [
  '我的多肉花园',
  '春日多肉记录',
  '阳台小花园',
  '多肉成长日记',
  '我的肉肉们',
  '多肉植物合集',
  '新入手的宝贝',
  '晒晒我的收藏',
  '多肉摄影作品',
  '养肉日常',
  '多肉拼盘',
  '我的小确幸',
  '植物角落',
  '绿色生活',
  '多肉世界',
  '治愈系植物',
  '阳光下的多肉',
  '我的植物朋友们',
  '多肉控的日常',
  '植物摄影集',
];

const albumDescriptions = [
  '记录我的多肉植物成长过程',
  '分享一些最近拍的照片',
  '这些都是我精心养护的宝贝',
  '希望大家喜欢我的多肉',
  '养了好久终于状态这么好了',
  '新手养肉的一些记录',
  '阳台党的小小成就',
  '用心记录每一个美好瞬间',
  '多肉带给我的快乐',
  '分享给同样喜欢多肉的你',
];

const comments = [
  '太美了！',
  '养得真好',
  '状态真棒',
  '好漂亮',
  '羡慕',
  '请问怎么养的？',
  '颜色好正',
  '学习了',
  '收藏了',
  '太治愈了',
  '好想要',
  '拍得真好',
  '赞',
  '厉害',
  '太可爱了',
];

async function main() {
  console.log('📷 开始生成相册数据...\n');

  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('❌ 没有找到用户');
    return;
  }

  console.log(`✓ 找到 ${users.length} 个用户\n`);

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  console.log('📁 创建相册...');
  let totalAlbums = 0;
  let totalImages = 0;
  let totalLikes = 0;
  let totalComments = 0;

  // 每个用户创建1-3个相册
  for (const user of users) {
    const numAlbums = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numAlbums; i++) {
      const title = randomChoice(albumTitles);
      const description = randomChoice(albumDescriptions);
      const numImages = 3 + Math.floor(Math.random() * 8); // 3-10张图片

      const images: string[] = [];
      for (let j = 0; j < numImages; j++) {
        images.push(`https://picsum.photos/seed/${Math.random()}/800/800`);
      }

      const album = await prisma.album.create({
        data: {
          userId: user.id,
          title,
          description,
          cover: images[0],
          isPublic: true,
          imageCount: numImages,
          createdAt: randomDate(lastMonth, now),
        },
      });

      // 创建图片
      for (let j = 0; j < numImages; j++) {
        await prisma.albumImage.create({
          data: {
            albumId: album.id,
            url: images[j],
            caption: j === 0 ? '封面图' : null,
            orderIdx: j,
          },
        });
      }

      totalAlbums++;
      totalImages += numImages;

      // 生成点赞
      const numLikes = Math.floor(Math.random() * users.length * 0.5);
      const likers = randomChoices(users, numLikes);

      for (const liker of likers) {
        if (liker.id === user.id) continue;

        try {
          await prisma.albumLike.create({
            data: {
              albumId: album.id,
              userId: liker.id,
            },
          });
          totalLikes++;
        } catch (e) {
          // 忽略重复点赞
        }
      }

      // 生成评论
      const numComments = Math.floor(Math.random() * users.length * 0.3);
      const commenters = randomChoices(users, numComments);

      for (const commenter of commenters) {
        if (commenter.id === user.id) continue;

        await prisma.albumComment.create({
          data: {
            albumId: album.id,
            userId: commenter.id,
            content: randomChoice(comments),
            createdAt: new Date(album.createdAt.getTime() + Math.random() * 86400000 * 7),
          },
        });
        totalComments++;
      }

      // 更新相册统计
      const likeCount = await prisma.albumLike.count({
        where: { albumId: album.id },
      });

      await prisma.album.update({
        where: { id: album.id },
        data: {
          likeCount,
          viewCount: Math.floor(Math.random() * 500),
        },
      });
    }
  }

  console.log(`✓ 创建了 ${totalAlbums} 个相册`);
  console.log(`✓ 创建了 ${totalImages} 张图片`);
  console.log(`✓ 生成了 ${totalLikes} 个点赞`);
  console.log(`✓ 生成了 ${totalComments} 条评论`);

  console.log('\n🎉 相册数据生成完成！');
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
