/**
 * 单独的 seed:插入 4 个示例生命周期(journal)帖子。
 * 跑法:DATABASE_URL=... node scripts/seed-journals.mjs
 *
 * 不会覆盖现有 journal 帖,会先按 title 去重(发现同名跳过)。
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const IMG = (kw) =>
  `https://images.unsplash.com/photo-${kw}?w=800&auto=format&fit=crop`;

const POOL = {
  succulent: [
    '1485955900006-10f4d324d411',
    '1509423350716-97f9360b4e09',
    '1459411552884-841db9b3cc2a',
    '1509587584298-0f3b3a3a1797',
    '1466692476868-9ee5a3a3e93b',
  ],
  cactus: ['1416879595882-3373a0480b5b', '1520412099551-62b6bafeb5bb'],
  flower: ['1490750967868-88aa4486c946'],
};

function daysAgo(n) {
  return new Date(Date.now() - n * 86400 * 1000);
}

/**
 * 4 个不同主题的生命周期帖
 */
function buildJournals(opts) {
  const { authorId, categoryIdJingtian, categoryIdFanxing, speciesIds } = opts;
  return [
    {
      title: '【90 天日记】我的初代红宝石,从枯黄到爆崽',
      subjectName: '红宝石 · 阳台 1 号',
      categoryId: categoryIdJingtian,
      speciesId: speciesIds.luoxu ?? null,
      startDate: daysAgo(95),
      endDate: null,
      endReason: 'alive',
      cover: IMG(POOL.succulent[0]),
      tags: ['日记', '景天', '红宝石'],
      content: '记录我家第一棵红宝石从入手到爆崽的 90 天。',
      entries: [
        {
          d: 95,
          stage: 'germinate',
          note: '今天到家,叶片有点蔫,根系不太好,先放阴凉处缓苗。',
          imgs: [IMG(POOL.succulent[0])],
        },
        {
          d: 80,
          stage: 'repot',
          note: '第 15 天:换上颗粒土,加了一点缓释肥。土干透了再浇。',
          imgs: [IMG(POOL.succulent[1])],
        },
        {
          d: 60,
          stage: 'growing',
          note: '第 35 天:已经长出新叶,颜色慢慢正常。逐步增加光照。',
          imgs: [IMG(POOL.succulent[2])],
        },
        {
          d: 30,
          stage: 'growing',
          note: '第 65 天:终于变红宝石色了!阳光给力。',
          imgs: [IMG(POOL.succulent[3]), IMG(POOL.succulent[4])],
        },
        {
          d: 5,
          stage: 'flowering',
          note: '第 90 天:出花箭啦!想不到这么快。',
          imgs: [IMG(POOL.flower[0])],
        },
      ],
    },
    {
      title: '【失败记录】生石花蜕皮太晚被我浇水浇死了',
      subjectName: '雪白姬 · 第 3 号',
      categoryId: categoryIdFanxing,
      speciesId: null,
      startDate: daysAgo(180),
      endDate: daysAgo(20),
      endReason: 'withered',
      cover: IMG(POOL.cactus[0]),
      tags: ['日记', '番杏', '生石花', '失败'],
      content: '记录一棵雪白姬最后的日子,后人引以为戒。',
      entries: [
        {
          d: 180,
          stage: 'germinate',
          note: '入手第一天,状态很好,胖嘟嘟的。',
          imgs: [IMG(POOL.cactus[0])],
        },
        {
          d: 120,
          stage: 'growing',
          note: '第 60 天:养了两个月,准备进入蜕皮期。',
          imgs: [IMG(POOL.cactus[1])],
        },
        {
          d: 60,
          stage: 'withering',
          note: '第 120 天:皮蜕到一半,我以为缺水浇了一次,结果开始软。',
          imgs: [],
        },
        {
          d: 30,
          stage: 'withering',
          note: '第 150 天:已经化水黑腐,无力回天。',
          imgs: [],
        },
        {
          d: 20,
          stage: 'other',
          note: '第 160 天:正式宣告死亡。教训:蜕皮期千万不能浇水。',
          imgs: [],
        },
      ],
    },
    {
      title: '【度夏挑战】华北 38℃ 阳台,景天能不能扛过去?',
      subjectName: '阳台景天小队',
      categoryId: categoryIdJingtian,
      speciesId: speciesIds.jiwawa ?? null,
      startDate: daysAgo(45),
      endDate: null,
      endReason: 'alive',
      cover: IMG(POOL.succulent[1]),
      tags: ['度夏', '景天', '日记'],
      content: '今年阳台 7-8 月最高 38°C,记录每天的状态。',
      entries: [
        {
          d: 45,
          stage: 'summer',
          note: 'Day 1:38℃,小风扇全天,遮阳网 70%。',
          imgs: [IMG(POOL.succulent[1])],
        },
        {
          d: 30,
          stage: 'summer',
          note: 'Day 15:整体没问题。沿盆边浇了一次小水,傍晚。',
          imgs: [IMG(POOL.succulent[2])],
        },
        {
          d: 15,
          stage: 'pest',
          note: 'Day 30:发现一只介壳虫,蘸酒精棉签擦掉,喷一遍护花神。',
          imgs: [],
        },
        {
          d: 7,
          stage: 'summer',
          note: 'Day 38:温度回落到 32℃,全员存活,胜利在望。',
          imgs: [IMG(POOL.succulent[3])],
        },
      ],
    },
    {
      title: '播种 100 天:从黄豆大小到指甲盖',
      subjectName: '玉露宝宝(实生)',
      categoryId: categoryIdFanxing,
      speciesId: null,
      startDate: daysAgo(102),
      endDate: null,
      endReason: 'alive',
      cover: IMG(POOL.succulent[2]),
      tags: ['实生', '玉露', '日记', '播种'],
      content: '从一袋黄豆大小的种子开始,记录玉露宝宝的成长。',
      entries: [
        {
          d: 102,
          stage: 'germinate',
          note: 'Day 1:撒下种子,泥炭 + 蛭石,保鲜膜密闭高湿度。',
          imgs: [IMG(POOL.succulent[0])],
        },
        {
          d: 90,
          stage: 'germinate',
          note: 'Day 12:90% 发芽率,小苗探出头来。',
          imgs: [IMG(POOL.succulent[1])],
        },
        {
          d: 60,
          stage: 'growing',
          note: 'Day 42:撤膜,逐步通风。每周浸盆一次。',
          imgs: [IMG(POOL.succulent[2])],
        },
        {
          d: 30,
          stage: 'growing',
          note: 'Day 72:最大的已经有半粒大米。',
          imgs: [IMG(POOL.succulent[3])],
        },
        {
          d: 1,
          stage: 'growing',
          note: 'Day 101:指甲盖大小,叶片饱满,准备给最大的几棵分单杯。',
          imgs: [IMG(POOL.succulent[4])],
        },
      ],
    },
  ];
}

