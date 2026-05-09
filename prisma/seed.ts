/**
 * Seed:把 Mock 数据导入数据库。
 * 运行:npm run db:seed
 *
 * 策略:幂等。已存在的记录通过 upsert 更新,保持 ID 稳定方便开发调试。
 */
import { PrismaClient, PostType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { sanitizeHtml, jsonFromHtml, plainFromHtml } from '../src/lib/richtext';

const prisma = new PrismaClient();

/* ---------------- 徽章 ---------------- */
const badges = [
  { slug: 'b1', name: '新苗', icon: '🌱', description: '加入社区' },
  { slug: 'b2', name: '达人', icon: '🌿', description: '发布 10 篇帖子' },
  { slug: 'b3', name: '园艺师', icon: '🪴', description: '发布 100 篇帖子' },
  { slug: 'b4', name: '摄影家', icon: '📷', description: '累计上传 50 张图' },
  { slug: 'b5', name: '小太阳', icon: '☀️', description: '连续签到 30 天' },
  { slug: 'b6', name: '夜行者', icon: '🌙', description: '凌晨发帖 x 10' },
  { slug: 'b7', name: '评论家', icon: '💬', description: '发表 200 条评论' },
  { slug: 'b8', name: '收藏家', icon: '⭐', description: '收藏 100 个帖子' },
  { slug: 'b9', name: '老司机', icon: '🚜', description: '注册满 1 年' },
  { slug: 'b10', name: '花仙子', icon: '🌸', description: '开花帖 x 20' },
  { slug: 'b11', name: 'EVENT 先锋', icon: '🎉', description: '参与 5 次活动' },
  { slug: 'b12', name: '投票王', icon: '🗳️', description: '发起 10 次投票' },
];

/* ---------------- 用户(Mock 密码统一 "123456") ---------------- */
const users = [
  { slug: 'u1', name: '多肉阿绿', avatar: '/default-avatar.svg', bio: '三年肉龄,坐标华北阳台党,喜欢景天和生石花。', level: 7 },
  { slug: 'u2', name: '月光玉露', avatar: '/default-avatar.svg', bio: '玉露控,照片都是手机拍的,随便看看。', level: 5 },
  { slug: 'u3', name: '沙漠老王', avatar: '/default-avatar.svg', bio: '十年老玩家,仙人球和大戟科都玩。', level: 9 },
  { slug: 'u4', name: '露娜酱',  avatar: '/default-avatar.svg', bio: '萌新一枚,求带!', level: 2 },
  { slug: 'u5', name: '花园里的熊', avatar: '/default-avatar.svg', bio: '全日照派,专治徒长。', level: 6 },
  { slug: 'u6', name: '清风徐来', avatar: '/default-avatar.svg', bio: '爱拍照,不爱养,哈哈。', level: 4 },
  { slug: 'u7', name: '番杏女王', avatar: '/default-avatar.svg', bio: '研究番杏科十年,主攻生石花。', level: 8 },
  { slug: 'u8', name: '南方小院', avatar: '/default-avatar.svg', bio: '广州,夏天挣扎户。', level: 3 },
];

/* ---------------- 板块 ---------------- */
const boards = [
  { slug: 'jingtian', name: '景天科', description: '拟石莲、长生草、景天、风车等景天科大家族', cover: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=800', icon: '🌿', members: 12843 },
  { slug: 'fanxing', name: '番杏科', description: '生石花、肉锥、碧光环,番杏圈集结地', cover: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800', icon: '🪨', members: 6421 },
  { slug: 'baihe', name: '百合科', description: '十二卷、玉露、寿、软叶鲨鱼', cover: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800', icon: '💎', members: 8932 },
  { slug: 'xianrenzhang', name: '仙人掌科', description: '球、柱、瑞凤玉、牡丹、乌羽玉', cover: 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=800', icon: '🌵', members: 7812 },
  { slug: 'dajike', name: '大戟科', description: '麒麟、铁甲丸、布纹球', cover: 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=800', icon: '🗿', members: 3421 },
  { slug: 'yangzhi', name: '养殖交流', description: '浇水、配土、光照,经验分享和求助', cover: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800', icon: '💧', members: 21034 },
  { slug: 'jiaoyi', name: '交易市场', description: '出肉、收肉、拼团,请文明交易', cover: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800', icon: '💰', members: 15623 },
  { slug: 'xinshou', name: '新手村', description: '萌新报道、小白问答,老手带带新人', cover: 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=800', icon: '🌱', members: 32145 },
  { slug: 'paishe', name: '摄影大赛', description: '2026 多肉摄影大赛 · 投稿、评选、作品鉴赏', cover: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800', icon: '📷', members: 0 },
];

/* ---------------- 多肉图鉴 ---------------- */
const plants = [
  { slug: 'longyue', name: '胧月', latinName: 'Graptopetalum paraguayense', family: '景天科 · 风车草属', cover: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000', difficulty: 1, light: '全日照', watering: '见干见湿,一周一次', hardiness: '-5°C', description: '胧月是入门级多肉的代表,非常皮实,耐旱耐寒,上色后叶片呈粉紫色,出状态极美。适合新手入坑。', tips: ['多晒少水,才能出状态','夏季适度遮阳,避免正午暴晒','叶插成功率极高,非常适合练手','耐寒能力强,北方室内越冬没问题'], gallery: ['https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000','https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1000','https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000'] },
  { slug: 'yulu', name: '玉露', latinName: 'Haworthia cooperi', family: '百合科 · 十二卷属', cover: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000', difficulty: 3, light: '散射光', watering: '表土干透再浇', hardiness: '0°C', description: '玉露叶片剔透如水晶,顶部有透明「窗」,能让阳光穿透进行光合作用。喜散射光,忌烈日。', tips: ['强光下叶片会变得不透明,失去水晶感','夏天高温会休眠,减少浇水','根系脆弱,建议透气配土','繁殖多靠分株,叶插偶有成功'], gallery: ['https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000','https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000'] },
  { slug: 'shengshihua', name: '生石花', latinName: 'Lithops', family: '番杏科 · 生石花属', cover: 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000', difficulty: 5, light: '充足光照', watering: '严格控水,夏季几乎断水', hardiness: '5°C', description: '生石花外形酷似石头,是多肉里最具话题性的品种之一。一年一蜕皮,老壳被新叶吸收。对水敏感,被誉为「劝退专用」。', tips: ['夏季高温休眠,必须断水避免黑腐','蜕皮期间不要浇水,让其吸收老壳','秋天是生长旺季,可适当水肥','烈日下要遮阳,防止晒伤'], gallery: ['https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000'] },
  { slug: 'hongzhiyu', name: '虹之玉', latinName: 'Sedum rubrotinctum', family: '景天科 · 景天属', cover: 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000', difficulty: 1, light: '全日照', watering: '耐旱,干透浇透', hardiness: '-3°C', description: '虹之玉小巧可爱,叶片糖果色,低温 + 强光下会转为橙红色,非常讨喜。新手友好型。', tips: ['温差越大,颜色越好看','秋冬是最佳观赏期','叶插成功率极高','夏季闷热可能徒长,注意通风'], gallery: ['https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000'] },
  { slug: 'jiwawa', name: '吉娃娃', latinName: 'Echeveria chihuahuaensis', family: '景天科 · 拟石莲属', cover: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000', difficulty: 3, light: '全日照', watering: '控水,避免叶心积水', hardiness: '-2°C', description: '吉娃娃叶片肥厚,叶尖粉红,出状态时像一朵盛开的莲花。是拟石莲属中的经典品种。', tips: ['浇水时避开叶心,否则易黑腐','夏季适度遮阳并保持通风','冬季强日照有助上色','换盆可刺激新根生长'], gallery: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000'] },
  { slug: 'aierfeide', name: '艾伦费尔德', latinName: 'Turbinicarpus schmiedickeanus', family: '仙人掌科 · 陀螺球属', cover: 'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000', difficulty: 4, light: '全日照', watering: '严格控水', hardiness: '0°C', description: '陀螺球属的小型种,球体带钩刺,花开如烟火。生长缓慢,对水极度敏感,资深玩家最爱。', tips: ['严格颗粒土,否则易烂根','花期通常在春季','勿用深盆,浅盆更佳','冬季完全断水休眠'], gallery: ['https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000'] },
  { slug: 'heifashi', name: '黑法师', latinName: 'Aeonium arboreum', family: '景天科 · 莲花掌属', cover: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000', difficulty: 2, light: '全日照', watering: '冬季生长,夏季休眠', hardiness: '0°C', description: '黑法师是冬型种,夏季休眠时叶片会收拢包住茎干,冬天是疯狂生长季。叶片墨紫黑,极具戏剧感。', tips: ['冬天反而要勤浇水,夏天要少','生长快速,可修剪塑形','全日照才能黑得漂亮','修剪下来的枝条可直接扦插'], gallery: ['https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000'] },
  { slug: 'qilinhua', name: '麒麟花', latinName: 'Euphorbia milii', family: '大戟科 · 大戟属', cover: 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000', difficulty: 2, light: '全日照', watering: '耐旱,少水', hardiness: '5°C', description: '虽然叫「花」,实为多肉质灌木,茎布满硬刺,顶端苞片鲜艳,四季开花,非常皮实。汁液有毒,操作时戴手套。', tips: ['汁液有毒,避免接触皮肤和眼睛','开花性极好,常年不断花','耐修剪,可塑造造型','不耐寒,北方需室内越冬'], gallery: ['https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000'] },
];

/* ---------------- Banner ---------------- */
const banners = [
  { title: '2026 多肉摄影大赛 征稿中', subtitle: '上传你最满意的多肉作品,万元奖金 · 限定徽章 · 大V 流量扶持', image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1600', link: '/board/paishe', tint: 'from-leaf-900/70', orderIdx: 0 },
  { title: '养护教程合集 · 新手必看', subtitle: '浇水、配土、光照、度夏越冬,从入门到精通的完整路径', image: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1600', link: '/board/yangzhi', tint: 'from-leaf-700/70', orderIdx: 1 },
  { title: '景天鉴赏 · 状态肉合集', subtitle: '拟石莲、风车、长生草,看老玩家如何把它们养出极致状态', image: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1600', link: '/board/jingtian', tint: 'from-sand-300/60', orderIdx: 2 },
];

/* ---------------- 帖子(需要作者/板块 id,在函数内拼装) ---------------- */

const img = [
  'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000',
  'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1000',
  'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000',
  'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000',
  'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000',
  'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000',
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000',
];

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400 * 1000);
}

async function main() {
  console.log('🌱 开始播种...');

  // 徽章
  console.log('• 徽章');
  for (const b of badges) {
    await prisma.badge.upsert({
      where: { slug: b.slug },
      update: { name: b.name, icon: b.icon, description: b.description },
      create: b,
    });
  }

  // 用户(密码统一 123456)
  console.log('• 用户');
  const hash = await bcrypt.hash('123456', 10);
  const userIdBySlug = new Map<string, string>();
  for (const u of users) {
    const dbU = await prisma.user.upsert({
      where: { name: u.name },
      update: {
        avatar: u.avatar,
        bio: u.bio,
        level: u.level,
      },
      create: {
        name: u.name,
        passwordHash: hash,
        avatar: u.avatar,
        bio: u.bio,
        level: u.level,
      },
    });
    userIdBySlug.set(u.slug, dbU.id);
  }

  // 给所有用户绑上徽章(obtained 参照原 Mock 分布)
  console.log('• 用户-徽章关联');
  const allBadges = await prisma.badge.findMany();
  const obtainedSlugs = new Set(['b1', 'b2', 'b3', 'b4', 'b5', 'b7', 'b9']); // 同原 Mock
  for (const uid of userIdBySlug.values()) {
    for (const b of allBadges) {
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: uid, badgeId: b.id } },
        update: { obtained: obtainedSlugs.has(b.slug) },
        create: {
          userId: uid,
          badgeId: b.id,
          obtained: obtainedSlugs.has(b.slug),
          obtainedAt: obtainedSlugs.has(b.slug) ? new Date() : null,
        },
      });
    }
  }

  // 板块
  console.log('• 板块');
  const boardIdBySlug = new Map<string, string>();
  for (let i = 0; i < boards.length; i++) {
    const b = boards[i];
    const row = await prisma.board.upsert({
      where: { slug: b.slug },
      update: {
        name: b.name,
        description: b.description,
        cover: b.cover,
        icon: b.icon,
        members: b.members,
        orderIdx: i,
      },
      create: { ...b, orderIdx: i },
    });
    boardIdBySlug.set(b.slug, row.id);
  }

  // 图鉴
  console.log('• 图鉴');
  for (const p of plants) {
    await prisma.plant.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        latinName: p.latinName,
        family: p.family,
        cover: p.cover,
        difficulty: p.difficulty,
        light: p.light,
        watering: p.watering,
        hardiness: p.hardiness,
        description: p.description,
        tips: JSON.stringify(p.tips),
        gallery: JSON.stringify(p.gallery),
      },
      create: {
        slug: p.slug,
        name: p.name,
        latinName: p.latinName,
        family: p.family,
        cover: p.cover,
        difficulty: p.difficulty,
        light: p.light,
        watering: p.watering,
        hardiness: p.hardiness,
        description: p.description,
        tips: JSON.stringify(p.tips),
        gallery: JSON.stringify(p.gallery),
      },
    });
  }

  // Banner(先清后建,保证顺序)
  console.log('• Banner');
  await prisma.banner.deleteMany({});
  for (const b of banners) {
    await prisma.banner.create({ data: b });
  }

  /* -------------- 帖子 -------------- */
  console.log('• 帖子 + 评论 + 投票 + 活动');

  // 为了 seed 可重复,先删掉旧帖子和附属(由级联删 comments/likes/votes/events)
  await prisma.post.deleteMany({});

  const u = (slug: string) => userIdBySlug.get(slug)!;
  const bd = (slug: string) => boardIdBySlug.get(slug)!;

  // 帖子 1:富文本
  const p1 = await prisma.post.create({
    data: {
      type: PostType.rich,
      title: '夏天来了,我的景天们终于度夏成功!分享一下我的度夏经验',
      content: `
        <p>各位肉友大家好,我是<b>多肉阿绿</b>。今年华北的夏天异常炎热,但我的阳台军团居然全部度夏成功了 🎉</p>
        <p>先上几张刚刚拍的图:</p>
        <p>下面分享几个我觉得最关键的要点:</p>
        <ol>
          <li><b>通风第一位</b>。我把小风扇从早开到晚,即使 38 度也没有出现黑腐。</li>
          <li><b>遮阳 70%</b>。正午直射会把叶片晒软,我用了 70% 遮阳网。</li>
          <li><b>控水,不是断水</b>。整个夏天一个月给一次小水,沿盆边,傍晚进行。</li>
          <li><b>提前预防</b>。入夏前喷了一次代森锰锌,效果很好。</li>
        </ol>
        <p>希望对南方的朋友也有参考意义。评论区可以继续交流~</p>
      `,
      cover: img[0],
      images: JSON.stringify([img[0], img[1], img[2]]),
      tags: JSON.stringify(['度夏', '景天', '经验']),
      views: 3842,
      shares: 15,
      createdAt: daysAgo(1),
      authorId: u('u1'),
      boardId: bd('jingtian'),
    },
  });
  await seedComments(p1.id, [
    { uid: 'u2', text: '太有用啦!我南方的肉肉今年全军覆没 😭', likes: 18, d: 0.5 },
    { uid: 'u3', text: '通风确实是王道,我仙人球也是一样。', likes: 9, d: 0.4 },
    { uid: 'u4', text: '请问代森锰锌和多菌灵哪个更好?', likes: 3, d: 0.3 },
    { uid: 'u5', text: '学到了,明年试试。', likes: 5, d: 0.25 },
  ], u);

  // 帖子 2:短内容
  await prisma.post.create({
    data: {
      type: PostType.short,
      title: '今天拍到的生石花,刚蜕完皮',
      content: '刚蜕完皮的石头显得格外水灵,忍不住来晒一张。📸',
      cover: img[3],
      images: JSON.stringify([img[3], img[4]]),
      tags: JSON.stringify(['生石花', '蜕皮', '晒图']),
      views: 1203,
      shares: 3,
      createdAt: daysAgo(2),
      authorId: u('u7'),
      boardId: bd('fanxing'),
    },
  });

  // 帖子 3:投票
  const p3 = await prisma.post.create({
    data: {
      type: PostType.vote,
      title: '你觉得新手入坑最适合哪一种多肉?',
      content: '看到新手村一直有人问这个问题,不如大家投个票帮他们做个参考吧 🌱',
      tags: JSON.stringify(['新手', '投票']),
      views: 2431,
      shares: 2,
      createdAt: daysAgo(3),
      authorId: u('u6'),
      boardId: bd('xinshou'),
      vote: {
        create: {
          question: '新手最适合入坑的多肉是?',
          multi: false,
          deadline: daysAgo(-7),
          options: {
            create: [
              { label: '胧月(糖豆石莲系)', votes: 421, orderIdx: 0 },
              { label: '玉露(十二卷)', votes: 208, orderIdx: 1 },
              { label: '虹之玉(景天属)', votes: 312, orderIdx: 2 },
              { label: '仙人球(圆球即正义)', votes: 176, orderIdx: 3 },
              { label: '生石花(劝退专用)', votes: 54, orderIdx: 4 },
            ],
          },
        },
      },
    },
  });
  await seedComments(p3.id, [
    { uid: 'u4', text: '我选胧月,便宜好养!', likes: 12, d: 2 },
    { uid: 'u3', text: '生石花的选项笑死了 🤣', likes: 25, d: 1.8 },
  ], u);

  // 帖子 4:视频
  const p4 = await prisma.post.create({
    data: {
      type: PostType.video,
      title: '【配土教程】通用多肉配土,5 分钟学会',
      content: '把我的配土方子录成了视频,给新手朋友参考。',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      cover: img[5],
      images: JSON.stringify([img[5]]),
      tags: JSON.stringify(['配土', '教程', '视频']),
      views: 8421,
      shares: 45,
      createdAt: daysAgo(4),
      authorId: u('u3'),
      boardId: bd('yangzhi'),
    },
  });
  await seedComments(p4.id, [
    { uid: 'u1', text: '老王出品,必属精品 👍', likes: 20, d: 3 },
    { uid: 'u8', text: '请问稻壳炭去哪里买啊?', likes: 5, d: 2.8 },
  ], u);

  // 帖子 5:Event
  const p5 = await prisma.post.create({
    data: {
      type: PostType.event,
      title: '【线下活动】8 月 20 日·北京·多肉交流茶话会',
      content: '由本版主发起,邀请京津冀肉友线下面基,带上你家的肉肉,一起喝茶聊肉!现场还有<b>盲盒交换</b>环节 🎁',
      cover: img[6],
      images: JSON.stringify([img[6]]),
      tags: JSON.stringify(['线下', '活动', '北京']),
      views: 4213,
      shares: 30,
      createdAt: daysAgo(5),
      authorId: u('u1'),
      boardId: bd('jingtian'),
      event: {
        create: {
          startAt: daysAgo(-20),
          endAt: daysAgo(-20),
          location: '北京市朝阳区某咖啡馆',
        },
      },
    },
  });
  await seedComments(p5.id, [
    { uid: 'u2', text: '报名 +1,带两棵玉露过去!', likes: 8, d: 4 },
    { uid: 'u5', text: '北京肉友集结啦 🥳', likes: 5, d: 3.9 },
  ], u);

  // 帖子 6~12
  const batch: Array<{ type: PostType; data: any }> = [
    {
      type: PostType.rich,
      data: {
        title: '玉露叶片扦插的完整记录(持续更新)',
        content: `<p>从 6 月 1 日开始记录,每周拍一次照。</p>
          <p><b>Day 1</b>:掰下来健康叶片,伤口晾 3 天。</p>
          <p><b>Day 14</b>:根点出现。</p>
          <p><b>Day 30</b>:小芽探头。</p>
          <p><b>Day 60</b>:移盆!</p>
          <p>关键:避光 + 不浇水只喷水雾。</p>`,
        cover: img[7],
        images: JSON.stringify([img[7], img[0]]),
        tags: JSON.stringify(['玉露', '扦插', '记录']),
        views: 2132,
        shares: 12,
        createdAt: daysAgo(6),
        authorId: u('u2'),
        boardId: bd('baihe'),
      },
    },
    {
      type: PostType.short,
      data: {
        title: '今日份的阳台',
        content: '阳光正好,微风不燥,肉肉们都乖乖的。☀️🌿',
        cover: img[0],
        images: JSON.stringify([img[0]]),
        tags: JSON.stringify(['日常']),
        views: 421,
        createdAt: daysAgo(7),
        authorId: u('u4'),
        boardId: bd('yangzhi'),
      },
    },
    {
      type: PostType.vote,
      data: {
        title: '你家肉肉的盆用哪种材质?',
        content: '想换盆,纠结选哪种,来投个票看看大家的选择。',
        tags: JSON.stringify(['盆器', '投票']),
        views: 1021,
        shares: 1,
        createdAt: daysAgo(8),
        authorId: u('u5'),
        boardId: bd('yangzhi'),
        vote: {
          create: {
            question: '你最常用哪种盆?',
            multi: false,
            deadline: daysAgo(-3),
            options: {
              create: [
                { label: '红陶盆(呼吸好)', votes: 152, orderIdx: 0 },
                { label: '瓷盆(颜值党)', votes: 98, orderIdx: 1 },
                { label: '塑料盆(便宜大碗)', votes: 87, orderIdx: 2 },
                { label: '紫砂盆(装逼首选)', votes: 41, orderIdx: 3 },
              ],
            },
          },
        },
      },
    },
    {
      type: PostType.rich,
      data: {
        title: '仙人球开花全记录——从花苞到凋谢只有 12 小时',
        content: `<p>昨晚惊喜地发现我的<b>艾伦费尔德</b>冒花苞了,今天一早拍到了惊艳的开花瞬间。</p>
          <p>仙人球的花通常只开一天,错过就是一年。所以我架了三脚架全程守候。</p>
          <p>结论:<i>仙人球值得!</i></p>`,
        cover: img[4],
        images: JSON.stringify([img[4], img[3]]),
        tags: JSON.stringify(['仙人球', '开花', '延时']),
        views: 6213,
        shares: 21,
        createdAt: daysAgo(9),
        authorId: u('u3'),
        boardId: bd('xianrenzhang'),
      },
    },
    {
      type: PostType.short,
      data: {
        title: '出几棵多头胧月,坐标北京,自提优先',
        content: '如图,多头饱满,上色漂亮。¥80 一棵,同城自提优先。私信联系。',
        cover: img[1],
        images: JSON.stringify([img[1], img[2]]),
        tags: JSON.stringify(['出肉', '北京', '胧月']),
        views: 612,
        createdAt: daysAgo(10),
        authorId: u('u5'),
        boardId: bd('jiaoyi'),
      },
    },
    {
      type: PostType.rich,
      data: {
        title: '救救我的吉娃娃!叶片发软是怎么回事?',
        content: `<p>新手求助 🙏 我的吉娃娃最近叶片发软,中心有点发黑,是黑腐还是正常?</p>
          <p>养护环境:南阳台,配土是<b>市售多肉专用土</b>,一周浇一次水。</p>
          <p>附图求诊!</p>`,
        cover: img[2],
        images: JSON.stringify([img[2]]),
        tags: JSON.stringify(['求助', '吉娃娃', '黑腐']),
        views: 1021,
        createdAt: daysAgo(11),
        authorId: u('u4'),
        boardId: bd('xinshou'),
      },
    },
    {
      type: PostType.video,
      data: {
        title: '我家阳台一年的变化(延时摄影)',
        content: '用手机拍了整整 365 天,剪成 2 分钟的延时。',
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        cover: img[6],
        images: JSON.stringify([img[6]]),
        tags: JSON.stringify(['延时', '阳台', 'vlog']),
        views: 12421,
        shares: 89,
        createdAt: daysAgo(12),
        authorId: u('u5'),
        boardId: bd('yangzhi'),
      },
    },
  ];

  for (const b of batch) {
    await prisma.post.create({ data: { type: b.type, ...b.data } });
  }

  // 给帖子点赞(分散分布)
  console.log('• 点赞分布');
  const allPosts = await prisma.post.findMany({ select: { id: true } });
  const allUsers = [...userIdBySlug.values()];
  for (const p of allPosts) {
    const likers = allUsers.slice(0, 3 + Math.floor(Math.random() * 4));
    for (const uid of likers) {
      await prisma.postLike
        .create({ data: { userId: uid, postId: p.id } })
        .catch(() => null);
    }
  }

  /* -------------- 通知 -------------- */
  console.log('• 通知');
  await prisma.notification.deleteMany({});
  await prisma.notification.createMany({
    data: [
      { recipientId: u('u1'), fromId: u('u2'), type: 'like', text: '赞了你的帖子《夏天来了,我的景天们终于度夏成功!》', link: `/post/${p1.id}`, createdAt: new Date(Date.now() - 2 * 3600_000) },
      { recipientId: u('u1'), fromId: u('u3'), type: 'comment', text: '评论了你:「通风确实是王道,我仙人球也是一样。」', link: `/post/${p1.id}`, createdAt: new Date(Date.now() - 5 * 3600_000) },
      { recipientId: u('u1'), fromId: u('u4'), type: 'follow', text: '关注了你', link: `/user/${u('u4')}`, createdAt: new Date(Date.now() - 10 * 3600_000) },
      { recipientId: u('u1'), fromId: u('u5'), type: 'mention', text: '在《今日份的阳台》中提到了你', createdAt: new Date(Date.now() - 24 * 3600_000), read: true },
      { recipientId: u('u1'), type: 'system', text: '恭喜!你获得了新徽章「小太阳」—— 连续签到 30 天', link: `/user/${u('u1')}`, createdAt: new Date(Date.now() - 48 * 3600_000), read: true },
      { recipientId: u('u1'), fromId: u('u5'), type: 'like', text: '赞了你的帖子《玉露叶片扦插的完整记录》', createdAt: new Date(Date.now() - 60 * 3600_000), read: true },
      { recipientId: u('u1'), type: 'system', text: '你发起的投票「新手入坑多肉」已截止,点击查看最终结果', link: `/post/${p3.id}`, createdAt: new Date(Date.now() - 72 * 3600_000), read: true },
    ],
  });

  /* -------------- 私信 -------------- */
  console.log('• 私信');
  await prisma.message.deleteMany({});
  const minsAgo = (n: number) => new Date(Date.now() - n * 60_000);

  // u1 <-> u2
  await prisma.message.createMany({
    data: [
      { fromId: u('u2'), toId: u('u1'), text: '你好!请问你那边还有多头胧月吗?', createdAt: minsAgo(60) },
      { fromId: u('u1'), toId: u('u2'), text: '有的,还剩 3 棵。', createdAt: minsAgo(55), readAt: minsAgo(50) },
      { fromId: u('u2'), toId: u('u1'), text: '那能包邮到上海吗?', createdAt: minsAgo(20) },
      { fromId: u('u1'), toId: u('u2'), text: '包邮可以,80 一棵,三棵优惠到 220。', createdAt: minsAgo(15), readAt: minsAgo(14) },
      { fromId: u('u2'), toId: u('u1'), text: '成交!', createdAt: minsAgo(10) },
      { fromId: u('u2'), toId: u('u1'), text: '好的,那我明天发你。', createdAt: minsAgo(5) },
    ],
  });
  // u1 <-> u3
  await prisma.message.createMany({
    data: [
      { fromId: u('u3'), toId: u('u1'), text: '王哥,请教一下仙人球配土?', createdAt: minsAgo(120), readAt: minsAgo(118) },
      { fromId: u('u1'), toId: u('u3'), text: '配土比例我一会发你。', createdAt: minsAgo(60), readAt: minsAgo(58) },
    ],
  });
  // u1 <-> u5
  await prisma.message.createMany({
    data: [
      { fromId: u('u5'), toId: u('u1'), text: '在吗?', createdAt: minsAgo(200) },
      { fromId: u('u5'), toId: u('u1'), text: '周末一起去花市呗?', createdAt: minsAgo(180) },
    ],
  });
  // u1 <-> u7
  await prisma.message.createMany({
    data: [
      { fromId: u('u7'), toId: u('u1'), text: '你那篇度夏帖子太有用了,已收藏!', createdAt: minsAgo(1200), readAt: minsAgo(1199) },
    ],
  });

  // 关注关系 — u1 关注 u2, u3;u2/u3 回关 u1
  console.log('• 关注关系');
  const follows = [
    [u('u1'), u('u2')],
    [u('u1'), u('u3')],
    [u('u2'), u('u1')],
    [u('u3'), u('u1')],
    [u('u4'), u('u1')],
    [u('u5'), u('u1')],
  ];
  for (const [f, t] of follows) {
    await prisma.follow
      .upsert({
        where: { followerId_followeeId: { followerId: f, followeeId: t } },
        update: {},
        create: { followerId: f, followeeId: t },
      })
      .catch(() => null);
  }

  // 富文本三栏回填:把所有种子帖子 / 评论的 HTML 转 JSON,并 sanitize
  console.log('• 富文本回填(content → contentJson + contentText)');
  await backfillRichText();

  console.log('✅ Seed 完成');
  console.log('   已创建用户:', users.length, ' 默认密码:123456');
  console.log('   板块:', boards.length, ' 帖子:', allPosts.length, ' 图鉴:', plants.length);

  // 联跑交易/积分/皮肤/任务 seed
  console.log('');
  await import('./seed-market');

  // 联跑三级分类 seed(品种/属/科)
  console.log('');
  const { seedTaxonomy } = await import('./seed-taxonomy');
  await seedTaxonomy();
}

async function backfillRichText() {
  // 帖子
  const posts = await prisma.post.findMany({ select: { id: true, content: true } });
  for (const p of posts) {
    const html = sanitizeHtml(p.content);
    const json = jsonFromHtml(html);
    const text = plainFromHtml(html, 2000);
    await prisma.post.update({
      where: { id: p.id },
      data: {
        content: html,
        contentJson: json ? JSON.stringify(json) : null,
        contentText: text,
      },
    });
  }
  // 评论
  const comments = await prisma.comment.findMany({ select: { id: true, content: true } });
  for (const c of comments) {
    const html = sanitizeHtml(c.content);
    const json = jsonFromHtml(html);
    const text = plainFromHtml(html, 500);
    await prisma.comment.update({
      where: { id: c.id },
      data: {
        content: html,
        contentJson: json ? JSON.stringify(json) : null,
        contentText: text,
      },
    });
  }
  console.log(`   帖子 ${posts.length} 条 / 评论 ${comments.length} 条 已生成 JSON`);
}

async function seedComments(
  postId: string,
  items: { uid: string; text: string; likes: number; d: number }[],
  u: (slug: string) => string
) {
  for (const it of items) {
    await prisma.comment.create({
      data: {
        postId,
        authorId: u(it.uid),
        content: it.text,
        likes: it.likes,
        createdAt: new Date(Date.now() - it.d * 86400_000),
      },
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed 失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
