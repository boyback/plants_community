/**
 * 二次 Seed:交易/钻石/任务/皮肤
 *
 * 与 seed.ts 解耦,允许单独跑:`npx tsx prisma/seed-market.ts`
 * 也允许通过 `npm run db:seed` 自动联跑(seed.ts 末尾会调用)。
 */
import { PrismaClient, ProductSource, ProductStatus, SkinKind, TaskKind } from '@prisma/client';
import { sanitizeHtml, jsonFromHtml, plainFromHtml } from '../src/lib/richtext';

const prisma = new PrismaClient();

/* ============== 官方商品 ============== */

const officialProducts = [
  {
    title: '【入门套装】多肉新手 5 件套',
    cover: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800',
    description: '<p>含小铲子、镊子、小喷壶、控水器、小毛刷,新手必备。</p><p>礼盒装,送朋友也好看。</p>',
    category: '工具',
    price: 4900, originalPrice: 6900, stock: 200, pointsBack: 50,
    tags: ['新手', '工具'],
  },
  {
    title: '颗粒土配方土 · 5L 装',
    cover: 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=800',
    description: '<p>赤玉土 + 鹿沼土 + 火山岩 + 椰糠,科学配比,通透不积水。</p>',
    category: '盆土',
    price: 3900, originalPrice: 4900, stock: 500, pointsBack: 30,
    tags: ['配土', '颗粒'],
  },
  {
    title: '复合缓释肥 · 200g',
    cover: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
    description: '<p>NPK 14-14-14,3 个月长效,每月撒一次。</p>',
    category: '肥料',
    price: 2900, originalPrice: 3900, stock: 1000, pointsBack: 20,
    tags: ['肥料'],
  },
  {
    title: '陶土花盆 · 直径 10cm × 6 个装',
    cover: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800',
    description: '<p>本色陶盆,带排水孔,经典必备。</p>',
    category: '盆器',
    price: 5900, originalPrice: 7900, stock: 80, pointsBack: 50,
    tags: ['陶盆', '入门'],
  },
  {
    title: '【精选】胧月糖豆石莲组合 × 3',
    cover: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800',
    description: '<p>带原盆发货,品种保真。</p>',
    category: '植物',
    price: 9900, originalPrice: 12900, stock: 30, pointsBack: 100,
    tags: ['多肉', '组合', '热销'],
  },
  {
    title: '彩色玛瑙铺面石 · 500g',
    cover: 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=800',
    description: '<p>粒径 3-5mm,适合做盆面装饰,瞬间提升格调。</p>',
    category: '盆器',
    price: 1900, originalPrice: null, stock: 800, pointsBack: 15,
    tags: ['铺面石', '装饰'],
  },
  {
    title: '70% 黑色遮阳网 · 2m × 3m',
    cover: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800',
    description: '<p>夏季度夏神器,加密耐用。</p>',
    category: '工具',
    price: 3500, originalPrice: 4500, stock: 200, pointsBack: 30,
    tags: ['度夏'],
  },
  {
    title: '透明自动浇水玻璃球 × 2',
    cover: 'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=800',
    description: '<p>小巧精致,出门旅游一周不愁。</p>',
    category: '工具',
    price: 1990, originalPrice: 2990, stock: 600, pointsBack: 15,
    tags: ['浇水', '神器'],
  },
  {
    title: '【礼物卡】¥50 多肉商城通用卡',
    cover: 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=800',
    description: '<p>送朋友、送家人,可在商城任意消费。</p>',
    category: '礼物',
    price: 5000, originalPrice: null, stock: 999, pointsBack: 0,
    tags: ['礼物卡'],
  },
  {
    title: '圆球仙人掌迷你盆栽 × 4 组',
    cover: 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=800',
    description: '<p>办公桌救星,4 个不同品种。</p>',
    category: '植物',
    price: 6900, originalPrice: 8900, stock: 50, pointsBack: 70,
    tags: ['仙人球', '办公'],
  },
  {
    title: '日本进口生石花种子 · 10 粒',
    cover: 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=800',
    description: '<p>稀有混合品种,新手慎选,种子党专享。</p>',
    category: '植物',
    price: 8900, originalPrice: 10900, stock: 20, pointsBack: 90,
    tags: ['生石花', '种子'],
  },
  {
    title: '陶瓷盆 · 北欧风手工签名款',
    cover: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
    description: '<p>每只独立编号,买到就是赚到。</p>',
    category: '盆器',
    price: 12900, originalPrice: 16900, stock: 15, pointsBack: 130,
    tags: ['手工', '设计师款'],
  },
];

