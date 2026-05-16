import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 扩展的植物数据 - 更多科属种
const expandedPlantData = {
  '大戟科': {
    latinName: 'Euphorbiaceae',
    genera: {
      '大戟属': {
        latinName: 'Euphorbia',
        species: [
          { name: '彩云阁', latinName: 'Euphorbia trigona' },
          { name: '春峰', latinName: 'Euphorbia lactea' },
          { name: '铁甲丸', latinName: 'Euphorbia bupleurifolia' },
          { name: '麒麟掌', latinName: 'Euphorbia neriifolia' },
          { name: '皱叶麒麟', latinName: 'Euphorbia flanaganii' },
        ],
      },
      '霸王鞭属': {
        latinName: 'Pedilanthus',
        species: [
          { name: '霸王鞭', latinName: 'Pedilanthus tithymaloides' },
          { name: '红雀珊瑚', latinName: 'Pedilanthus bracteatus' },
        ],
      },
    },
  },
  '萝藦科': {
    latinName: 'Asclepiadaceae',
    genera: {
      '豹皮花属': {
        latinName: 'Stapelia',
        species: [
          { name: '豹皮花', latinName: 'Stapelia variegata' },
          { name: '大花犀角', latinName: 'Stapelia gigantea' },
          { name: '紫龙角', latinName: 'Stapelia purpurea' },
        ],
      },
      '球兰属': {
        latinName: 'Hoya',
        species: [
          { name: '球兰', latinName: 'Hoya carnosa' },
          { name: '心叶球兰', latinName: 'Hoya kerrii' },
          { name: '卷叶球兰', latinName: 'Hoya compacta' },
        ],
      },
    },
  },
  '菊科': {
    latinName: 'Asteraceae',
    genera: {
      '千里光属': {
        latinName: 'Senecio',
        species: [
          { name: '佛珠', latinName: 'Senecio rowleyanus' },
          { name: '情人泪', latinName: 'Senecio herreianus' },
          { name: '紫弦月', latinName: 'Senecio serpens' },
          { name: '七宝树', latinName: 'Senecio articulatus' },
        ],
      },
    },
  },
  '葡萄科': {
    latinName: 'Vitaceae',
    genera: {
      '白粉藤属': {
        latinName: 'Cissus',
        species: [
          { name: '翡翠阁', latinName: 'Cissus quadrangularis' },
          { name: '酒瓶兰', latinName: 'Cissus rotundifolia' },
        ],
      },
    },
  },
  '马齿苋科': {
    latinName: 'Portulacaceae',
    genera: {
      '回欢草属': {
        latinName: 'Anacampseros',
        species: [
          { name: '吹雪之松', latinName: 'Anacampseros rufescens' },
          { name: '樱吹雪', latinName: 'Anacampseros telephiastrum' },
        ],
      },
      '马齿苋属': {
        latinName: 'Portulaca',
        species: [
          { name: '金枝玉叶', latinName: 'Portulaca afra' },
          { name: '雅乐之舞', latinName: 'Portulaca afra variegata' },
        ],
      },
    },
  },
  '风信子科': {
    latinName: 'Hyacinthaceae',
    genera: {
      '风信子属': {
        latinName: 'Hyacinthus',
        species: [
          { name: '风信子', latinName: 'Hyacinthus orientalis' },
        ],
      },
      '绵枣儿属': {
        latinName: 'Scilla',
        species: [
          { name: '绵枣儿', latinName: 'Scilla scilloides' },
          { name: '蓝铃花', latinName: 'Scilla siberica' },
        ],
      },
    },
  },
  '天门冬科': {
    latinName: 'Asparagaceae',
    genera: {
      '芦荟属': {
        latinName: 'Aloe',
        species: [
          { name: '库拉索芦荟', latinName: 'Aloe vera' },
          { name: '不夜城芦荟', latinName: 'Aloe nobilis' },
          { name: '木立芦荟', latinName: 'Aloe arborescens' },
          { name: '珍珠芦荟', latinName: 'Aloe descoingsii' },
        ],
      },
      '十二卷属': {
        latinName: 'Haworthia',
        species: [
          { name: '玉露', latinName: 'Haworthia cooperi' },
          { name: '寿', latinName: 'Haworthia retusa' },
          { name: '万象', latinName: 'Haworthia maughanii' },
          { name: '玉扇', latinName: 'Haworthia truncata' },
          { name: '条纹十二卷', latinName: 'Haworthia fasciata' },
        ],
      },
    },
  },
  '鸭跖草科': {
    latinName: 'Commelinaceae',
    genera: {
      '紫竹梅属': {
        latinName: 'Tradescantia',
        species: [
          { name: '紫竹梅', latinName: 'Tradescantia pallida' },
          { name: '吊竹梅', latinName: 'Tradescantia zebrina' },
        ],
      },
    },
  },
};

