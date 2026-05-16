import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 多肉植物科属种数据
const succulentData = {
  '景天科': {
    latinName: 'Crassulaceae',
    genera: {
      '景天属': {
        latinName: 'Sedum',
        species: [
          { name: '八宝景天', latinName: 'Sedum spectabile' },
          { name: '三七景天', latinName: 'Sedum aizoon' },
          { name: '垂盆草', latinName: 'Sedum sarmentosum' },
          { name: '佛甲草', latinName: 'Sedum lineare' },
        ],
      },
      '石莲花属': {
        latinName: 'Echeveria',
        species: [
          { name: '黑王子', latinName: 'Echeveria Black Prince' },
          { name: '吉娃娃', latinName: 'Echeveria chihuahuaensis' },
          { name: '蓝石莲', latinName: 'Echeveria peacockii' },
          { name: '玉蝶', latinName: 'Echeveria secunda' },
          { name: '锦晃星', latinName: 'Echeveria pulvinata' },
        ],
      },
      '长生草属': {
        latinName: 'Sempervivum',
        species: [
          { name: '观音莲', latinName: 'Sempervivum tectorum' },
          { name: '紫牡丹', latinName: 'Sempervivum Purple' },
          { name: '大红卷绢', latinName: 'Sempervivum Red' },
        ],
      },
    },
  },
  '仙人掌科': {
    latinName: 'Cactaceae',
    genera: {
      '仙人球属': {
        latinName: 'Echinocactus',
        species: [
          { name: '金琥', latinName: 'Echinocactus grusonii' },
          { name: '绯花玉', latinName: 'Gymnocalycium mihanovichii' },
          { name: '短毛丸', latinName: 'Echinopsis eyriesii' },
        ],
      },
      '仙人掌属': {
        latinName: 'Opuntia',
        species: [
          { name: '仙人掌', latinName: 'Opuntia stricta' },
          { name: '金武扇', latinName: 'Opuntia microdasys' },
        ],
      },
    },
  },
  '番杏科': {
    latinName: 'Aizoaceae',
    genera: {
      '生石花属': {
        latinName: 'Lithops',
        species: [
          { name: '日轮玉', latinName: 'Lithops aucampiae' },
          { name: '李夫人', latinName: 'Lithops salicola' },
          { name: '花纹玉', latinName: 'Lithops karasmontana' },
          { name: '福来玉', latinName: 'Lithops julii' },
        ],
      },
      '肉锥花属': {
        latinName: 'Conophytum',
        species: [
          { name: '少将', latinName: 'Conophytum bilobum' },
          { name: '寂光', latinName: 'Conophytum calculus' },
        ],
      },
    },
  },
  '龙舌兰科': {
    latinName: 'Agavaceae',
    genera: {
      '龙舌兰属': {
        latinName: 'Agave',
        species: [
          { name: '雷神', latinName: 'Agave potatorum' },
          { name: '吹上', latinName: 'Agave stricta' },
          { name: '王妃雷神', latinName: 'Agave potatorum Variegata' },
        ],
      },
      '虎尾兰属': {
        latinName: 'Sansevieria',
        species: [
          { name: '虎尾兰', latinName: 'Sansevieria trifasciata' },
          { name: '金边虎尾兰', latinName: 'Sansevieria trifasciata Laurentii' },
        ],
      },
    },
  },
};

// 帖子模板（中文）
const postTemplatesZh = [
  {
    title: '{plant}养护心得分享',
    content: '最近养的{plant}状态越来越好了！分享一下我的养护经验：\n\n1. 光照：喜欢明亮的散射光，避免暴晒\n2. 浇水：见干见湿，宁干勿湿\n3. 土壤：疏松透气的颗粒土最佳\n4. 温度：适宜温度15-28℃\n\n希望对大家有帮助！',
    tags: ['养护心得', '新手指南'],
  },
  {
    title: '我的{plant}终于开花了！',
    content: '养了大半年的{plant}今天终于开花了，太激动了！\n\n花朵颜色很漂亮，而且还有淡淡的香味。看来之前的精心照料没有白费。\n\n给大家看看我的宝贝~',
    tags: ['开花记录', '成就解锁'],
  },
  {
    title: '{plant}叶插繁殖成功经验',
    content: '分享一下{plant}叶插的成功经验：\n\n• 选择健康饱满的叶片\n• 晾干伤口2-3天\n• 平放在微湿的土面\n• 保持通风，避免闷热\n• 大约2-3周就能看到小芽\n\n现在已经长出好多小崽了，太有成就感了！',
    tags: ['叶插', '繁殖技巧'],
  },
  {
    title: '新入手的{plant}，求养护建议',
    content: '刚从花市买回来一盆{plant}，看起来状态还不错。\n\n请问各位大神，这个品种好养吗？有什么需要特别注意的地方吗？\n\n坐标南方，阳台党，求指教！',
    tags: ['新手求助', '养护咨询'],
  },
  {
    title: '{plant}度夏攻略',
    content: '总结一下{plant}的度夏要点：\n\n夏季：\n- 遮阴通风\n- 控水断水\n- 避免淋雨\n\n希望大家的肉肉都能安全度过！',
    tags: ['度夏', '养护技巧'],
  },
];