/* ============== C2C 商品(由部分用户发布) ============== */

const c2cProducts = [
  {
    title: '出多头玉露 × 2,自繁,北京自提',
    cover: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800',
    description: '<p>自家阳台养的,品相好。北京自提优先,可发顺丰。</p>',
    category: '植物',
    price: 7900, stock: 1, pointsBack: 80,
    sellerName: '月光玉露',
    shipFrom: '北京',
    tags: ['玉露', '北京'],
  },
  {
    title: '【出闲置】陶瓷盆 5 个一起出',
    cover: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
    description: '<p>断舍离,5 个粉白陶瓷盆 30 元包邮(江浙沪)。</p>',
    category: '盆器',
    price: 3000, stock: 1, pointsBack: 30,
    sellerName: '清风徐来',
    shipFrom: '上海',
    tags: ['二手', '盆器'],
  },
  {
    title: '出生石花混合盆 × 8 头',
    cover: 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=800',
    description: '<p>8 个品种各 1 头,品相完好。</p>',
    category: '植物',
    price: 18900, stock: 1, pointsBack: 200,
    sellerName: '番杏女王',
    shipFrom: '广州',
    tags: ['生石花', '混合'],
  },
  {
    title: '出多头黑法师老桩',
    cover: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800',
    description: '<p>三年老桩,带老盆出。</p>',
    category: '植物',
    price: 25900, stock: 1, pointsBack: 260,
    sellerName: '沙漠老王',
    shipFrom: '西安',
    tags: ['黑法师', '老桩'],
  },
];

/* ============== 皮肤(气泡 / 按钮 / 表情 / 挂件) ============== */

