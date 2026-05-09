/**
 * 补充 3 条成长日记帖(第二批)。
 * 跑法:
 *   DATABASE_URL=... node scripts/seed-journals-batch2.mjs
 * 服务器:
 *   docker compose run --rm -v $(pwd)/scripts:/app/scripts:ro next node scripts/seed-journals-batch2.mjs
 *
 * 按 title 去重,跑两次也不会重复插入。
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

function buildJournals({ authorId, categoryIdJingtian, categoryIdFanxing, speciesIds }) {
  return [
    {
      title: '【120 天日记】吉娃娃从单头到爆群,亲历分株 3 次',
      subjectName: '吉娃娃 · 阳台 4 号',
      categoryId: categoryIdJingtian,
      speciesId: speciesIds.jiwawa ?? null,
      startDate: daysAgo(125),
      endDate: null,
      endReason: 'alive',
      cover: IMG(POOL.succulent[1]),
      tags: ['日记', '吉娃娃', '分株', '景天'],
      content: '从一棵小苗到爆群的 120 天,记录每次分株的关键时点。',
      entries: [
        { d: 125, stage: 'germinate', note: 'Day 1:刚到家,小单头,叶尖有点焦但根系完整。', imgs: [IMG(POOL.succulent[1])] },
        { d: 100, stage: 'repot',     note: 'Day 25:换大盆,加了基肥,叶尖恢复绿色。',     imgs: [IMG(POOL.succulent[2])] },
        { d: 70,  stage: 'growing',   note: 'Day 55:中心冒出第一个侧芽。',                imgs: [IMG(POOL.succulent[3])] },
        { d: 40,  stage: 'cutting',   note: 'Day 85:6 个侧芽,分株 3 株送朋友。',          imgs: [IMG(POOL.succulent[4])] },
        { d: 10,  stage: 'flowering', note: 'Day 115:抽出花箭,粉色小花。',                imgs: [IMG(POOL.flower[0])] },
      ],
    },
    {
      title: '【冬季实生】肉锥实生苗 60 天观察记',
      subjectName: '肉锥宝宝盘',
      categoryId: categoryIdFanxing,
      speciesId: null,
      startDate: daysAgo(62),
      endDate: null,
      endReason: 'alive',
      cover: IMG(POOL.cactus[1]),
      tags: ['实生', '肉锥', '冬季', '番杏', '日记'],
      content: '冬季暖气房里播肉锥种子,记录小苗 60 天成长。',
      entries: [
        { d: 62, stage: 'germinate', note: 'Day 1:种子撒下,泥炭+小蛭石,保鲜膜密闭。', imgs: [IMG(POOL.cactus[0])] },
        { d: 50, stage: 'germinate', note: 'Day 12:出苗率 80%,小绿点冒出来了。',       imgs: [IMG(POOL.cactus[1])] },
        { d: 30, stage: 'growing',   note: 'Day 32:撤膜,通风,3 天浸盆一次。',         imgs: [IMG(POOL.succulent[0])] },
        { d: 5,  stage: 'growing',   note: 'Day 57:小苗已经像迷你葡萄,等开春换盆。',   imgs: [IMG(POOL.succulent[2])] },
      ],
    },
    {
      title: '【虫害实录】发现介壳虫,7 天彻底清理',
      subjectName: '红宝石 · 小阳台',
      categoryId: categoryIdJingtian,
      speciesId: speciesIds.luoxu ?? null,
      startDate: daysAgo(8),
      endDate: null,
      endReason: 'alive',
      cover: IMG(POOL.succulent[3]),
      tags: ['虫害', '介壳虫', '景天', '红宝石'],
      content: '阳台温度回升,惊现介壳虫。完整记录处理过程。',
      entries: [
        { d: 8, stage: 'pest',     note: 'Day 1:叶腋发现白色斑点,揭开是介壳虫!吓死。',   imgs: [IMG(POOL.succulent[0])] },
        { d: 7, stage: 'pest',     note: 'Day 2:酒精棉签一只一只擦掉,清点共 28 只。',     imgs: [] },
        { d: 6, stage: 'pest',     note: 'Day 3:护花神 1500 倍喷一遍。',                  imgs: [] },
        { d: 4, stage: 'pest',     note: 'Day 5:复检,叶背还有 3 只漏网,继续擦。',       imgs: [] },
        { d: 1, stage: 'growing',  note: 'Day 8:无新发现,植株状态稳定,警报解除。',       imgs: [IMG(POOL.succulent[3])] },
      ],
    },
  ];
}

async function main() {
  const author = await prisma.user.findFirst({
    where: { level: { gte: 5 } },
    orderBy: { level: 'desc' },
  });
  if (!author) throw new Error('找不到合适的作者用户(level >= 5)');

  const [jingtian, fanxing] = await Promise.all([
    prisma.category.findUnique({ where: { slug: 'jingtian' } }),
    prisma.category.findUnique({ where: { slug: 'fanxing' } }),
  ]);
  if (!jingtian || !fanxing) throw new Error('景天/番杏分类不存在');

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
        views: Math.floor(Math.random() * 1500) + 100,
        shares: Math.floor(Math.random() * 20),
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