// 帖子模板（中文）
const postTemplatesZh = [
  {
    title: '{plant}养护日记 - 第{day}天',
    content: '今天是养{plant}的第{day}天了！\n\n最近的变化：\n• 叶片更加饱满了\n• 颜色也更鲜艳\n• 根系生长良好\n\n继续保持现在的养护方式，期待它越来越美！',
    tags: ['养护日记', '成长记录'],
  },
  {
    title: '{plant}上盆记录',
    content: '今天给新入手的{plant}换了个盆。\n\n配土比例：\n• 泥炭土 40%\n• 珍珠岩 30%\n• 蛭石 20%\n• 赤玉土 10%\n\n希望它能快速服盆，健康成长！',
    tags: ['上盆', '配土'],
  },
  {
    title: '关于{plant}的一些冷知识',
    content: '{plant}是一种非常有趣的植物：\n\n1. 原产地环境独特\n2. 具有特殊的生长习性\n3. 在当地有特殊的文化意义\n\n了解这些背景知识，能帮助我们更好地养护它。',
    tags: ['科普', '冷知识'],
  },
  {
    title: '{plant}浇水心得',
    content: '总结一下{plant}的浇水经验：\n\n春秋季：7-10天一次\n夏季：控水，15-20天一次\n冬季：断水或一个月一次\n\n浇水原则：宁干勿湿，观察叶片状态。',
    tags: ['浇水', '养护技巧'],
  },
  {
    title: '我的{plant}徒长了怎么办？',
    content: '发现{plant}有点徒长的迹象，赶紧采取措施：\n\n1. 增加光照时间\n2. 减少浇水频率\n3. 加强通风\n4. 考虑砍头重新扦插\n\n希望能及时挽救回来！',
    tags: ['徒长', '问题解决'],
  },
  {
    title: '{plant}配色搭配分享',
    content: '{plant}和其他多肉搭配在一起超级好看！\n\n推荐搭配：\n• 颜色对比强烈的品种\n• 形态互补的品种\n• 生长习性相似的品种\n\n组盆的乐趣就在于此！',
    tags: ['组盆', '搭配'],
  },
];

// 帖子模板（英文）
const postTemplatesEn = [
  {
    title: 'Growing {plant} - Day {day}',
    content: 'Day {day} of growing my {plant}!\n\nRecent changes:\n• Leaves are fuller\n• Colors are more vibrant\n• Root system developing well\n\nExcited to see more progress!',
    tags: ['growth diary', 'progress'],
  },
  {
    title: 'Repotting My {plant}',
    content: 'Just repotted my new {plant} today.\n\nSoil mix:\n• Peat moss 40%\n• Perlite 30%\n• Vermiculite 20%\n• Akadama 10%\n\nHoping for quick recovery!',
    tags: ['repotting', 'soil mix'],
  },
  {
    title: 'Interesting Facts About {plant}',
    content: '{plant} is such a fascinating plant:\n\n1. Unique native habitat\n2. Special growth patterns\n3. Cultural significance\n\nKnowing these helps us care for them better.',
    tags: ['facts', 'education'],
  },
  {
    title: '{plant} Watering Tips',
    content: 'My watering schedule for {plant}:\n\nSpring/Fall: Every 7-10 days\nSummer: Every 15-20 days\nWinter: Monthly or less\n\nRule: When in doubt, wait it out!',
    tags: ['watering', 'care tips'],
  },
];

// 评论模板（中文）
const commentsZh = [
  '养得真好！',
  '学习了',
  '我的也是这样',
  '太美了',
  '请问在哪买的？',
  '同款！',
  '状态真棒',
  '羡慕',
  '收藏了',
  '感谢分享',
  '我也想养',
  '好看',
  '赞',
  '厉害',
  '请教一下配土',
  '多久浇一次水？',
  '需要施肥吗？',
  '这个好养吗？',
];

// 评论模板（英文）
const commentsEn = [
  'Beautiful!',
  'Thanks for sharing',
  'Same here',
  'Gorgeous',
  'Where did you get it?',
  'Love it',
  'Amazing',
  'Goals',
  'Saved',
  'Helpful',
  'Want one',
  'Nice',
  'Great',
  'Awesome',
  'Soil mix?',
  'Watering schedule?',
  'Fertilizer?',
  'Easy to care?',
];