const skins = [
  // 评论气泡
  { kind: 'bubble', slug: 'bubble-default',  name: '默认气泡',     preview: '#fff',    description: '社区默认气泡',                pricePoints: 0,    rarity: 'normal',    meta: { bg: '#ffffff', color: '#1f2a24' } },
  { kind: 'bubble', slug: 'bubble-mint',     name: '薄荷绿',       preview: '#d4f5e0', description: '清爽薄荷,凉夏首选',          pricePoints: 200,  rarity: 'normal',    meta: { bg: '#d4f5e0', color: '#1f4130' } },
  { kind: 'bubble', slug: 'bubble-sunset',   name: '日落橙',       preview: '#ffd6a5', description: '温暖日落色调',                pricePoints: 400,  rarity: 'rare',      meta: { bg: '#ffd6a5', color: '#7a3d00' } },
  { kind: 'bubble', slug: 'bubble-ocean',    name: '海洋蓝',       preview: '#a4dded', description: '清凉海洋色',                  pricePoints: 600,  rarity: 'rare',      meta: { bg: '#a4dded', color: '#0a3a5c' } },
  { kind: 'bubble', slug: 'bubble-aurora',   name: '极光紫',       preview: 'linear-gradient(135deg,#c4a4f2,#f4a4d0)', description: '炫彩极光渐变', pricePoints: 1200, rarity: 'epic', meta: { bg: 'linear-gradient(135deg,#c4a4f2,#f4a4d0)', color: '#fff' } },
  { kind: 'bubble', slug: 'bubble-galaxy',   name: '星河',         preview: 'linear-gradient(135deg,#0f1c4d,#5d3fd3)', description: '深邃星河气泡',  pricePoints: 2400, rarity: 'legendary', meta: { bg: 'linear-gradient(135deg,#0f1c4d,#5d3fd3)', color: '#fff' } },
  { kind: 'bubble', slug: 'bubble-leaf',     name: '叶脉绿',       preview: '#a8e6a3', description: '叶脉肌理质感',                pricePoints: 800,  rarity: 'rare',      meta: { bg: '#a8e6a3', color: '#1f4130' } },

  // 点赞按钮(reaction)
  { kind: 'reaction', slug: 'reaction-default', name: '默认爱心', preview: '❤️', description: '经典红心', pricePoints: 0, rarity: 'normal', meta: { emoji: '❤️' } },
  { kind: 'reaction', slug: 'reaction-leaf',    name: '叶子点赞', preview: '🌿', description: '清新绿叶',  pricePoints: 200, rarity: 'normal', meta: { emoji: '🌿' } },
  { kind: 'reaction', slug: 'reaction-fire',    name: '火苗点赞', preview: '🔥', description: '燃起来!',  pricePoints: 400, rarity: 'rare', meta: { emoji: '🔥' } },
  { kind: 'reaction', slug: 'reaction-rocket',  name: '火箭起飞', preview: '🚀', description: '666',       pricePoints: 600, rarity: 'rare', meta: { emoji: '🚀' } },
  { kind: 'reaction', slug: 'reaction-rainbow', name: '彩虹之心', preview: '🌈', description: '炫彩点赞',  pricePoints: 1000, rarity: 'epic', meta: { emoji: '🌈' } },
  { kind: 'reaction', slug: 'reaction-crown',   name: '皇冠点赞', preview: '👑', description: '王者归来',  pricePoints: 1800, rarity: 'epic', meta: { emoji: '👑' } },
  { kind: 'reaction', slug: 'reaction-cactus',  name: '仙人掌赞', preview: '🌵', description: '社区限定',  pricePoints: 2500, rarity: 'legendary', meta: { emoji: '🌵' } },

  // 表情包(sticker pack)— 每个包含 6 个表情
  { kind: 'sticker', slug: 'sticker-default',  name: '默认表情包',   preview: '🌱',  description: '系统自带 6 个常用表情',         pricePoints: 0,    rarity: 'normal',    meta: { stickers: ['🌱','🌿','🌵','🌷','🍀','🍃'] } },
  { kind: 'sticker', slug: 'sticker-cute',     name: '萌系表情包',   preview: '🥰',  description: '6 个超可爱表情',               pricePoints: 300,  rarity: 'normal',    meta: { stickers: ['🥰','😍','🤗','🥳','😻','💕'] } },
  { kind: 'sticker', slug: 'sticker-cool',     name: '酷酷表情包',   preview: '😎',  description: '社畜专用',                     pricePoints: 500,  rarity: 'rare',      meta: { stickers: ['😎','🤘','🔥','💯','🤖','🎸'] } },
  { kind: 'sticker', slug: 'sticker-cat',      name: '猫咪表情包',   preview: '😺',  description: '猫奴必备',                     pricePoints: 700,  rarity: 'rare',      meta: { stickers: ['😺','😻','🙀','😾','😼','😽'] } },
  { kind: 'sticker', slug: 'sticker-plant',    name: '植物表情包',   preview: '🪴',  description: '社区限定多肉表情',             pricePoints: 1200, rarity: 'epic',      meta: { stickers: ['🌱','🌵','🪴','🌷','🌹','🌻'] } },
  { kind: 'sticker', slug: 'sticker-festival', name: '节日表情包',   preview: '🎉',  description: '过节专用',                     pricePoints: 1500, rarity: 'epic',      meta: { stickers: ['🎉','🎊','🎁','🎈','🥳','🍾'] } },
  { kind: 'sticker', slug: 'sticker-galaxy',   name: '宇宙表情包',   preview: '🌌',  description: '宇宙系列',                     pricePoints: 2000, rarity: 'legendary', meta: { stickers: ['🌌','✨','🪐','🌠','🛸','🌟'] } },
];

const deprecatedPendantSlugs = [
  'pendant-default',
  'pendant-leaf-wreath',
  'pendant-flower',
  'pendant-cactus',
  'pendant-fire',
  'pendant-aurora',
  'pendant-stars',
  'pendant-vip-crown',
  'bubble-vip-gold',
  'reaction-vip-diamond',
  'sticker-vip-gold',
];

/* ============== 任务 ============== */