// 帖子模板（英文）
const postTemplatesEn = [
  {
    title: 'My {plant} Care Guide',
    content: 'Here are my tips for growing {plant}:\n\n• Light: Bright indirect light\n• Water: Water when soil is dry\n• Soil: Well-draining succulent mix\n• Temperature: 60-80°F (15-28°C)\n\nHope this helps!',
    tags: ['care guide', 'tips'],
  },
  {
    title: '{plant} Finally Bloomed!',
    content: 'After months of care, my {plant} is finally blooming! The flowers are absolutely beautiful.\n\nSo rewarding to see all the hard work pay off. Check out these photos!',
    tags: ['blooming', 'flowers'],
  },
  {
    title: 'Propagating {plant} Successfully',
    content: 'Successfully propagated my {plant} from leaf cuttings!\n\nSteps I followed:\n1. Choose healthy leaves\n2. Let callus form for 2-3 days\n3. Place on slightly moist soil\n4. Wait for roots and pups\n\nNow I have so many babies!',
    tags: ['propagation', 'leaf cutting'],
  },
  {
    title: 'New to {plant} - Need Advice',
    content: 'Just got my first {plant} and I am excited but nervous!\n\nAny tips for a beginner? What should I watch out for?\n\nThanks in advance!',
    tags: ['beginner', 'help'],
  },
];

// 评论模板（中文）
const commentsZh = [
  '太棒了！我的也是这样养的',
  '学到了，感谢分享！',
  '好漂亮啊，羡慕',
  '请问在哪里买的？',
  '状态真好，养功了得',
  '我的怎么总是养不好呢',
  '收藏了，回头试试',
  '同款！握手',
  '这个配土比例能分享一下吗？',
  '太美了，种草了',
  '养得真好，请教一下浇水频率',
  '我也想养这个品种',
  '颜色好正啊',
  '大神求带',
];

// 评论模板（英文）
const commentsEn = [
  'Beautiful! Thanks for sharing',
  'Great tips, very helpful',
  'Gorgeous plant!',
  'Where did you get it?',
  'Amazing growth!',
  'I need to try this',
  'Saved for later',
  'Same here!',
  'What soil mix do you use?',
  'So pretty!',
  'How often do you water?',
  'I want one too',
  'Perfect color',
  'Goals!',
];

// 生成随机日期（上个月到现在）
function randomDate() {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const diff = now.getTime() - lastMonth.getTime();
  const randomTime = lastMonth.getTime() + Math.random() * diff;
  return new Date(randomTime);
}

// 随机选择数组元素
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 随机选择多个元素
function randomChoices<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

async function main() {
  console.log('🌱 开始生成社区数据...\n');

  // 1. 获取所有用户
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('❌ 没有找到用户，请先创建用户');
    return;
  }
  console.log(`✓ 找到 ${users.length} 个用户\n`);

  // 2. 创建科属种结构
  console.log('📁 创建科属种结构...');
  const allSpecies: any[] = [];

  for (const [categoryName, categoryData] of Object.entries(succulentData)) {
    // 创建科
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

    // 创建属
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

      // 创建种
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
              description: `${speciesData.name}是${genusName}的一个品种，适合家庭养护。`,
              genusId: genus.id,
              cover: '',
              gallery: '[]',
              light: '明亮散射光',
              watering: '见干见湿',
              hardiness: '5°C以上',
              difficulty: 2,
              tips: '[]',
            },
          });
          console.log(`      ✓ 创建种: ${speciesData.name}`);
        }
        allSpecies.push(species);
      }
    }
  }
  console.log(`✓ 创建了 ${allSpecies.length} 个品种\n`);

  // 3. 生成帖子
  console.log('📝 开始生成帖子...');
  const posts: any[] = [];

  for (const species of allSpecies) {
    // 每个品种生成2-3个帖子
    const numPosts = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < numPosts; i++) {
      const isEnglish = Math.random() > 0.7; // 30%英文帖子
      const template = randomChoice(isEnglish ? postTemplatesEn : postTemplatesZh);
      const author = randomChoice(users);

      const title = template.title.replace('{plant}', species.name);
      const content = template.content.replace(/{plant}/g, species.name);

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
          views: Math.floor(Math.random() * 500),
        },
      });

      posts.push(post);
    }
  }
  console.log(`✓ 生成了 ${posts.length} 个帖子\n`);

  // 4. 生成互动（点赞、收藏、评论）
  console.log('💬 开始生成互动数据...');
  let likeCount = 0;
  let collectCount = 0;
  let commentCount = 0;

  for (const post of posts) {
    // 随机选择用户进行互动
    const numInteractions = Math.floor(Math.random() * users.length * 0.4);
    const interactUsers = randomChoices(users, numInteractions);

    for (const user of interactUsers) {
      // 点赞（70%概率）
      if (Math.random() > 0.3) {
        try {
          await prisma.postLike.create({
            data: {
              userId: user.id,
              postId: post.id,
            },
          });
          likeCount++;
        } catch (e) {
          // 忽略重复点赞
        }
      }

      // 收藏（30%概率）
      if (Math.random() > 0.7) {
        try {
          await prisma.postCollect.create({
            data: {
              userId: user.id,
              postId: post.id,
            },
          });
          collectCount++;
        } catch (e) {
          // 忽略重复收藏
        }
      }

      // 评论（50%概率）
      if (Math.random() > 0.5) {
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

  console.log('🎉 社区数据生成完成！');
  console.log(`\n总计：`);
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