function randomDate() {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const diff = now.getTime() - lastMonth.getTime();
  return new Date(lastMonth.getTime() + Math.random() * diff);
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomChoices<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

async function main() {
  console.log('🌱 开始扩展植物数据...\n');

  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('❌ 没有找到用户');
    return;
  }
  console.log(`✓ 找到 ${users.length} 个用户\n`);

  console.log('📁 创建新的科属种...');
  const allSpecies: any[] = [];

  for (const [categoryName, categoryData] of Object.entries(expandedPlantData)) {
    let category = await prisma.board.findUnique({ where: { slug: categoryName } });
    if (!category) {
      category = await prisma.board.create({
        data: {
          name: categoryName,
          slug: categoryName,
          latinName: categoryData.latinName,
          description: `${categoryName}相关的多肉植物`,
          icons: JSON.stringify(['🌿']),
          cover: '',
          kind: 'family',
        },
      });
      console.log(`  ✓ 创建科: ${categoryName}`);
    }

    for (const [genusName, genusData] of Object.entries(categoryData.genera)) {
      let genus = await prisma.genus.findFirst({
        where: { slug: genusName, boardId: category.id },
      });
      if (!genus) {
        genus = await prisma.genus.create({
          data: {
            name: genusName,
            slug: genusName,
            latinName: genusData.latinName,
            description: `${genusName}相关品种`,
            boardId: category.id,
          },
        });
        console.log(`    ✓ 创建属: ${genusName}`);
      }

      for (const speciesData of genusData.species) {
        let species = await prisma.species.findFirst({
          where: { slug: speciesData.name, genusId: genus.id },
        });
        if (!species) {
          species = await prisma.species.create({
            data: {
              name: speciesData.name,
              slug: speciesData.name,
              latinName: speciesData.latinName,
              description: `${speciesData.name}（${speciesData.latinName}）是${genusName}的一个品种，具有独特的观赏价值。`,
              genusId: genus.id,
              cover: '',
              gallery: '[]',
              light: ['全日照', '明亮散射光', '半阴'][Math.floor(Math.random() * 3)],
              watering: ['见干见湿', '宁干勿湿', '保持湿润'][Math.floor(Math.random() * 3)],
              hardiness: ['0°C以上', '5°C以上', '10°C以上'][Math.floor(Math.random() * 3)],
              difficulty: 1 + Math.floor(Math.random() * 3),
              tips: '[]',
            },
          });
          console.log(`      ✓ 创建种: ${speciesData.name}`);
        }
        allSpecies.push(species);
      }
    }
  }
  console.log(`✓ 创建了 ${allSpecies.length} 个新品种\n`);

  console.log('📝 生成帖子...');
  const posts: any[] = [];

  for (const species of allSpecies) {
    const numPosts = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numPosts; i++) {
      const isEnglish = Math.random() > 0.75;
      const template = randomChoice(isEnglish ? postTemplatesEn : postTemplatesZh);
      const author = randomChoice(users);
      const day = 10 + Math.floor(Math.random() * 90);

      const title = template.title.replace('{plant}', species.name).replace('{day}', day.toString());
      const content = template.content.replace(/{plant}/g, species.name).replace(/{day}/g, day.toString());

      const post = await prisma.post.create({
        data: {
          title,
          content,
          contentText: content,
          type: 'short',
          authorId: author.id,
          speciesId: species.id,
          tags: JSON.stringify(template.tags),
          createdAt: randomDate(),
          views: Math.floor(Math.random() * 800),
        },
      });

      posts.push(post);
    }
  }
  console.log(`✓ 生成了 ${posts.length} 个帖子\n`);

  console.log('💬 生成互动...');
  let likeCount = 0;
  let collectCount = 0;
  let commentCount = 0;

  for (const post of posts) {
    const numInteractions = Math.floor(Math.random() * users.length * 0.5);
    const interactUsers = randomChoices(users, numInteractions);

    for (const user of interactUsers) {
      if (Math.random() > 0.25) {
        try {
          await prisma.postLike.create({
            data: { userId: user.id, postId: post.id },
          });
          likeCount++;
        } catch (e) {}
      }

      if (Math.random() > 0.7) {
        try {
          await prisma.postCollect.create({
            data: { userId: user.id, postId: post.id },
          });
          collectCount++;
        } catch (e) {}
      }

      if (Math.random() > 0.4) {
        const isEnglish = post.title.match(/[a-zA-Z]/) && Math.random() > 0.5;
        const commentText = randomChoice(isEnglish ? commentsEn : commentsZh);

        await prisma.comment.create({
          data: {
            content: commentText,
            authorId: user.id,
            postId: post.id,
            createdAt: new Date(post.createdAt.getTime() + Math.random() * 86400000 * 7),
          },
        });
        commentCount++;
      }
    }
  }

  console.log(`✓ 生成了 ${likeCount} 个点赞`);
  console.log(`✓ 生成了 ${collectCount} 个收藏`);
  console.log(`✓ 生成了 ${commentCount} 条评论\n`);

  console.log('🎉 扩展数据生成完成！');
  console.log(`\n新增：`);
  console.log(`  - ${allSpecies.length} 个品种`);
  console.log(`  - ${posts.length} 个帖子`);
  console.log(`  - ${likeCount} 个点赞`);
  console.log(`  - ${collectCount} 个收藏`);
  console.log(`  - ${commentCount} 条评论`);
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