const tasks = [
  // 每日
  { slug: 'daily-signin',     kind: 'daily', title: '每日签到',         description: '完成今日签到',        icon: '📅', target: 1, triggerEvent: 'signin',         rewardPoints: 5, rewardExp: 5 },
  { slug: 'daily-comment-3',  kind: 'daily', title: '今日 3 条评论',    description: '今天累计发表 3 条评论', icon: '💬', target: 3, triggerEvent: 'comment_create',  rewardPoints: 15, rewardExp: 8 },
  { slug: 'daily-post-1',     kind: 'daily', title: '今日发 1 帖',      description: '今天发布一篇帖子',      icon: '📝', target: 1, triggerEvent: 'post_create',     rewardPoints: 20, rewardExp: 10 },
  { slug: 'daily-vote-1',     kind: 'daily', title: '今日投票 1 次',    description: '参与一次投票',          icon: '🗳️', target: 1, triggerEvent: 'vote_cast',       rewardPoints: 5, rewardExp: 3 },

  // 月度
  { slug: 'monthly-post-10',     kind: 'monthly', title: '月度发帖达人',   description: '当月发布 10 篇帖子',     icon: '🏆', target: 10, triggerEvent: 'post_create',    rewardPoints: 200, rewardExp: 50 },
  { slug: 'monthly-comment-50',  kind: 'monthly', title: '月度评论达人',   description: '当月发布 50 条评论',     icon: '💭', target: 50, triggerEvent: 'comment_create', rewardPoints: 200, rewardExp: 30 },
  { slug: 'monthly-signin-15',   kind: 'monthly', title: '月度坚持',       description: '累计签到 15 天',         icon: '🔥', target: 15, triggerEvent: 'signin',         rewardPoints: 150, rewardExp: 20 },
  { slug: 'monthly-purchase-3',  kind: 'monthly', title: '月度剁手党',     description: '当月完成 3 笔订单',       icon: '🛍️', target: 3,  triggerEvent: 'purchase_paid',  rewardPoints: 300, rewardExp: 30 },

  // 一次性成就
  { slug: 'ach-first-post',    kind: 'achievement', title: '初出茅庐',  description: '发布第一篇帖子',     icon: '🎬', target: 1, triggerEvent: 'post_create',    rewardPoints: 30, rewardExp: 30 },
  { slug: 'ach-first-comment', kind: 'achievement', title: '一吐为快',  description: '发表第一条评论',     icon: '🎤', target: 1, triggerEvent: 'comment_create', rewardPoints: 10,  rewardExp: 10 },
  { slug: 'ach-first-vote',    kind: 'achievement', title: '为爱发声',  description: '第一次参与投票',     icon: '🎯', target: 1, triggerEvent: 'vote_cast',      rewardPoints: 10,  rewardExp: 10 },
  { slug: 'ach-first-purchase',kind: 'achievement', title: '剁手第一单', description: '完成首次购物',       icon: '🛒', target: 1, triggerEvent: 'purchase_paid',  rewardPoints: 50, rewardExp: 30 },
];