async function main() {
  // 取一个 author(level 高的)
  const author = await prisma.user.findFirst({
    where: { level: { gte: 5 } },
    orderBy: { level: 'desc' },
  });
  if (!author) throw new Error('找不到合适的作者用户(level >= 5)');

  // 拿景天 / 番杏分类
  const [jingtian, fanxing] = await Promise.all([
    prisma.category.findUnique({ where: { slug: 'jingtian' } }),
    prisma.category.findUnique({ where: { slug: 'fanxing' } }),
  ]);
  if (!jingtian || !fanxing) throw new Error('景天/番杏分类不存在');

  // 拿一些品种 id 用于关联
  const sps = await prisma.species.findMany({
    where: { slug: { in: ['luoxu', 'jiwawa'] } },
    select: { id: true, slug: true },
  });
  const speciesIds = Object.fromEntries(sps.map((s) => [s.slug, s.id]));

  const journals = buildJournals({
    authorId: author.id,
    categoryIdJingtian: jingtian.id,
    categoryIdFanxing: fanxing.id,
    speciesIds,
  });

  let created = 0;
  let skipped = 0;
  for (const j of journals) {
    const existing = await prisma.post.findFirst({
      where: { type: 'journal', title: j.title },
    });
    if (existing) {
      skipped += 1;
      console.log(`  ↷ skip: ${j.title}`);
      continue;
    }

    await prisma.post.create({
      data: {
        type: 'journal',
        title: j.title,
        content: j.content,
        contentText: j.content,
        cover: j.cover,
        images: JSON.stringify([j.cover]),
        tags: JSON.stringify(j.tags),
        views: Math.floor(Math.random() * 2000) + 200,
        shares: Math.floor(Math.random() * 30),
        authorId: author.id,
        categoryId: j.categoryId,
        speciesId: j.speciesId,
        createdAt: j.startDate,
        journal: {
          create: {
            subjectName: j.subjectName,
            startDate: j.startDate,
            endDate: j.endDate,
            endReason: j.endReason,
            speciesId: j.speciesId,
            entries: {
              create: j.entries.map((e, i) => ({
                entryDate: daysAgo(e.d),
                stage: e.stage,
                note: e.note,
                images: JSON.stringify(e.imgs),
                orderIdx: i,
              })),
            },
          },
        },
      },
    });
    created += 1;
    console.log(`  ✓ ${j.title}`);
  }

  console.log(`\nDone. created=${created}, skipped=${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
