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

async function main() {
  console.log('🏆 开始生成摄影大赛数据...\n');

  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('❌ 没有找到用户');
    return;
  }

  const species = await prisma.species.findMany({
    take: 50,
  });

  console.log(`✓ 找到 ${users.length} 个用户`);
  console.log(`✓ 找到 ${species.length} 个品种\n`);

  // 创建大赛
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const contests = [
    {
      title: '2024春季多肉摄影大赛',
      description: '展示你的多肉植物在春天的美丽姿态，分享养护心得，赢取丰厚奖品！',
      theme: '春季',
      status: 'active' as const,
      startAt: lastMonth,
      endAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      votingStartAt: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
      votingEndAt: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
      rules: [
        '作品必须为原创摄影作品',
        '每人最多提交3个作品',
        '作品需包含多肉植物',
        '禁止使用过度修图',
        '遵守社区规范',
      ],
      prizes: [
        '一等奖（1名）：高端相机 + 多肉礼包',
        '二等奖（3名）：专业补光灯 + 多肉礼包',
        '三等奖（10名）：多肉礼包',
        '参与奖：所有参赛者获得钻石奖励',
      ],
      featured: true,
    },
    {
      title: '「石莲花之美」主题摄影赛',
      description: '聚焦石莲花属植物，捕捉它们独特的形态和色彩。',
      theme: '石莲花',
      status: 'voting' as const,
      startAt: new Date(lastMonth.getTime() + 5 * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      votingStartAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      votingEndAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      rules: [
        '作品主体必须为石莲花属植物',
        '每人最多提交2个作品',
        '鼓励展示植物细节',
      ],
      prizes: [
        '一等奖（1名）：稀有石莲花品种',
        '二等奖（2名）：石莲花组合盆栽',
        '三等奖（5名）：养护工具套装',
      ],
      featured: true,
    },
    {
      title: '夏日多肉生存挑战摄影展',
      description: '记录你的多肉如何度过炎热的夏天，分享度夏经验。',
      theme: '度夏',
      status: 'upcoming' as const,
      startAt: nextMonth,
      endAt: new Date(nextMonth.getTime() + 45 * 24 * 60 * 60 * 1000),
      votingStartAt: new Date(nextMonth.getTime() + 40 * 24 * 60 * 60 * 1000),
      votingEndAt: new Date(nextMonth.getTime() + 50 * 24 * 60 * 60 * 1000),
      rules: [
        '展示多肉植物的度夏状态',
        '可以包含养护环境',
        '每人最多提交3个作品',
      ],
      prizes: [
        '一等奖（1名）：遮阳网 + 风扇套装',
        '二等奖（3名）：度夏专用花盆',
        '三等奖（10名）：多肉营养液',
      ],
      featured: false,
    },
  ];

  console.log('📝 创建大赛...');
  const createdContests = [];

  for (const contestData of contests) {
    const creator = randomChoice(users);
    const contest = await prisma.photoContest.create({
      data: {
        ...contestData,
        rules: JSON.stringify(contestData.rules),
        prizes: JSON.stringify(contestData.prizes),
        createdBy: creator.id,
      },
    });
    createdContests.push(contest);
    console.log(`  ✓ 创建大赛: ${contest.title}`);
  }

  // 为进行中和投票中的大赛生成参赛作品
  console.log('\n📷 生成参赛作品...');
  let totalEntries = 0;
  let totalVotes = 0;

  for (const contest of createdContests) {
    if (contest.status === 'upcoming') continue;

    const numEntries = 15 + Math.floor(Math.random() * 25); // 15-40个作品
    const participants = randomChoices(users, numEntries);

    for (const participant of participants) {
      const selectedSpecies = randomChoice(species);
      const entryTitles = [
        `我的${selectedSpecies.name}`,
        `${selectedSpecies.name}的春日写真`,
        `晒晒我养的${selectedSpecies.name}`,
        `${selectedSpecies.name}成长记录`,
        `美丽的${selectedSpecies.name}`,
        `${selectedSpecies.name}特写`,
        `${selectedSpecies.name}的色彩`,
        `阳光下的${selectedSpecies.name}`,
      ];

      const entry = await prisma.contestEntry.create({
        data: {
          contestId: contest.id,
          userId: participant.id,
          title: randomChoice(entryTitles),
          description: `这是我精心养护的${selectedSpecies.name}，希望大家喜欢！`,
          imageUrl: `https://picsum.photos/seed/${Math.random()}/800/800`,
          images: JSON.stringify([
            `https://picsum.photos/seed/${Math.random()}/800/800`,
            `https://picsum.photos/seed/${Math.random()}/800/800`,
          ]),
          speciesId: selectedSpecies.id,
          approved: true,
          createdAt: randomDate(contest.startAt, new Date()),
        },
      });

      totalEntries++;

      // 为作品生成投票（仅投票中的大赛）
      if (contest.status === 'voting' || contest.status === 'active') {
        const numVotes = Math.floor(Math.random() * users.length * 0.6);
        const voters = randomChoices(users, numVotes);

        for (const voter of voters) {
          if (voter.id === participant.id) continue; // 不能给自己投票

          try {
            await prisma.contestVote.create({
              data: {
                entryId: entry.id,
                userId: voter.id,
              },
            });
            totalVotes++;
          } catch (e) {
            // 忽略重复投票
          }
        }

        // 更新作品投票数
        const voteCount = await prisma.contestVote.count({
          where: { entryId: entry.id },
        });
        await prisma.contestEntry.update({
          where: { id: entry.id },
          data: { voteCount },
        });
      }
    }

    // 更新大赛统计
    const entryCount = await prisma.contestEntry.count({
      where: { contestId: contest.id },
    });
    const voteCount = await prisma.contestVote.count({
      where: {
        entry: {
          contestId: contest.id,
        },
      },
    });

    await prisma.photoContest.update({
      where: { id: contest.id },
      data: {
        entryCount,
        voteCount,
        participantCount: entryCount,
      },
    });

    console.log(`  ✓ ${contest.title}: ${entryCount} 个作品, ${voteCount} 票`);
  }

  // 为投票最高的作品设置获奖者
  console.log('\n🏅 设置获奖者...');
  for (const contest of createdContests) {
    if (contest.status !== 'voting') continue;

    const topEntries = await prisma.contestEntry.findMany({
      where: {
        contestId: contest.id,
        approved: true,
      },
      orderBy: {
        voteCount: 'desc',
      },
      take: 6,
    });

    if (topEntries.length >= 1) {
      await prisma.contestWinner.create({
        data: {
          contestId: contest.id,
          entryId: topEntries[0].id,
          rank: 1,
          prize: '一等奖',
        },
      });
      console.log(`  ✓ ${contest.title} 一等奖: ${topEntries[0].title}`);
    }

    if (topEntries.length >= 2) {
      await prisma.contestWinner.create({
        data: {
          contestId: contest.id,
          entryId: topEntries[1].id,
          rank: 2,
          prize: '二等奖',
        },
      });
      console.log(`  ✓ ${contest.title} 二等奖: ${topEntries[1].title}`);
    }

    if (topEntries.length >= 3) {
      await prisma.contestWinner.create({
        data: {
          contestId: contest.id,
          entryId: topEntries[2].id,
          rank: 3,
          prize: '三等奖',
        },
      });
      console.log(`  ✓ ${contest.title} 三等奖: ${topEntries[2].title}`);
    }
  }

  console.log('\n🎉 摄影大赛数据生成完成！');
  console.log(`\n总计：`);
  console.log(`  - ${createdContests.length} 个大赛`);
  console.log(`  - ${totalEntries} 个参赛作品`);
  console.log(`  - ${totalVotes} 次投票`);
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