async function main() {
  console.log('🛒 开始播种交易/钻石/任务/皮肤数据...');

  /* ----- Skin ----- */
  console.log('• 皮肤');
  await prisma.skinItem.deleteMany({
    where: {
      kind: 'pendant',
      slug: { in: deprecatedPendantSlugs },
    },
  });
  const skinIdBySlug = new Map<string, string>();
  for (let i = 0; i < skins.length; i++) {
    const s = skins[i];
    const row = await prisma.skinItem.upsert({
      where: { slug: s.slug },
      update: {
        kind: s.kind as SkinKind,
        name: s.name,
        preview: s.preview,
        description: s.description,
        pricePoints: s.pricePoints,
        rarity: s.rarity,
        meta: JSON.stringify(s.meta ?? {}),
        orderIdx: i,
      },
      create: {
        slug: s.slug,
        kind: s.kind as SkinKind,
        name: s.name,
        preview: s.preview,
        description: s.description,
        pricePoints: s.pricePoints,
        rarity: s.rarity,
        meta: JSON.stringify(s.meta ?? {}),
        orderIdx: i,
      },
    });
    skinIdBySlug.set(s.slug, row.id);
  }

  /* ----- Tasks ----- */
  console.log('• 任务');
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    await prisma.task.upsert({
      where: { slug: t.slug },
      update: {
        kind: t.kind as TaskKind,
        title: t.title,
        description: t.description,
        icon: t.icon,
        target: t.target,
        triggerEvent: t.triggerEvent,
        rewardPoints: t.rewardPoints,
        rewardExp: t.rewardExp,
        orderIdx: i,
      },
      create: {
        slug: t.slug,
        kind: t.kind as TaskKind,
        title: t.title,
        description: t.description,
        icon: t.icon,
        target: t.target,
        triggerEvent: t.triggerEvent,
        rewardPoints: t.rewardPoints,
        rewardExp: t.rewardExp,
        orderIdx: i,
      },
    });
  }

  /* ----- Products ----- */
  console.log('• 官方商品');
  // 先删订单和支付,因为订单引用商品
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});

  for (const p of officialProducts) {
    await prisma.product.create({
      data: {
        source: ProductSource.official,
        title: p.title,
        cover: p.cover,
        description: p.description,
        category: p.category,
        price: p.price,
        originalPrice: p.originalPrice ?? null,
        stock: p.stock,
        pointsBack: p.pointsBack,
        images: JSON.stringify([p.cover]),
        tags: JSON.stringify(p.tags),
        status: ProductStatus.on_sale,
      },
    });
  }

  console.log('• C2C 商品');
  for (const p of c2cProducts) {
    const seller = await prisma.user.findUnique({ where: { name: p.sellerName } });
    if (!seller) continue;
    await prisma.product.create({
      data: {
        source: ProductSource.c2c,
        title: p.title,
        cover: p.cover,
        description: p.description,
        category: p.category,
        price: p.price,
        stock: p.stock,
        pointsBack: p.pointsBack,
        images: JSON.stringify([p.cover]),
        tags: JSON.stringify(p.tags),
        sellerId: seller.id,
        shipFrom: p.shipFrom,
        status: ProductStatus.on_sale,
      },
    });
  }

  /* ----- 给老用户初始化经验值/钻石(按等级反推到该级别下限 + 一些起步钻石) ----- */
  console.log('• 用户经验值/钻石回填');
  const LEVEL_EXP_MAP: Record<number, number> = {
    1: 10, 2: 60, 3: 180, 4: 380, 5: 720, 6: 1240, 7: 2050, 8: 3550, 9: 6100, 10: 10200,
  };
  const allUsers = await prisma.user.findMany();
  for (const u of allUsers) {
    const targetExp = LEVEL_EXP_MAP[u.level] ?? 10;
    if (u.exp === 0) {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          exp: targetExp,
          pointsBalance: 500 + u.level * 200, // 给所有 demo 用户起步钻石,方便逛皮肤商城
        },
      });
    }
  }

  // 商品描述 富文本回填
  console.log('• 商品描述富文本回填');
  const products = await prisma.product.findMany({ select: { id: true, description: true } });
  for (const p of products) {
    const html = sanitizeHtml(p.description);
    const json = jsonFromHtml(html);
    const text = plainFromHtml(html, 1000);
    await prisma.product.update({
      where: { id: p.id },
      data: {
        description: html,
        descriptionJson: json ? JSON.stringify(json) : null,
        descriptionText: text,
      },
    });
  }
  console.log(`   商品 ${products.length} 条 已生成描述 JSON`);

  /* ----- 默认地址 ----- */
  console.log('• 用户默认地址');
  await prisma.address.deleteMany({});
  const userAddresses: Array<{ name: string; addrs: Array<{ name: string; phone: string; province: string; city: string; district?: string; detail: string; tag?: string; isDefault?: boolean }> }> = [
    {
      name: '多肉阿绿',
      addrs: [
        { name: '多肉阿绿', phone: '13900000001', province: '北京市', city: '朝阳区', district: '建外街道', detail: '光华里 1 号院 3 号楼 502', tag: '家', isDefault: true },
        { name: '阿绿(公司)', phone: '13900000001', province: '北京市', city: '海淀区', detail: '中关村大街 1 号', tag: '公司' },
      ],
    },
    {
      name: '月光玉露',
      addrs: [
        { name: '月光玉露', phone: '13800000002', province: '上海市', city: '徐汇区', detail: '田林路 100 弄 5 号 301', tag: '家', isDefault: true },
      ],
    },
    {
      name: '沙漠老王',
      addrs: [
        { name: '王大叔', phone: '13700000003', province: '陕西省', city: '西安市', district: '雁塔区', detail: '小寨东路 18 号', tag: '家', isDefault: true },
      ],
    },
    {
      name: '番杏女王',
      addrs: [
        { name: '番杏女王', phone: '13600000004', province: '广东省', city: '广州市', district: '天河区', detail: '体育西路 10 号', tag: '家', isDefault: true },
      ],
    },
  ];
  for (const u of userAddresses) {
    const user = await prisma.user.findUnique({ where: { name: u.name } });
    if (!user) continue;
    for (const a of u.addrs) {
      await prisma.address.create({
        data: {
          userId: user.id,
          name: a.name,
          phone: a.phone,
          province: a.province,
          city: a.city,
          district: a.district ?? null,
          detail: a.detail,
          tag: a.tag ?? null,
          isDefault: a.isDefault ?? false,
        },
      });
    }
  }

  /* ----- 演示拍卖 ----- */
  console.log('• 演示拍卖');
  await prisma.bid.deleteMany({});
  await prisma.auctionParticipant.deleteMany({});
  await prisma.auction.deleteMany({});

  const sellers = await prisma.user.findMany({
    where: { name: { in: ['沙漠老王', '番杏女王', '多肉阿绿', '月光玉露'] } },
  });
  const sellerByName = new Map(sellers.map((s) => [s.name, s]));

  const auctions: Array<{
    sellerName: string;
    title: string;
    cover: string;
    description: string;
    category: string;
    tags: string[];
    startPrice: number;
    minIncrement: number;
    buyNow?: number;
    deposit: number;
    durationHours: number;
    startOffsetMin?: number;
  }> = [
    {
      sellerName: '沙漠老王',
      title: '【精品老桩】五年黑法师 多头丛生',
      cover: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000',
      description: '<p>自家阳台养了五年的老桩,主茎粗壮,多头爆发。冬季正值生长季,品相最佳。</p><p>带原盆发货,顺丰冷链。</p><p><b>不议价</b>,出价请认真。</p>',
      category: '植物',
      tags: ['老桩', '黑法师'],
      startPrice: 8800,    // 88
      minIncrement: 500,   // 5
      buyNow: 28800,       // 288
      deposit: 2000,       // 20
      durationHours: 24,
    },
    {
      sellerName: '番杏女王',
      title: '【限定】日本进口生石花混合 8 头组合',
      cover: 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000',
      description: '<p>8 头不同品种,均为日本进口种子培育的二代成株,品相完好。</p><p>送原盆 + 原配土,按拍卖结束后 3 个工作日发货。</p>',
      category: '植物',
      tags: ['生石花', '番杏', '稀有'],
      startPrice: 19800,   // 198
      minIncrement: 1000,  // 10
      deposit: 5000,       // 50
      durationHours: 48,
    },
    {
      sellerName: '多肉阿绿',
      title: '【设计师款】手工陶瓷盆 · 北欧风 5 件套',
      cover: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000',
      description: '<p>限量手工签名款,5 件一套,尺寸不一,适合多肉组合盆栽。</p><p>已用了一段时间,9 成新。</p>',
      category: '盆器',
      tags: ['手工', '设计师'],
      startPrice: 9900,    // 99
      minIncrement: 500,
      buyNow: 19900,
      deposit: 2000,
      durationHours: 12,
    },
    {
      sellerName: '月光玉露',
      title: '【自繁】姬玉露 锦化变异个体',
      cover: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000',
      description: '<p>自家繁殖的姬玉露,锦化非常稳定,叶片通透。</p><p>稀有变异,错过等明年。</p>',
      category: '植物',
      tags: ['玉露', '锦化', '稀有'],
      startPrice: 29900,
      minIncrement: 2000,
      deposit: 8000,
      durationHours: 36,
      startOffsetMin: 60,  // 1 小时后开始(预告中)
    },
  ];

  for (const a of auctions) {
    const seller = sellerByName.get(a.sellerName);
    if (!seller) continue;
    const startAt = new Date(Date.now() + (a.startOffsetMin ?? -10) * 60_000);
    const endAt = new Date(startAt.getTime() + a.durationHours * 3600_000);

    const html = sanitizeHtml(a.description);
    const json = jsonFromHtml(html);
    const text = plainFromHtml(html, 1000);

    await prisma.auction.create({
      data: {
        sellerId: seller.id,
        title: a.title,
        cover: a.cover,
        images: JSON.stringify([a.cover]),
        description: html,
        descriptionJson: json ? JSON.stringify(json) : null,
        descriptionText: text,
        category: a.category,
        tags: JSON.stringify(a.tags),
        startPrice: a.startPrice,
        minIncrement: a.minIncrement,
        buyNowPrice: a.buyNow ?? null,
        depositAmount: a.deposit,
        startAt,
        endAt,
        antiSnipeMinutes: 5,
        status: a.startOffsetMin && a.startOffsetMin > 0 ? 'scheduled' : 'live',
        currentPrice: a.startPrice,
      },
    });
  }

  console.log(`   地址 ${userAddresses.reduce((s, u) => s + u.addrs.length, 0)} 条 · 拍卖 ${auctions.length} 场`);

  console.log('✅ 交易/钻石/任务/皮肤 Seed 完成');
  console.log(`   官方商品: ${officialProducts.length}, C2C: ${c2cProducts.length}`);
  console.log(`   皮肤: ${skins.length}, 任务: ${tasks.length}`);
}

main()
  .catch((e) => {
    console.error('❌ 失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
