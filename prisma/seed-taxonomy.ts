/**
 * 三级板块 Seed:科(Category) → 属(Genus) → 品种(Species)
 *
 * 目标规模:~1000+ 品种
 * 数据来源:按社区常见分类体系穷举,包含:
 *   - 景天科(Crassulaceae):15+ 属,~400 品种
 *   - 仙人掌科(Cactaceae):12+ 属,~250 品种
 *   - 番杏科(Aizoaceae):8+ 属,~180 品种
 *   - 百合科(Asphodelaceae,十二卷亚科):5+ 属,~100 品种
 *   - 大戟科(Euphorbiaceae):4+ 属,~60 品种
 *   - 讨论区:新手村、养殖交流、交易市场、晒图等
 *
 * 独立可运行:`npx tsx prisma/seed-taxonomy.ts`
 * 会被 prisma/seed.ts 在末尾自动联跑。
 */
import { PrismaClient, CategoryKind } from '@prisma/client';
import { taxonomy } from './taxonomy-data';

const prisma = new PrismaClient();

/* ------------- 讨论区 Category(非分类型) ------------- */

const discussionCategories = [
  {
    slug: 'xinshou',
    name: '新手村',
    description: '萌新报道、小白问答,老玩家带带新人',
    cover:
      'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=800',
    icons: JSON.stringify(['🌱']),
    members: 32145,
    orderIdx: 101,
    kind: 'discussion' as CategoryKind,
  },
  {
    slug: 'yangzhi',
    name: '养殖交流',
    description: '浇水、配土、光照,经验分享和求助',
    cover:
      'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800',
    icons: JSON.stringify(['💧']),
    members: 21034,
    orderIdx: 102,
    kind: 'discussion' as CategoryKind,
  },
  {
    slug: 'shaitu',
    name: '晒图广场',
    description: '各位肉肉上色开花,来晒一晒',
    cover:
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800',
    icons: JSON.stringify(['📷']),
    members: 18520,
    orderIdx: 103,
    kind: 'discussion' as CategoryKind,
  },
  {
    slug: 'jiaoyi',
    name: '交易市场',
    description: '出肉、收肉、拼团,请文明交易',
    cover:
      'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800',
    icons: JSON.stringify(['💰']),
    members: 15623,
    orderIdx: 104,
    kind: 'market' as CategoryKind,
  },
];

export async function seedTaxonomy() {
  console.log('🌳 开始播种三级板块分类...');

  // 1. 讨论区(非分类型 Category)
  console.log('• 讨论区(非分类型 Category)');
  for (const d of discussionCategories) {
    await prisma.category.upsert({
      where: { slug: d.slug },
      update: {
        name: d.name,
        description: d.description,
        cover: d.cover,
        icons: d.icons,
        members: d.members,
        orderIdx: d.orderIdx,
        kind: d.kind,
      },
      create: d,
    });
  }

  // 2. 植物学分类:科 + 属 + 品种
  let catCount = 0;
  let genusCount = 0;
  let speciesCount = 0;

  for (const cat of taxonomy) {
    const dbCat = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        latinName: cat.latinName,
        description: cat.description,
        cover: cat.cover,
        icons: JSON.stringify([cat.icon]),
        orderIdx: cat.orderIdx,
        kind: CategoryKind.family,
      },
      create: {
        slug: cat.slug,
        name: cat.name,
        latinName: cat.latinName,
        description: cat.description,
        cover: cat.cover,
        icons: JSON.stringify([cat.icon]),
        orderIdx: cat.orderIdx,
        kind: CategoryKind.family,
      },
    });
    catCount++;

    for (let gi = 0; gi < cat.genera.length; gi++) {
      const g = cat.genera[gi];
      const dbGenus = await prisma.genus.upsert({
        where: { categoryId_slug: { categoryId: dbCat.id, slug: g.slug } },
        update: {
          name: g.name,
          latinName: g.latinName,
          description: g.description,
          cover: g.cover ?? null,
          orderIdx: gi,
        },
        create: {
          categoryId: dbCat.id,
          slug: g.slug,
          name: g.name,
          latinName: g.latinName,
          description: g.description,
          cover: g.cover ?? null,
          orderIdx: gi,
        },
      });
      genusCount++;

      // 品种批量处理(先删后建,避免 upsert 时 unique key 冲突)
      for (const s of g.species) {
        await prisma.species.upsert({
          where: { genusId_slug: { genusId: dbGenus.id, slug: s.slug } },
          update: {
            name: s.name,
            latinName: s.latinName,
            alias: JSON.stringify(s.alias ?? []),
            description: s.description ?? `${s.name}(${s.latinName})`,
            cover: s.cover ?? g.cover ?? cat.cover,
            gallery: JSON.stringify(s.gallery ?? []),
            difficulty: s.difficulty ?? 3,
            light: s.light ?? g.defaultLight ?? '全日照',
            watering: s.watering ?? g.defaultWatering ?? '见干见湿',
            hardiness: s.hardiness ?? g.defaultHardiness ?? '0°C',
            tips: JSON.stringify(s.tips ?? []),
            blooming: s.blooming ?? null,
            originRegion: s.originRegion ?? null,
            growthType: s.growthType ?? null,
          },
          create: {
            genusId: dbGenus.id,
            slug: s.slug,
            name: s.name,
            latinName: s.latinName,
            alias: JSON.stringify(s.alias ?? []),
            description: s.description ?? `${s.name}(${s.latinName})`,
            cover: s.cover ?? g.cover ?? cat.cover,
            gallery: JSON.stringify(s.gallery ?? []),
            difficulty: s.difficulty ?? 3,
            light: s.light ?? g.defaultLight ?? '全日照',
            watering: s.watering ?? g.defaultWatering ?? '见干见湿',
            hardiness: s.hardiness ?? g.defaultHardiness ?? '0°C',
            tips: JSON.stringify(s.tips ?? []),
            blooming: s.blooming ?? null,
            originRegion: s.originRegion ?? null,
            growthType: s.growthType ?? null,
          },
        });
        speciesCount++;
      }
    }
  }

  console.log(
    `   ✓ Category: ${catCount + discussionCategories.length},Genus: ${genusCount},Species: ${speciesCount}`
  );

  // 把旧帖子 (boardId) 自动挂到同名 Category
  console.log('• 兼容:回填旧帖子的 categoryId');
  const migrated = await prisma.$executeRaw`
    UPDATE posts p
    INNER JOIN boards b ON p.boardId = b.id
    INNER JOIN categories c ON c.name = b.name
    SET p.categoryId = c.id
    WHERE p.categoryId IS NULL
  `;
  console.log(`   ✓ ${migrated} 条旧帖子挂到对应 Category`);
}

if (require.main === module) {
  seedTaxonomy()
    .catch((e) => {
      console.error('❌ 失败:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
