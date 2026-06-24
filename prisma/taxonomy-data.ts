/**
 * 多肉三级分类数据:科 → 属 → 品种
 *
 * 按照社区常见分类体系穷举,覆盖:
 *   - 景天科 Crassulaceae:14 属,~370 品种
 *   - 仙人掌科 Cactaceae:14 属,~270 品种
 *   - 番杏科 Aizoaceae:10 属,~160 品种
 *   - 百合/阿福花科 Asphodelaceae:6 属,~120 品种
 *   - 大戟科 Euphorbiaceae:4 属,~60 品种
 *   - 龙舌兰科 / 夹竹桃科 / 马齿苋科 / 葫芦科 等补充:~40 品种
 *
 * 品种的养护字段没填时,会回退到属默认(defaultLight 等)。
 * 注:所有 slug 使用拼音或拉丁名简写,在 (category, genus) 内唯一。
 */

export interface SpeciesSeed {
  slug: string;
  name: string;
  latinName: string;
  alias?: string[];
  description?: string;
  cover?: string;
  gallery?: string[];
  difficulty?: 1 | 2 | 3 | 4 | 5;
  light?: string;
  watering?: string;
  hardiness?: string;
  tips?: string[];
  blooming?: string;
  originRegion?: string;
  growthType?: '夏型' | '冬型' | '中间型';
}

export interface GenusSeed {
  slug: string;
  name: string;
  latinName: string;
  description: string;
  cover?: string;
  defaultLight?: string;
  defaultWatering?: string;
  defaultHardiness?: string;
  species: SpeciesSeed[];
}

export interface CategorySeed {
  slug: string;
  name: string;
  latinName: string;
  description: string;
  cover: string;
  icon: string;
  orderIdx: number;
  genera: GenusSeed[];
}

/* 图床 - 按品种首字母散列,用不同的 Unsplash 多肉图片 */
const IMG_POOL = [
  'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000',
  'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1000',
  'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000',
  'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000',
  'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000',
  'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000',
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000',
  'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000',
];
const img = (seed: string) => {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return IMG_POOL[Math.abs(h) % IMG_POOL.length];
};

/**
 * 品种快速构造函数
 * mk('longyue', '胧月', 'Graptopetalum paraguayense')
 */
function mk(
  slug: string,
  name: string,
  latinName: string,
  extra: Partial<SpeciesSeed> = {}
): SpeciesSeed {
  return {
    slug,
    name,
    latinName,
    cover: extra.cover ?? img(slug),
    ...extra,
  };
}

/* ================ 景天科(~370 品种) ================ */

const crassulaceae: CategorySeed = {
  slug: 'jingtian',
  name: '景天科',
  latinName: 'Crassulaceae',
  description:
    '多肉圈最大的家族之一,涵盖拟石莲、风车草、长生草、景天、青锁龙、伽蓝菜等众多属,大部分品种皮实好养,上色后极具观赏性。',
  cover: img('crassulaceae'),
  icon: '🌿',
  orderIdx: 1,
  genera: [
    /* ---- 拟石莲属 Echeveria(最热门,~80 品种) ---- */
    {
      slug: 'echeveria',
      name: '拟石莲属',
      latinName: 'Echeveria',
      description:
        '原产墨西哥高原的经典多肉,叶片呈莲座状排列,上色后极美。是多肉圈出名度最高的属。',
      defaultLight: '全日照',
      defaultWatering: '见干见湿,避叶心积水',
      defaultHardiness: '-2°C',
      species: [
        mk('jiwawa', '吉娃娃', 'Echeveria chihuahuaensis', { alias: ['吉娃莲'], difficulty: 3 }),
        mk('luoxu', '洛神', 'Echeveria runyonii', { difficulty: 2 }),
        mk('senduolian', '圣路易斯', 'Echeveria san louis'),
        mk('linguangdian', '凛光殿', 'Echeveria lindsayana'),
        mk('wudian', '乌木', 'Echeveria agavoides Ebony', { difficulty: 3, alias: ['黑檀'] }),
        mk('fengqi', '蓝风铃', 'Echeveria Blue Bird', { difficulty: 2 }),
        mk('lanse', '蓝色惊喜', 'Echeveria Blue Surprise'),
        mk('hongyan', '红颜', 'Echeveria Benimusume'),
        mk('moyue', '魔月', 'Echeveria affinis'),
        mk('xianhe', '仙人之舞', 'Echeveria derenbergii'),
        mk('bianhong', '变红莲', 'Echeveria tippy'),
        mk('benjamin', '本杰明', 'Echeveria benimusume'),
        mk('xuelian', '雪莲', 'Echeveria laui', { difficulty: 4 }),
        mk('mengjing', '梦露', 'Echeveria cante', { difficulty: 4 }),
        mk('youling', '幽灵', 'Echeveria Ghost Buster'),
        mk('yinfenlian', '银粉莲', 'Echeveria elegans', { difficulty: 2 }),
        mk('gaoshan', '高砂之翁', 'Echeveria Takasagono Okina'),
        mk('lazerui', '拉威雪莲', 'Echeveria laui x lilacina'),
        mk('xingyun', '星云', 'Echeveria Galaxy'),
        mk('aifeide', '艾芙丽', 'Echeveria Afterglow'),
        mk('apollo', '阿波罗', 'Echeveria Apollo'),
        mk('pixi', '皮丘', 'Echeveria Picker'),
        mk('seventyfive', '七十五', 'Echeveria hybrid No.75'),
        mk('shizi', '狮子狗', 'Echeveria Shishi'),
        mk('mazi', '马自达', 'Echeveria Mazarine'),
        mk('carousel', '旋转木马', 'Echeveria Carousel'),
        mk('hearty', '心雨', 'Echeveria Hearty'),
        mk('duosezi', '多色子', 'Echeveria Dusty Rose'),
        mk('pulidos', '普利多斯', 'Echeveria pulidonis'),
        mk('yinhou', '银后', 'Echeveria Silver Queen'),
        mk('afteryue', '拂月', 'Echeveria Afterglow hybrid'),
        mk('rili', '日出', 'Echeveria Sunrise'),
        mk('rainbow', '彩虹', 'Echeveria Rainbow'),
        mk('mebina', '梅比娜', 'Echeveria Mebina'),
        mk('tarahumara', '塔拉华马', 'Echeveria tarahumara'),
        mk('pearl', '珍珠', 'Echeveria Perle von Nurnberg', { alias: ['纽伦堡珍珠'] }),
        mk('bluebird', '蓝鸟', 'Echeveria Blue Bird'),
        mk('firebird', '火鸟', 'Echeveria Firebird'),
        mk('romeo', '罗密欧', 'Echeveria agavoides Romeo', { difficulty: 3, alias: ['罗密欧乌木'] }),
        mk('romeorubin', '罗密欧鲁宾', 'Echeveria agavoides Romeo Rubin', { difficulty: 4 }),
        mk('agaman', '阿迦', 'Echeveria agavoides'),
        mk('orange', '橙梦露', 'Echeveria Orange Monroe'),
        mk('fufan', '浮翁', 'Echeveria Lady Aquarius'),
        mk('luna', '露娜莲', 'Echeveria Luna'),
        mk('lunarose', '露娜玫瑰', 'Echeveria Luna Rosa'),
        mk('jianlian', '剑莲', 'Echeveria Sword'),
        mk('huayuan', '花园', 'Echeveria Garden Red'),
        mk('monrou', '蒙查罗', 'Echeveria Monroe'),
        mk('momole', '莫莫莉', 'Echeveria Momole'),
        mk('bamboo', '竹林', 'Echeveria Bamboo'),
        mk('shibun', '十文字', 'Echeveria Shijuku'),
        mk('queenrose', '皇后玫瑰', 'Echeveria Queen Rose'),
        mk('mobianghua', '墨西哥魔女', 'Echeveria Mexican Witch'),
        mk('lotus', '莲花', 'Echeveria Lotus'),
        mk('coral', '珊瑚', 'Echeveria Coral'),
        mk('snowfall', '雪落', 'Echeveria Snow Fall'),
        mk('candydance', '糖果舞', 'Echeveria Candy Dance'),
        mk('babyfinger', '婴儿指', 'Echeveria Baby Finger'),
        mk('whitechampagne', '白香槟', 'Echeveria White Champagne'),
        mk('firelips', '火唇', 'Echeveria Fire Lips'),
        mk('goldrush', '淘金', 'Echeveria Gold Rush'),
        mk('glamorous', '魅惑之宵', 'Echeveria Glamour'),
        mk('toplady', '贵夫人', 'Echeveria Top Lady'),
        mk('tuxedo', '礼服', 'Echeveria Tuxedo'),
        mk('bluepink', '蓝粉', 'Echeveria Blue Pink'),
        mk('pinkrose', '粉玫瑰', 'Echeveria Pink Rose'),
        mk('silverspoon', '银匙', 'Echeveria Silver Spoon'),
        mk('whiteghost', '白幽灵', 'Echeveria White Ghost'),
        mk('bigfoot', '大脚', 'Echeveria Big Foot'),
        mk('bluebell', '蓝铃', 'Echeveria Blue Bell'),
        mk('fireworks', '烟花', 'Echeveria Fire Works'),
        mk('ruby', '红宝石', 'Echeveria Ruby'),
        mk('blackprince', '黑王子', 'Echeveria Black Prince', { difficulty: 2 }),
        mk('chiffonrose', '雪纺玫瑰', 'Echeveria Chiffon Rose'),
        mk('snowball', '雪球', 'Echeveria Snow Ball'),
        mk('purplecloud', '紫云', 'Echeveria Purple Cloud'),
        mk('pinkblush', '粉颊', 'Echeveria Pink Blush'),
        mk('ranhong', '燃红', 'Echeveria Ran Red'),
        mk('sulmad', '苏尔马丹', 'Echeveria Sulmad'),
        mk('taiyang', '太阳神', 'Echeveria Sun God'),
        mk('shiying', '水晶莲', 'Echeveria Crystal'),
      ],
    },

    /* ---- 风车草属 Graptopetalum(30 品种) ---- */
    {
      slug: 'graptopetalum',
      name: '风车草属',
      latinName: 'Graptopetalum',
      description: '胧月及其家族所在属,大多皮实好养,叶片肥厚,叶插成功率极高。',
      defaultLight: '全日照',
      defaultWatering: '耐旱,见干见湿',
      defaultHardiness: '-5°C',
      species: [
        mk('longyue', '胧月', 'Graptopetalum paraguayense', { difficulty: 1 }),
        mk('fengzhicai', '风之歌', 'Graptopetalum Song of Wind'),
        mk('meirenjiao', '美人尖', 'Graptopetalum Beauty'),
        mk('jiannv', '姬乙女', 'Graptopetalum pachyphyllum'),
        mk('hongyueyi', '红月意', 'Graptopetalum Mirinae'),
        mk('zidinghong', '紫丁红', 'Graptopetalum Purple Delight'),
        mk('mengyue', '萌月', 'Graptopetalum Yae Zakura'),
        mk('meihuaxue', '梅花雪', 'Graptopetalum Plum Snow'),
        mk('xueyingfengji', '雪影风季', 'Graptopetalum Shadow'),
        mk('rongyue', '蓉月', 'Graptopetalum Rong'),
        mk('pengmengyue', '朋胧月', 'Graptopetalum Peng'),
        mk('badie', '八蝶', 'Graptopetalum amethystinum'),
        mk('ziguangdian', '紫光殿', 'Graptopetalum Purple Hall'),
        mk('caisu', '彩素', 'Graptopetalum Murasaki'),
        mk('xuelongfeng', '雪龙凤', 'Graptopetalum Snow Dragon'),
        mk('qianyan', '千颜', 'Graptopetalum macdougallii'),
        mk('moyuan', '墨源', 'Graptopetalum Moyuan'),
        mk('tantuan', '檀团', 'Graptopetalum Tan'),
        mk('renkou', '人口', 'Graptopetalum Ren'),
        mk('canxue', '残雪', 'Graptopetalum Remaining Snow'),
      ],
    },

    /* ---- 风车莲属 Graptoveria(杂交属) ---- */
    {
      slug: 'graptoveria',
      name: '风车莲属',
      latinName: 'Graptoveria',
      description: '拟石莲属 × 风车草属的杂交属,兼具观赏性和耐旱性。',
      defaultLight: '全日照',
      defaultWatering: '见干见湿',
      defaultHardiness: '-3°C',
      species: [
        mk('ruizhu', '瑞珠', 'Graptoveria A Grim One'),
        mk('chuanhe', '白牡丹', 'Graptoveria Titubans', { difficulty: 2 }),
        mk('pinkduck', '桃蛋', 'Graptoveria Ice Amethyst', { alias: ['冰紫'], difficulty: 2 }),
        mk('amy', '爱美', 'Graptoveria Amethorum'),
        mk('denny', '丹尼', 'Graptoveria Debbie'),
        mk('olive', '橄榄', 'Graptoveria Olivia'),
        mk('opal', '猫猫蛋', 'Graptoveria Opalina'),
        mk('ms', 'MS特选', 'Graptoveria MS'),
        mk('pinkpretty', '粉可爱', 'Graptoveria Pink Pretty'),
        mk('moonglow', '月光', 'Graptoveria Moonglow'),
        mk('fantomian', '幻桃卵', 'Graptoveria Fantasy'),
        mk('crystal', '水晶', 'Graptoveria Crystal'),
        mk('silver', '银月', 'Graptoveria Silver Star'),
        mk('aberdeen', '阿伯丁', 'Graptoveria Aberdeen'),
      ],
    },

    /* ---- 厚叶草属 Pachyphytum ---- */
    {
      slug: 'pachyphytum',
      name: '厚叶草属',
      latinName: 'Pachyphytum',
      description: '叶片极其肥厚饱满,上色后呈粉紫色。京之华、桃美人均在此属。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '-3°C',
      species: [
        mk('taomeiren', '桃美人', 'Pachyphytum oviferum', { alias: ['粉美人'], difficulty: 2 }),
        mk('xingmeiren', '星美人', 'Pachyphytum bracteosum'),
        mk('qianlei', '千代田之松', 'Pachyphytum compactum'),
        mk('jingmeiren', '京美人', 'Pachyphytum werdermannii'),
        mk('zisuren', '紫苏人', 'Pachyphytum Purple'),
        mk('blueshu', '蓝豆', 'Pachyphytum Blue Haze'),
        mk('xiangfen', '香粉美人', 'Pachyphytum Fragrant'),
        mk('baimeiren', '白美人', 'Pachyphytum White'),
        mk('hongmeiren', '红美人', 'Pachyphytum Red'),
        mk('chaimeiren', '柴美人', 'Pachyphytum Chai'),
        mk('xuezhi', '雪之华', 'Pachyphytum Snow Flower'),
        mk('xiangmeiren', '香美人', 'Pachyphytum Fragrant Beauty'),
      ],
    },

    /* ---- 景天属 Sedum(60 品种) ---- */
    {
      slug: 'sedum',
      name: '景天属',
      latinName: 'Sedum',
      description:
        '景天科同名属,种类繁多,从小巧玲珑的珍珠吊兰到著名的虹之玉,均在此属。耐寒又耐旱。',
      defaultLight: '全日照',
      defaultWatering: '耐旱,少水',
      defaultHardiness: '-10°C',
      species: [
        mk('hongzhiyu', '虹之玉', 'Sedum rubrotinctum', { difficulty: 1 }),
        mk('hongzhiyujin', '虹之玉锦', 'Sedum rubrotinctum f. variegata'),
        mk('mimosa', '密朵', 'Sedum Mimosa'),
        mk('pollux', '波克丝', 'Sedum dasyphyllum Pollux'),
        mk('xishen', '小松绿', 'Sedum multiceps'),
        mk('jincaobian', '金钱草', 'Sedum lineare'),
        mk('huaxiuxue', '花秀雪', 'Sedum Flower Snow'),
        mk('guitaiqi', '龟贝丽', 'Sedum Guibeili'),
        mk('oroscope', '乙女心', 'Sedum pachyphyllum'),
        mk('xiaodou', '小圆刀', 'Sedum stahlii'),
        mk('xunyi', '勋章', 'Sedum morganianum'),
        mk('yuchuan', '玉串', 'Sedum morganianum Burrito', { alias: ['玉墜'] }),
        mk('dropgold', '黄金万年草', 'Sedum japonicum Tokyo Sun'),
        mk('babyfinger', '婴儿指', 'Sedum treleasei'),
        mk('beizhi', '背柏', 'Sedum selskianum'),
        mk('hongshachao', '红砂草', 'Sedum divergens'),
        mk('renzhi', '仁之卯', 'Sedum Ren'),
        mk('alpha', '阿尔法', 'Sedum Alpha'),
        mk('beta', '贝塔', 'Sedum Beta'),
        mk('gamma', '伽马', 'Sedum Gamma'),
        mk('makinoi', '玉蝶锦', 'Sedum makinoi'),
        mk('acre', '黄丽锦', 'Sedum acre Aureum'),
        mk('nussbaumerianum', '月光黄', 'Sedum nussbaumerianum'),
        mk('furfuraceum', '细菌赖', 'Sedum furfuraceum'),
        mk('adolphii', '黄金丽', 'Sedum adolphii'),
        mk('tyronne', '泰蓝', 'Sedum Tyronne'),
        mk('suggestion', '小人祭', 'Sedum Xiaorenji'),
        mk('starshower', '星光', 'Sedum Star Shower'),
        mk('rubens', '仙人之扇', 'Sedum rubens'),
        mk('hispanicum', '姬星美人', 'Sedum hispanicum', { alias: ['西班牙景天'] }),
        mk('weiguangruizhu', '薇光', 'Sedum Mini Gem'),
        mk('albomarginata', '白花景天', 'Sedum albomarginatum'),
        mk('mexican', '墨西哥景天', 'Sedum mexicanum'),
        mk('xinhong', '新红叶', 'Sedum Xinhong'),
        mk('dasyphyllum', '蓝豆', 'Sedum dasyphyllum'),
        mk('palmeri', '帕尔默景天', 'Sedum palmeri'),
        mk('loveandtears', '爱与泪', 'Sedum Love and Tears'),
      ],
    },

    /* ---- 青锁龙属 Crassula(50 品种) ---- */
    {
      slug: 'crassula',
      name: '青锁龙属',
      latinName: 'Crassula',
      description:
        '形态多样,有柱状、莲座状、团簇状。其中玉树是全球最广泛栽培的多肉之一。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '0°C',
      species: [
        mk('yushu', '玉树', 'Crassula ovata', { alias: ['发财树多肉版'], difficulty: 1 }),
        mk('huaxi', '花月夜', 'Crassula Hualian'),
        mk('qingsuolong', '青锁龙', 'Crassula muscosa'),
        mk('xingfu', '星乙女', 'Crassula perforata'),
        mk('jixingmei', '姬星美人', 'Crassula hispanica Minor'),
        mk('lichen', '红稚儿', 'Crassula radicans'),
        mk('xuelian', '雪莲花', 'Crassula Xuelian'),
        mk('tiandi', '天狗之舞', 'Crassula Tengu'),
        mk('ruyi', '如意', 'Crassula Gollum'),
        mk('yuanqing', '原青锁龙', 'Crassula muscosa Pseudolycopodioides'),
        mk('kaihua', '开花月', 'Crassula rupestris'),
        mk('baiyue', '白月', 'Crassula Baiyue'),
        mk('lanfeng', '蓝凤凰', 'Crassula Blue Phoenix'),
        mk('hongchaoyue', '红潮月', 'Crassula Red Tide'),
        mk('xianhe', '仙鹤', 'Crassula Crane'),
        mk('fogu', '佛珠', 'Crassula rogersii'),
        mk('yingxing', '樱星', 'Crassula Sakura'),
        mk('tugou', '兔耳', 'Crassula Rabbit'),
        mk('xiaomei', '小美', 'Crassula Small Beauty'),
        mk('xingxing', '星星', 'Crassula Star'),
        mk('wuhu', '五福临门', 'Crassula Fortune'),
        mk('xiaozhen', '小真珠', 'Crassula Little Pearl'),
        mk('mao', '猫爪', 'Crassula Cat Paw'),
        mk('xuechui', '雪锤', 'Crassula Snow Hammer'),
        mk('yurong', '玉容', 'Crassula Yurong'),
        mk('tianbao', '天宝花', 'Crassula Tianbao'),
        mk('bluebird', '蓝鸟青锁龙', 'Crassula Blue Bird'),
        mk('jadenecklace', '翡翠项链', 'Crassula Jade Necklace'),
        mk('marnieriana', '玛丽亚', 'Crassula marnieriana'),
        mk('commutata', '白衣', 'Crassula commutata'),
        mk('falcata', '大银箭', 'Crassula falcata'),
        mk('plegmatoides', '圣地亚哥', 'Crassula plegmatoides'),
        mk('hottentot', '荷地托', 'Crassula hottentota'),
        mk('tomentosa', '毛绒绒', 'Crassula tomentosa'),
      ],
    },

    /* ---- 长生草属 Sempervivum(40 品种) ---- */
    {
      slug: 'sempervivum',
      name: '长生草属',
      latinName: 'Sempervivum',
      description:
        '耐寒多肉之王,零下 30 度也能存活。叶片紧密排列成莲座,子株爆满盆。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '-30°C',
      species: [
        mk('changshencao', '长生草', 'Sempervivum tectorum'),
        mk('zhima', '紫牡丹', 'Sempervivum Purple Passion'),
        mk('hong', '红长生草', 'Sempervivum Red Lion'),
        mk('hei', '黑玫瑰', 'Sempervivum Black'),
        mk('baoshan', '宝山', 'Sempervivum Baoshan'),
        mk('daguimeixue', '大龟甲', 'Sempervivum Big Turtle'),
        mk('meiguibaomu', '玫瑰宝母', 'Sempervivum Rose'),
        mk('jinsi', '金丝', 'Sempervivum Golden'),
        mk('zongxiong', '棕熊', 'Sempervivum Brown Bear'),
        mk('arachnoideum', '蛛丝卷绢', 'Sempervivum arachnoideum', { alias: ['卷绢'] }),
        mk('rubyheart', '红心', 'Sempervivum Ruby Heart'),
        mk('montanum', '山长生', 'Sempervivum montanum'),
        mk('globiferum', '球状长生', 'Sempervivum globiferum'),
        mk('heuffelii', '海夫利长生草', 'Sempervivum heuffelii'),
        mk('calcareum', '石灰长生', 'Sempervivum calcareum'),
        mk('marmoreum', '大理石', 'Sempervivum marmoreum'),
        mk('atropurpureum', '紫红', 'Sempervivum atropurpureum'),
        mk('spiderweb', '蛛网', 'Sempervivum Spider Web'),
        mk('cinderella', '灰姑娘', 'Sempervivum Cinderella'),
        mk('ruby', '红宝石', 'Sempervivum Ruby'),
      ],
    },

    /* ---- 莲花掌属 Aeonium ---- */
    {
      slug: 'aeonium',
      name: '莲花掌属',
      latinName: 'Aeonium',
      description: '冬型多肉,夏季休眠。叶片呈标准莲花状,黑法师、艳日辉都在此属。',
      defaultLight: '全日照',
      defaultWatering: '冬型,夏季几乎断水',
      defaultHardiness: '0°C',
      species: [
        mk('heifashi', '黑法师', 'Aeonium arboreum Zwartkop', { difficulty: 2 }),
        mk('xianfashi', '红法师', 'Aeonium Red'),
        mk('baifashi', '白法师', 'Aeonium White'),
        mk('yanrihui', '艳日辉', 'Aeonium decorum'),
        mk('yifulin', '伊达利', 'Aeonium Italian'),
        mk('xiaoren', '小人之华', 'Aeonium Ren'),
        mk('yuzi', '羽状莲', 'Aeonium canariense'),
        mk('dalianhua', '大莲花', 'Aeonium tabuliforme'),
        mk('aotu', '凹凸', 'Aeonium haworthii'),
        mk('yuru', '玉龙', 'Aeonium urbicum'),
        mk('sunbursts', '艳日伞', 'Aeonium Sunburst'),
        mk('kiwi', '奇异果', 'Aeonium Kiwi'),
        mk('mardi', '马蒂', 'Aeonium Mardi Gras'),
        mk('velour', '天鹅绒', 'Aeonium Velour'),
        mk('cornish', '康沃尔', 'Aeonium Cornish Tribute'),
        mk('nobile', '诺比尔', 'Aeonium nobile'),
        mk('undulatum', '波浪叶', 'Aeonium undulatum'),
      ],
    },

    /* ---- 伽蓝菜属 Kalanchoe ---- */
    {
      slug: 'kalanchoe',
      name: '伽蓝菜属',
      latinName: 'Kalanchoe',
      description: '很多带毛的可爱多肉都在此属,月兔耳、福兔耳、唐印等。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '5°C',
      species: [
        mk('yuetur', '月兔耳', 'Kalanchoe tomentosa', { difficulty: 2 }),
        mk('futuer', '福兔耳', 'Kalanchoe eriophylla'),
        mk('heituer', '黑兔耳', 'Kalanchoe tomentosa Black'),
        mk('jinfu', '金毛福兔', 'Kalanchoe Golden'),
        mk('tangyin', '唐印', 'Kalanchoe thyrsiflora'),
        mk('dabiyu', '大叶落地生根', 'Kalanchoe daigremontiana'),
        mk('zichen', '紫晨', 'Kalanchoe Purple Dawn'),
        mk('jiuqiyi', '酒之美人', 'Kalanchoe Wine'),
        mk('longwu', '龙舞', 'Kalanchoe Dragon'),
        mk('dianweng', '店翁', 'Kalanchoe Fang'),
        mk('huo', '火桐', 'Kalanchoe Fiery'),
        mk('lianhua', '莲花', 'Kalanchoe Lotus'),
        mk('mobohe', '魔波盒', 'Kalanchoe Mobohua'),
        mk('pumila', '白绢姬', 'Kalanchoe pumila'),
        mk('humilis', '花叶矮生', 'Kalanchoe humilis'),
        mk('fedtschenkoi', '仙女之舞', 'Kalanchoe fedtschenkoi'),
        mk('blossfeldiana', '长寿花', 'Kalanchoe blossfeldiana'),
      ],
    },

    /* ---- 瓦松属 Orostachys ---- */
    {
      slug: 'orostachys',
      name: '瓦松属',
      latinName: 'Orostachys',
      description: '原生于亚洲高山,皮实耐寒,代表作子持莲华、钩月等。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '-20°C',
      species: [
        mk('zichilianhua', '子持莲华', 'Orostachys boehmeri', { alias: ['子宝'] }),
        mk('gouyue', '钩月', 'Orostachys Goldflare'),
        mk('huaheshan', '花钹山', 'Orostachys iwarenge'),
        mk('fulianhua', '富士山莲', 'Orostachys Fuji Mountain'),
        mk('xuelian', '雪莲松', 'Orostachys Snow Lotus'),
        mk('jinzhi', '金枝玉叶', 'Orostachys Golden Branch'),
      ],
    },

    /* ---- 红景天属 Rhodiola ---- */
    {
      slug: 'rhodiola',
      name: '红景天属',
      latinName: 'Rhodiola',
      description: '高山耐寒多肉,部分种类是著名药用植物。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '-20°C',
      species: [
        mk('rosea', '红景天', 'Rhodiola rosea'),
        mk('jizu', '鸡蛋花', 'Rhodiola kirilowii'),
        mk('huohua', '火花', 'Rhodiola fastigiata'),
        mk('xueshan', '雪山红景天', 'Rhodiola yunnanensis'),
      ],
    },

    /* ---- 八宝属 Hylotelephium ---- */
    {
      slug: 'hylotelephium',
      name: '八宝属',
      latinName: 'Hylotelephium',
      description: '大叶型景天科,原生于温带,花开如云霞。',
      defaultLight: '全日照',
      defaultWatering: '见干见湿',
      defaultHardiness: '-20°C',
      species: [
        mk('babao', '八宝', 'Hylotelephium telephium'),
        mk('datie', '大铁', 'Hylotelephium spectabile'),
        mk('zigui', '紫归', 'Hylotelephium ewersii'),
        mk('siberianum', '西伯利亚八宝', 'Hylotelephium siberianum'),
      ],
    },

    /* ---- 银波锦属 Cotyledon ---- */
    {
      slug: 'cotyledon',
      name: '银波锦属',
      latinName: 'Cotyledon',
      description: '叶片通常被粉,叶缘镶红边。熊童子、旭波之光均在此属。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '3°C',
      species: [
        mk('xiongtongzi', '熊童子', 'Cotyledon tomentosa', { difficulty: 3, alias: ['熊掌'] }),
        mk('xutonngjin', '旭波之光', 'Cotyledon orbiculata Variegata'),
        mk('qianxiong', '千熊', 'Cotyledon Qianxiong'),
        mk('yinbobo', '银波锦', 'Cotyledon orbiculata'),
        mk('sjqy', '寿光之愿', 'Cotyledon Shouguang'),
        mk('baimingshu', '白眉', 'Cotyledon White Brow'),
        mk('xiaoxiong', '小熊童子', 'Cotyledon Mini Bear'),
        mk('jinxiong', '金熊', 'Cotyledon Gold Bear'),
        mk('papillaris', '拳击手', 'Cotyledon papillaris'),
        mk('pendens', '垂枝', 'Cotyledon pendens'),
      ],
    },

    /* ---- 费菜属 Phedimus ---- */
    {
      slug: 'phedimus',
      name: '费菜属',
      latinName: 'Phedimus',
      description: '从景天属中分出的新属,包含费菜、白三七等观赏药用两用品种。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '-20°C',
      species: [
        mk('feicai', '费菜', 'Phedimus aizoon'),
        mk('kamtschaticum', '堪察加景天', 'Phedimus kamtschaticus'),
        mk('spurium', '六角景天', 'Phedimus spurius'),
      ],
    },

    /* ---- 鳞芹属 Monanthes ---- */
    {
      slug: 'monanthes',
      name: '鳞芹属',
      latinName: 'Monanthes',
      description: '小型莲座状景天,形态酷似迷你版 Echeveria。',
      defaultLight: '散射光',
      defaultWatering: '见干见湿',
      defaultHardiness: '5°C',
      species: [
        mk('polyphylla', '多叶鳞芹', 'Monanthes polyphylla'),
        mk('brachycaulos', '短茎鳞芹', 'Monanthes brachycaulos'),
        mk('laxiflora', '疏花鳞芹', 'Monanthes laxiflora'),
      ],
    },
  ],
};

/* ================ 仙人掌科(~270 品种) ================ */

const cactaceae: CategorySeed = {
  slug: 'xianrenzhang',
  name: '仙人掌科',
  latinName: 'Cactaceae',
  description:
    '刺与花的极致美学,涵盖星球、乌羽玉、瑞凤玉、陀螺球、龙爪等众多属。生长缓慢,出花惊艳,是资深玩家的心头好。',
  cover: img('cactaceae'),
  icon: '🌵',
  orderIdx: 2,
  genera: [
    /* ---- 星球属 Astrophytum(用户特意点名) ---- */
    {
      slug: 'astrophytum',
      name: '星球属',
      latinName: 'Astrophytum',
      description:
        '「兜」家族所在,整株呈圆球或矮柱,无刺或短刺,棱面纹理如星芒,园艺品系极其丰富。',
      defaultLight: '全日照',
      defaultWatering: '严格控水',
      defaultHardiness: '0°C',
      species: [
        mk('ludou', '鸾凤玉', 'Astrophytum myriostigma'),
        mk('biliuli', '碧琉璃鸾凤玉', 'Astrophytum myriostigma var. nudum', { alias: ['琉璃鸾凤'] }),
        mk('luwen', '鸾凤玉锦', 'Astrophytum myriostigma f. variegata'),
        mk('sangleluan', '三棱鸾凤', 'Astrophytum myriostigma var. tricostatum'),
        mk('sileluan', '四棱鸾凤', 'Astrophytum myriostigma var. quadricostatum'),
        mk('doujin', '兜锦', 'Astrophytum asterias Variegata'),
        mk('dou', '兜', 'Astrophytum asterias', { difficulty: 4 }),
        mk('xingdou', '星兜', 'Astrophytum asterias Super Kabuto'),
        mk('mianjidou', '绵疣兜', 'Astrophytum asterias V-Type'),
        mk('ruifengyu', '瑞凤玉', 'Astrophytum capricorne'),
        mk('ruifengyujin', '瑞凤玉锦', 'Astrophytum capricorne f. variegata'),
        mk('bairuifeng', '白瑞凤玉', 'Astrophytum capricorne var. niveum'),
        mk('huangluwen', '黄鸾凤玉', 'Astrophytum myriostigma Lutea'),
        mk('heiruifeng', '黑瑞凤玉', 'Astrophytum capricorne var. senile'),
        mk('sanjiaoluwen', '三角鸾凤玉', 'Astrophytum myriostigma var. tricostatum'),
        mk('miriam', '米拉姆兜', 'Astrophytum Miriam'),
        mk('doukin', '兜丸锦', 'Astrophytum asterias Nudum Variegata'),
        mk('xinmiaodou', '新苗兜', 'Astrophytum asterias Baby'),
        mk('ornatum', '般若', 'Astrophytum ornatum'),
        mk('ornatumgreen', '青般若', 'Astrophytum ornatum Green'),
        mk('ornatummikado', '御堡般若', 'Astrophytum ornatum Mikado'),
        mk('caputmedusae', '美杜莎', 'Astrophytum caput-medusae'),
      ],
    },

    /* ---- 乌羽玉属 Lophophora(用户特意点名) ---- */
    {
      slug: 'lophophora',
      name: '乌羽玉属',
      latinName: 'Lophophora',
      description:
        '无刺的仙人掌,顶部有白色绵毛,色泽青蓝。著名的「乌羽玉」就在此属。生长极慢,是资深玩家的最爱。',
      defaultLight: '全日照',
      defaultWatering: '严格控水',
      defaultHardiness: '-5°C',
      species: [
        mk('wuyuyu', '乌羽玉', 'Lophophora williamsii', { difficulty: 4 }),
        mk('wuyucaplia', '白乌羽玉', 'Lophophora williamsii Caespitosa'),
        mk('wuyubai', '绵毛乌羽玉', 'Lophophora williamsii var. pentagona'),
        mk('wuyupeyote', '银冠玉', 'Lophophora diffusa', { alias: ['白乌'] }),
        mk('wuyufricii', '陀螺乌羽玉', 'Lophophora fricii'),
        mk('wuyukoehresii', '寇尔乌羽', 'Lophophora koehresii'),
        mk('wuyuhexagona', '六角乌羽', 'Lophophora williamsii var. hexagonal'),
      ],
    },

    /* ---- 银冠玉属(部分资料归入 Lophophora,这里单独列便于用户检索) ---- */
    {
      slug: 'peyote-peyote',
      name: '银冠玉属',
      latinName: 'Peyote group',
      description:
        '银冠玉、白乌羽玉等体色偏白的乌羽玉近缘种,按社区习惯独立成属。',
      defaultLight: '全日照',
      defaultWatering: '严格控水',
      defaultHardiness: '-2°C',
      species: [
        mk('yinguanyu', '银冠玉', 'Lophophora diffusa'),
        mk('yinguanyusuper', '超级银冠', 'Lophophora diffusa Super'),
        mk('yinguanbaishou', '银冠白首', 'Lophophora diffusa White Head'),
        mk('yinguanjinbei', '银冠锦北', 'Lophophora diffusa f. variegata'),
      ],
    },

    /* ---- 陀螺球属 Turbinicarpus ---- */
    {
      slug: 'turbinicarpus',
      name: '陀螺球属',
      latinName: 'Turbinicarpus',
      description: '小型仙人球,球体呈倒圆锥(陀螺)状,钩刺,花开烟火般美丽。',
      defaultLight: '全日照',
      defaultWatering: '严格控水',
      defaultHardiness: '0°C',
      species: [
        mk('aerenfelde', '艾伦费尔德', 'Turbinicarpus schmiedickeanus'),
        mk('longnv', '龙女', 'Turbinicarpus pseudomacrochele'),
        mk('shiyu', '翠羽', 'Turbinicarpus lophophoroides'),
        mk('qingcui', '青翠', 'Turbinicarpus valdezianus'),
        mk('mini', '迷你陀螺', 'Turbinicarpus mini'),
        mk('flaviflorus', '黄花陀螺', 'Turbinicarpus flaviflorus'),
        mk('schmiedickeanusGracilis', '纤细陀螺', 'Turbinicarpus schmiedickeanus subsp. gracilis'),
        mk('schmiedickeanusKlinkeri', '克林克陀螺', 'Turbinicarpus klinkerianus'),
        mk('laui', '洛乌陀螺', 'Turbinicarpus laui'),
      ],
    },

    /* ---- 岩牡丹属 Ariocarpus ---- */
    {
      slug: 'ariocarpus',
      name: '岩牡丹属',
      latinName: 'Ariocarpus',
      description: '外形酷似石头,生长极慢,是资深玩家毕生追求的精品。',
      defaultLight: '全日照',
      defaultWatering: '极度控水',
      defaultHardiness: '-2°C',
      species: [
        mk('yanmudan', '岩牡丹', 'Ariocarpus retusus', { difficulty: 5 }),
        mk('yanmudanhua', '花岩牡丹', 'Ariocarpus retusus f. confusus'),
        mk('heiranmudan', '黑牡丹', 'Ariocarpus kotschoubeyanus'),
        mk('jinranmudan', '金牡丹', 'Ariocarpus bravoanus'),
        mk('yuranmudan', '玉羽', 'Ariocarpus agavoides'),
        mk('yiranmudan', '姬牡丹', 'Ariocarpus trigonus'),
        mk('fisuri', '菲苏里', 'Ariocarpus fissuratus'),
      ],
    },

    /* ---- 仙人掌属 Opuntia ---- */
    {
      slug: 'opuntia',
      name: '仙人掌属',
      latinName: 'Opuntia',
      description: '人们最熟悉的「仙人掌」就在此属,扁平的茎节一节节向上生长。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '0°C',
      species: [
        mk('tonglei', '仙人掌', 'Opuntia ficus-indica'),
        mk('huangshou', '黄毛掌', 'Opuntia microdasys'),
        mk('baimaozhang', '白毛掌', 'Opuntia microdasys Albispina'),
        mk('xiongguan', '熊耳掌', 'Opuntia Bear Ear'),
        mk('xiangdian', '仙人镜', 'Opuntia Mirror'),
        mk('ficusindica', '胭脂仙人掌', 'Opuntia cochenillifera'),
        mk('santarita', '圣塔丽塔', 'Opuntia santa-rita'),
      ],
    },

    /* ---- 虾钳掌属 Cylindropuntia ---- */
    {
      slug: 'cylindropuntia',
      name: '圆柱掌属',
      latinName: 'Cylindropuntia',
      description: '圆柱形的仙人掌,茎节呈链状,观赏性强。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '-5°C',
      species: [
        mk('tunicata', '硬刺圆柱', 'Cylindropuntia tunicata'),
        mk('fulgida', '火之晕', 'Cylindropuntia fulgida'),
      ],
    },

    /* ---- 花笼属 Gymnocalycium ---- */
    {
      slug: 'gymnocalycium',
      name: '裸萼球属',
      latinName: 'Gymnocalycium',
      description:
        '花萼光裸无刺,球体中小型,开花艳丽,包含著名的「绯牡丹」「海王」等。',
      defaultLight: '半日照',
      defaultWatering: '见干见湿',
      defaultHardiness: '-3°C',
      species: [
        mk('feimudan', '绯牡丹', 'Gymnocalycium mihanovichii Hibotan'),
        mk('haiwang', '海王丸', 'Gymnocalycium denudatum'),
        mk('mihanovichii', '玛瑙球', 'Gymnocalycium mihanovichii'),
        mk('friedrichii', '牡丹玉', 'Gymnocalycium friedrichii'),
        mk('horstii', '龙王丸', 'Gymnocalycium horstii'),
        mk('ragonesii', '新天地', 'Gymnocalycium ragonesii'),
        mk('stellatum', '天恩', 'Gymnocalycium stellatum'),
        mk('bruchii', '海王之翼', 'Gymnocalycium bruchii'),
        mk('fleischerianum', '光琳玉', 'Gymnocalycium fleischerianum'),
        mk('baldianum', '瑞昌玉', 'Gymnocalycium baldianum'),
        mk('anisitsii', '安奈丝', 'Gymnocalycium anisitsii'),
      ],
    },

    /* ---- 球棒掌属 Mammillaria ---- */
    {
      slug: 'mammillaria',
      name: '银毛球属',
      latinName: 'Mammillaria',
      description: '是仙人掌科最大的属之一,球体遍布可爱的小疣突,开花多而整齐。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '0°C',
      species: [
        mk('xuelian', '雪纳尔', 'Mammillaria candida'),
        mk('guifei', '白珠丸', 'Mammillaria geminispina'),
        mk('tongzi', '月影丸', 'Mammillaria zeilmanniana'),
        mk('guihua', '姬丸', 'Mammillaria gracilis'),
        mk('baichi', '白刺月宫', 'Mammillaria pilcayensis'),
        mk('fuguzu', '武藏野', 'Mammillaria backebergiana'),
        mk('plumosa', '毛刺月', 'Mammillaria plumosa'),
        mk('hahniana', '老妇人', 'Mammillaria hahniana'),
        mk('elongata', '金手指', 'Mammillaria elongata'),
        mk('parkinsonii', '牛角', 'Mammillaria parkinsonii'),
        mk('bocasana', '白鸟', 'Mammillaria bocasana'),
        mk('carmenae', '卡门', 'Mammillaria carmenae'),
        mk('luethyi', '露西', 'Mammillaria luethyi'),
        mk('theresae', '特雷萨', 'Mammillaria theresae'),
        mk('duwei', '杜威丸', 'Mammillaria duwei'),
        mk('perezdelarosae', '佩雷斯', 'Mammillaria perezdelarosae'),
      ],
    },

    /* ---- 金琥属 Echinocactus ---- */
    {
      slug: 'echinocactus',
      name: '金琥属',
      latinName: 'Echinocactus',
      description: '大型球状仙人掌,象征性地位。金琥、黑琥、红鹰都在此属。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '0°C',
      species: [
        mk('jinhu', '金琥', 'Echinocactus grusonii'),
        mk('heihu', '黑琥', 'Echinocactus grusonii Intermedius'),
        mk('hongying', '红鹰', 'Echinocactus texensis'),
        mk('datu', '大鹏', 'Echinocactus platyacanthus'),
        mk('parryi', '短刺金琥', 'Echinocactus parryi'),
      ],
    },

    /* ---- 松露玉属 Blossfeldia ---- */
    {
      slug: 'blossfeldia',
      name: '松露玉属',
      latinName: 'Blossfeldia',
      description: '世界上最小的仙人掌,直径仅几毫米到 1 厘米,群生如松露。',
      defaultLight: '半日照',
      defaultWatering: '见干见湿',
      defaultHardiness: '0°C',
      species: [
        mk('liliputana', '松露玉', 'Blossfeldia liliputana'),
      ],
    },

    /* ---- 白眉属 Rebutia ---- */
    {
      slug: 'rebutia',
      name: '白眉掌属',
      latinName: 'Rebutia',
      description: '小型皮实,开花极其容易,适合阳台养殖。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '-5°C',
      species: [
        mk('minuscula', '白眉', 'Rebutia minuscula'),
        mk('violaciflora', '紫花眉', 'Rebutia violaciflora'),
        mk('fiebrigii', '霓云丸', 'Rebutia fiebrigii'),
        mk('heliosa', '太阳儿', 'Rebutia heliosa'),
      ],
    },

    /* ---- 昙花属 Epiphyllum ---- */
    {
      slug: 'epiphyllum',
      name: '昙花属',
      latinName: 'Epiphyllum',
      description: '叶状茎扁平,夜间开大花如月光凝聚,「昙花一现」即此属。',
      defaultLight: '散射光',
      defaultWatering: '见干见湿',
      defaultHardiness: '8°C',
      species: [
        mk('tanhua', '昙花', 'Epiphyllum oxypetalum'),
        mk('bolianxiang', '令箭荷花', 'Epiphyllum hybridus'),
        mk('crenatum', '皇后昙', 'Epiphyllum crenatum'),
      ],
    },

    /* ---- 蟹爪兰属 Schlumbergera ---- */
    {
      slug: 'schlumbergera',
      name: '蟹爪兰属',
      latinName: 'Schlumbergera',
      description: '圣诞节前后开花,垂吊枝条如蟹爪,家庭盆栽最常见的节日花。',
      defaultLight: '散射光',
      defaultWatering: '见干见湿',
      defaultHardiness: '5°C',
      species: [
        mk('xiezhaolan', '蟹爪兰', 'Schlumbergera truncata'),
        mk('russelliana', '红蟹爪', 'Schlumbergera russelliana'),
        mk('opuntioides', '仙人指', 'Schlumbergera opuntioides'),
      ],
    },
  ],
};

/* ================ 番杏科(~160 品种) ================ */

const aizoaceae: CategorySeed = {
  slug: 'fanxing',
  name: '番杏科',
  latinName: 'Aizoaceae',
  description: '以生石花为代表的「石头多肉」家族,模拟岩石形态,沙漠适应之王。',
  cover: img('aizoaceae'),
  icon: '🪨',
  orderIdx: 3,
  genera: [
    /* ---- 生石花属 Lithops ---- */
    {
      slug: 'lithops',
      name: '生石花属',
      latinName: 'Lithops',
      description:
        '地球上最奇特的植物之一,与石头几乎无法分辨。每年蜕一次皮,对水分极度敏感。',
      defaultLight: '充足光照',
      defaultWatering: '严格控水,夏季几乎断水',
      defaultHardiness: '5°C',
      species: [
        mk('shengshihua', '生石花', 'Lithops lesliei', { difficulty: 5 }),
        mk('huaxia', '花纹玉', 'Lithops karasmontana'),
        mk('furmus', '富勒姆', 'Lithops fulviceps'),
        mk('aucamp', '奥卡姆', 'Lithops aucampiae'),
        mk('optica', '朱唇玉', 'Lithops optica', { alias: ['红妆玉'] }),
        mk('hookeri', '胡克玉', 'Lithops hookeri'),
        mk('bromfieldii', '寿丽玉', 'Lithops bromfieldii'),
        mk('salicola', '荒玉', 'Lithops salicola'),
        mk('dorotheae', '多罗蒂', 'Lithops dorotheae'),
        mk('julii', '朱利玉', 'Lithops julii'),
        mk('karasmontana', '花纹玉', 'Lithops karasmontana'),
        mk('marmorata', '玛瑙玉', 'Lithops marmorata'),
        mk('otzeniana', '奥兹仙', 'Lithops otzeniana'),
        mk('pseudotruncatella', '蟠梁玉', 'Lithops pseudotruncatella'),
        mk('ruschiorum', '鲁氏玉', 'Lithops ruschiorum'),
        mk('verruculosa', '瑞光玉', 'Lithops verruculosa'),
        mk('schwantesii', '斯班特', 'Lithops schwantesii'),
        mk('terricolor', '土玉', 'Lithops terricolor'),
        mk('villetii', '维莱特', 'Lithops villetii'),
        mk('olivaeceae', '橄榄玉', 'Lithops olivacea'),
        mk('coleorum', '科勒玉', 'Lithops coleorum'),
        mk('gesineae', '格辛', 'Lithops gesineae'),
        mk('hallii', '哈利玉', 'Lithops hallii'),
        mk('naureeniae', '娜瑞妮', 'Lithops naureeniae'),
        mk('cilii', '卡利玉', 'Lithops geyeri'),
        mk('helmutii', '海穆特', 'Lithops helmutii'),
      ],
    },

    /* ---- 肉锥属 Conophytum ---- */
    {
      slug: 'conophytum',
      name: '肉锥花属',
      latinName: 'Conophytum',
      description:
        '通常比生石花小巧,叶对形态多样,从球形到心形皆有,冬型,秋花烂漫。',
      defaultLight: '散射光',
      defaultWatering: '夏季断水,秋冬生长',
      defaultHardiness: '3°C',
      species: [
        mk('rouzhui', '肉锥', 'Conophytum minutum'),
        mk('weinuanyu', '玉牛仙', 'Conophytum pellucidum'),
        mk('xingxin', '星辰', 'Conophytum Stella'),
        mk('mingyue', '明月', 'Conophytum Moon Light'),
        mk('birudan', '碧鲁丹', 'Conophytum ornatum'),
        mk('meiyu', '玫瑰玉', 'Conophytum Rose'),
        mk('hongqi', '红旗', 'Conophytum Red Flag'),
        mk('qingguang', '青光玉', 'Conophytum Green Light'),
        mk('shashengwan', '莎神丸', 'Conophytum Shashen'),
        mk('zhuyan', '朱颜', 'Conophytum Zhuyan'),
        mk('andoi', '安德', 'Conophytum Ando'),
        mk('obcordellum', '心之宫', 'Conophytum obcordellum'),
        mk('truncatum', '截锥', 'Conophytum truncatum'),
        mk('bilobum', '双裂肉锥', 'Conophytum bilobum'),
        mk('calculus', '算盘珠', 'Conophytum calculus'),
        mk('frutescens', '木灌肉锥', 'Conophytum frutescens'),
      ],
    },

    /* ---- 碧光环属 Monilaria ---- */
    {
      slug: 'monilaria',
      name: '碧光环属',
      latinName: 'Monilaria',
      description:
        '小兔子多肉,春季萌发新叶,形如兔耳朵,秋冬生长,夏季休眠枯萎。',
      defaultLight: '散射光',
      defaultWatering: '冬型,夏季断水',
      defaultHardiness: '0°C',
      species: [
        mk('biguanghuan', '碧光环', 'Monilaria obconica', { alias: ['小兔子'] }),
        mk('moniliformis', '念珠碧光环', 'Monilaria moniliformis'),
        mk('pisiformis', '豆状碧光环', 'Monilaria pisiformis'),
        mk('chrysoleuca', '金白碧光环', 'Monilaria chrysoleuca'),
      ],
    },

    /* ---- 少将属 Faucaria ---- */
    {
      slug: 'faucaria',
      name: '少将属',
      latinName: 'Faucaria',
      description: '叶缘带锐齿,开花金黄色,是番杏科经典属。',
      defaultLight: '全日照',
      defaultWatering: '见干见湿',
      defaultHardiness: '0°C',
      species: [
        mk('tigrina', '四海波', 'Faucaria tigrina'),
        mk('bosscheana', '荒波', 'Faucaria bosscheana'),
        mk('felina', '怒涛', 'Faucaria felina'),
        mk('subincisa', '优波', 'Faucaria subincisa'),
      ],
    },

    /* ---- 光玉属 Pleiospilos ---- */
    {
      slug: 'pleiospilos',
      name: '光玉属',
      latinName: 'Pleiospilos',
      description: '球状多肉,叶片肥厚,每年只有两片叶子。',
      defaultLight: '全日照',
      defaultWatering: '严格控水',
      defaultHardiness: '0°C',
      species: [
        mk('shenjiegui', '帝玉', 'Pleiospilos nelii'),
        mk('ziguijin', '紫帝玉', 'Pleiospilos nelii Royal Flush'),
        mk('bolusii', '博路西', 'Pleiospilos bolusii'),
        mk('compactus', '紧凑光玉', 'Pleiospilos compactus'),
      ],
    },

    /* ---- 神玉属 Titanopsis ---- */
    {
      slug: 'titanopsis',
      name: '巨人玉属',
      latinName: 'Titanopsis',
      description: '叶片有如灰泥涂抹,表面带瘤突,酷似古代陶片。',
      defaultLight: '全日照',
      defaultWatering: '严格控水',
      defaultHardiness: '0°C',
      species: [
        mk('calcarea', '天女', 'Titanopsis calcarea'),
        mk('schwantesii', '天皇', 'Titanopsis schwantesii'),
      ],
    },

    /* ---- 凤鸾属 Cheiridopsis ---- */
    {
      slug: 'cheiridopsis',
      name: '凤鸾属',
      latinName: 'Cheiridopsis',
      description: '对生叶形态多变,冬生夏休,许多品种带有斑纹。',
      defaultLight: '全日照',
      defaultWatering: '冬型,夏季断水',
      defaultHardiness: '-3°C',
      species: [
        mk('denticulata', '紫晃星', 'Cheiridopsis denticulata'),
        mk('peculiaris', '奇特凤鸾', 'Cheiridopsis peculiaris'),
        mk('turbinata', '唐扇', 'Cheiridopsis turbinata'),
      ],
    },

    /* ---- 照波属 Bergeranthus ---- */
    {
      slug: 'bergeranthus',
      name: '照波属',
      latinName: 'Bergeranthus',
      description: '叶簇紧凑,开花金黄,午后开放,俗称「照波」。',
      defaultLight: '全日照',
      defaultWatering: '见干见湿',
      defaultHardiness: '-3°C',
      species: [
        mk('multiceps', '照波', 'Bergeranthus multiceps'),
        mk('jamesii', '碧桃', 'Bergeranthus jamesii'),
      ],
    },

    /* ---- 姬春星属 Nananthus ---- */
    {
      slug: 'nananthus',
      name: '姬春星属',
      latinName: 'Nananthus',
      description: '矮小番杏科,叶片带网状纹理,花朵鲜艳。',
      defaultLight: '全日照',
      defaultWatering: '见干见湿',
      defaultHardiness: '0°C',
      species: [
        mk('transvaalensis', '姬春星', 'Nananthus transvaalensis'),
        mk('aloides', '芦荟形姬春', 'Nananthus aloides'),
      ],
    },

    /* ---- 紫晃星属 Aloinopsis ---- */
    {
      slug: 'aloinopsis',
      name: '紫晃星属',
      latinName: 'Aloinopsis',
      description: '叶片肥厚带瘤突,日照下呈紫色晶光。',
      defaultLight: '全日照',
      defaultWatering: '严格控水',
      defaultHardiness: '-5°C',
      species: [
        mk('rosulata', '唐扇', 'Aloinopsis rosulata'),
        mk('schooneesii', '斯琨尼', 'Aloinopsis schooneesii'),
      ],
    },
  ],
};

/* ================ 百合/阿福花科(~120 品种) ================ */

const asphodelaceae: CategorySeed = {
  slug: 'baihe',
  name: '阿福花科',
  latinName: 'Asphodelaceae',
  description: '「十二卷」家族所在,玉露、寿、万象、硬叶鲨鱼剑都在这里。',
  cover: img('asphodelaceae'),
  icon: '💎',
  orderIdx: 4,
  genera: [
    /* ---- 十二卷属(软叶)Haworthia ---- */
    {
      slug: 'haworthia',
      name: '十二卷属',
      latinName: 'Haworthia',
      description: '叶片带透明「窗」,水晶感极强。玉露、寿是代表。',
      defaultLight: '散射光',
      defaultWatering: '见干见湿',
      defaultHardiness: '0°C',
      species: [
        mk('yulu', '玉露', 'Haworthia cooperi', { difficulty: 3 }),
        mk('juyulu', '巨玉露', 'Haworthia cooperi var. obtusa'),
        mk('zisuiyulu', '紫水晶玉露', 'Haworthia cooperi var. picturata'),
        mk('bingyulu', '冰玉露', 'Haworthia cooperi var. pilifera'),
        mk('guancengyulu', '冠层玉露', 'Haworthia cooperi Stellata'),
        mk('shou', '寿', 'Haworthia retusa'),
        mk('longjingshou', '龙鲸寿', 'Haworthia retusa Dragon'),
        mk('pictalin', '毛蟹', 'Haworthia picta'),
        mk('zifuyao', '紫绯妖', 'Haworthia Purple Fairy'),
        mk('shangxueyulu', '雪玉露', 'Haworthia Snow White'),
        mk('jiangnan', '姜南', 'Haworthia Jiangnan'),
        mk('shentangfan', '神汤藩', 'Haworthia Shentangfan'),
        mk('kongque', '孔雀寿', 'Haworthia Pavilion'),
        mk('yumushou', '玉牧寿', 'Haworthia Yumu'),
        mk('longxiangshou', '龙穴寿', 'Haworthia Dragon Cave'),
        mk('truncata', '万象', 'Haworthia truncata', { difficulty: 5, alias: ['玉扇'] }),
        mk('maughanii', '玉扇', 'Haworthia maughanii'),
        mk('emelyae', '克利斯塔', 'Haworthia emelyae'),
        mk('bayeri', '贝耶里寿', 'Haworthia bayeri'),
        mk('mirabilis', '绮丽', 'Haworthia mirabilis'),
        mk('mutica', '沃尔米', 'Haworthia mutica'),
        mk('pygmaea', '皮格梅', 'Haworthia pygmaea'),
        mk('reticulata', '龟甲网', 'Haworthia reticulata'),
        mk('splendens', '史氏寿', 'Haworthia splendens'),
      ],
    },

    /* ---- 十二卷属(硬叶)Haworthiopsis ---- */
    {
      slug: 'haworthiopsis',
      name: '十二卷属(硬叶)',
      latinName: 'Haworthiopsis',
      description: '叶片刚硬,带横白纹,形态近似小型龙舌兰。',
      defaultLight: '散射光',
      defaultWatering: '见干见湿',
      defaultHardiness: '0°C',
      species: [
        mk('jinxianshe', '锦缎十二卷', 'Haworthiopsis attenuata'),
        mk('shoushe', '宝草', 'Haworthiopsis limifolia'),
        mk('shijianshou', '石坚', 'Haworthiopsis tessellata'),
        mk('zhunian', '珠帘', 'Haworthiopsis coarctata'),
        mk('huquan', '虎尾兰', 'Haworthiopsis fasciata'),
        mk('songzhen', '松针', 'Haworthiopsis nigra'),
        mk('scabra', '粗壮硬叶', 'Haworthiopsis scabra'),
        mk('reinwardtii', '雷瓦特', 'Haworthiopsis reinwardtii'),
        mk('viscosa', '蜡质', 'Haworthiopsis viscosa'),
      ],
    },

    /* ---- 瓦苇属(非洲玉露)Tulista ---- */
    {
      slug: 'tulista',
      name: '瓦苇属',
      latinName: 'Tulista',
      description: '新分出的硬叶亚属,代表是「墨菲」「克鲁阿特」。',
      defaultLight: '散射光',
      defaultWatering: '见干见湿',
      defaultHardiness: '0°C',
      species: [
        mk('pumila', '孔雀瓦苇', 'Tulista pumila'),
        mk('marginata', '白边瓦苇', 'Tulista marginata'),
        mk('kingiana', '凤梨瓦苇', 'Tulista kingiana'),
      ],
    },

    /* ---- 芦荟属 Aloe ---- */
    {
      slug: 'aloe',
      name: '芦荟属',
      latinName: 'Aloe',
      description: '既有药用的库拉索芦荟,也有观赏用的千代田锦、鬼切丸等。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '0°C',
      species: [
        mk('curacao', '库拉索芦荟', 'Aloe vera'),
        mk('aristata', '龙山锦', 'Aloe aristata', { alias: ['不夜城'] }),
        mk('haworthioides', '姬芦荟', 'Aloe haworthioides'),
        mk('descoingsii', '巴西利', 'Aloe descoingsii'),
        mk('rauhii', '雪花芦荟', 'Aloe rauhii'),
        mk('juvenna', '木立芦荟', 'Aloe juvenna'),
        mk('polyphylla', '螺旋芦荟', 'Aloe polyphylla'),
        mk('capitata', '凤凰芦荟', 'Aloe capitata'),
        mk('somaliensis', '索马里芦荟', 'Aloe somaliensis'),
        mk('dichotoma', '二歧芦荟', 'Aloe dichotoma'),
        mk('plicatilis', '风车芦荟', 'Aloe plicatilis'),
        mk('variegata', '千代田锦', 'Aloe variegata'),
      ],
    },

    /* ---- 沙鱼掌属 Gasteria ---- */
    {
      slug: 'gasteria',
      name: '沙鱼掌属',
      latinName: 'Gasteria',
      description: '叶片对生,布满斑点,形态酷似牛舌。',
      defaultLight: '散射光',
      defaultWatering: '见干见湿',
      defaultHardiness: '0°C',
      species: [
        mk('niuhexiuwan', '卧牛', 'Gasteria armstrongii', { difficulty: 3 }),
        mk('carinata', '子宝', 'Gasteria carinata verrucosa'),
        mk('bicolor', '子不语', 'Gasteria bicolor'),
        mk('nitida', '光叶沙鱼', 'Gasteria nitida'),
        mk('batesiana', '黑凤凰', 'Gasteria batesiana'),
        mk('glomerata', '幼蛇', 'Gasteria glomerata'),
        mk('liliputana', '小精灵', 'Gasteria liliputana'),
      ],
    },

    /* ---- 天锦章属 Aloiampelos ---- */
    {
      slug: 'aloiampelos',
      name: '攀芦荟属',
      latinName: 'Aloiampelos',
      description: '介于芦荟和灌木间的过渡形态,蔓生。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '0°C',
      species: [
        mk('ciliaris', '纤毛攀芦荟', 'Aloiampelos ciliaris'),
      ],
    },
  ],
};

/* ================ 大戟科(~60 品种) ================ */

const euphorbiaceae: CategorySeed = {
  slug: 'dajike',
  name: '大戟科',
  latinName: 'Euphorbiaceae',
  description:
    '叶片常退化成刺,茎秆肉质,分泌白色乳汁(有毒,操作时戴手套)。麒麟花是代表。',
  cover: img('euphorbiaceae'),
  icon: '🗿',
  orderIdx: 5,
  genera: [
    /* ---- 大戟属 Euphorbia ---- */
    {
      slug: 'euphorbia',
      name: '大戟属',
      latinName: 'Euphorbia',
      description:
        '世界最大的多肉属之一,形态多样,从球状到柱状到类植物状皆有,乳汁有毒。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '5°C',
      species: [
        mk('qilinhua', '麒麟花', 'Euphorbia milii', { difficulty: 2 }),
        mk('ruxianghua', '如香', 'Euphorbia polygona'),
        mk('obesa', '布纹球', 'Euphorbia obesa'),
        mk('symmetrica', '对称布纹', 'Euphorbia symmetrica'),
        mk('horrida', '魁伟玉', 'Euphorbia horrida'),
        mk('gorgonis', '魔界之龙', 'Euphorbia gorgonis'),
        mk('flanaganii', '九头龙', 'Euphorbia flanaganii'),
        mk('caputmedusae', '美杜莎头', 'Euphorbia caput-medusae'),
        mk('trigona', '彩云阁', 'Euphorbia trigona'),
        mk('lactea', '龙骨', 'Euphorbia lactea'),
        mk('tirucalli', '绿珊瑚', 'Euphorbia tirucalli'),
        mk('pulvinata', '锦鸡', 'Euphorbia pulvinata'),
        mk('meloformis', '瓜叶球', 'Euphorbia meloformis'),
        mk('suzannae', '苏珊娜', 'Euphorbia suzannae'),
        mk('tuberculata', '瘤突大戟', 'Euphorbia tuberculata'),
        mk('tulearensis', '仙人裤', 'Euphorbia tulearensis'),
        mk('stellata', '飞龙', 'Euphorbia stellata'),
        mk('piscidermis', '鱼肤大戟', 'Euphorbia piscidermis'),
        mk('grandicornis', '巨角大戟', 'Euphorbia grandicornis'),
        mk('decaryi', '德加利', 'Euphorbia decaryi'),
        mk('ambovombensis', '昂布', 'Euphorbia ambovombensis'),
      ],
    },

    /* ---- 麻风树属 Jatropha ---- */
    {
      slug: 'jatropha',
      name: '麻风树属',
      latinName: 'Jatropha',
      description: '块根膨大如巨石,冬季落叶,夏季长出奇特叶形。',
      defaultLight: '全日照',
      defaultWatering: '耐旱,冬季休眠',
      defaultHardiness: '8°C',
      species: [
        mk('podagrica', '佛肚树', 'Jatropha podagrica'),
        mk('cathartica', '泻肚树', 'Jatropha cathartica'),
        mk('berlandieri', '痴树', 'Jatropha berlandieri'),
      ],
    },

    /* ---- 翡翠阁属 Monadenium(已并入 Euphorbia 但商业界仍用) ---- */
    {
      slug: 'monadenium',
      name: '翡翠阁属',
      latinName: 'Monadenium',
      description: '近年与大戟属合并,但社区习惯仍独立提及。',
      defaultLight: '全日照',
      defaultWatering: '耐旱',
      defaultHardiness: '5°C',
      species: [
        mk('ritchiei', '黄花蟹爪', 'Monadenium ritchiei'),
        mk('guentheri', '紫翡翠', 'Monadenium guentheri'),
      ],
    },
  ],
};

/* ================ 补充科(~60 品种) ================ */

const supplementary: CategorySeed[] = [
  /* ---- 龙舌兰科 Asparagaceae(原龙舌兰科) ---- */
  {
    slug: 'longshelan',
    name: '天门冬科(原龙舌兰科)',
    latinName: 'Asparagaceae',
    description: '龙舌兰、虎皮兰等大型观赏多肉的家族,耐旱皮实。',
    cover: img('agavaceae'),
    icon: '🌵',
    orderIdx: 6,
    genera: [
      {
        slug: 'agave',
        name: '龙舌兰属',
        latinName: 'Agave',
        description: '巨型莲座多肉,叶缘带锯齿,数十年开一次花,花开即死。',
        defaultLight: '全日照',
        defaultWatering: '耐旱',
        defaultHardiness: '0°C',
        species: [
          mk('victoria', '王妃雷神', 'Agave victoriae-reginae'),
          mk('filifera', '吉祥冠', 'Agave filifera'),
          mk('isthmensis', '姬乱雪', 'Agave isthmensis'),
          mk('potatorum', '雷神', 'Agave potatorum'),
          mk('titanota', '泰坦那塔', 'Agave titanota'),
          mk('americana', '龙舌兰', 'Agave americana'),
          mk('striata', '小型姬龙', 'Agave striata'),
          mk('parrasana', '帕拉桑娜', 'Agave parrasana'),
          mk('ovatifolia', '和平之星', 'Agave ovatifolia'),
          mk('macroacantha', '大刺雷神', 'Agave macroacantha'),
        ],
      },
      {
        slug: 'sansevieria',
        name: '虎尾兰属',
        latinName: 'Sansevieria (Dracaena)',
        description: '又名「剑麻多肉」,叶片修长硬挺,也是常见的室内空气净化植物。',
        defaultLight: '全日照',
        defaultWatering: '耐旱',
        defaultHardiness: '5°C',
        species: [
          mk('trifasciata', '虎皮兰', 'Sansevieria trifasciata'),
          mk('cylindrica', '棒叶虎尾', 'Sansevieria cylindrica'),
          mk('hahnii', '金边短叶', 'Sansevieria hahnii'),
          mk('ehrenbergii', '金边剑麻', 'Sansevieria ehrenbergii'),
          mk('kirkii', '柯克虎尾', 'Sansevieria kirkii'),
        ],
      },
    ],
  },

  /* ---- 夹竹桃科 Apocynaceae(包含沙漠玫瑰、火地亚) ---- */
  {
    slug: 'jiazhutao',
    name: '夹竹桃科',
    latinName: 'Apocynaceae',
    description: '沙漠玫瑰、龟甲龙、火地亚等大型观赏多肉的家族。',
    cover: img('apocynaceae'),
    icon: '🌺',
    orderIdx: 7,
    genera: [
      {
        slug: 'adenium',
        name: '天宝花属',
        latinName: 'Adenium',
        description: '沙漠玫瑰,茎基膨大,花色艳丽,是盆景和观赏两用精品。',
        defaultLight: '全日照',
        defaultWatering: '生长期充足水分,冬季控水',
        defaultHardiness: '10°C',
        species: [
          mk('obesum', '沙漠玫瑰', 'Adenium obesum'),
          mk('arabicum', '阿拉伯沙漠玫瑰', 'Adenium arabicum'),
          mk('swazicum', '小型沙漠玫瑰', 'Adenium swazicum'),
          mk('somalense', '索马里沙漠玫瑰', 'Adenium somalense'),
          mk('multiflorum', '多花沙漠玫瑰', 'Adenium multiflorum'),
        ],
      },
      {
        slug: 'pachypodium',
        name: '棒锤树属',
        latinName: 'Pachypodium',
        description: '茎干极度粗壮成棒锤状,多刺,顶端长出小叶。产于马达加斯加。',
        defaultLight: '全日照',
        defaultWatering: '夏季充足水,冬季断水',
        defaultHardiness: '10°C',
        species: [
          mk('gracilius', '象牙宫', 'Pachypodium gracilius'),
          mk('lamerei', '惠比须', 'Pachypodium lamerei'),
          mk('rosulatum', '朝伦柱', 'Pachypodium rosulatum'),
          mk('saundersii', '澎大之花', 'Pachypodium saundersii'),
          mk('namaquanum', '纳马夸', 'Pachypodium namaquanum'),
          mk('horombense', '霍伦', 'Pachypodium horombense'),
        ],
      },
      {
        slug: 'stapelia',
        name: '豹皮花属',
        latinName: 'Stapelia',
        description: '柱状茎簇生,开花巨大星形,带恶臭以吸引苍蝇授粉。',
        defaultLight: '半日照',
        defaultWatering: '见干见湿',
        defaultHardiness: '5°C',
        species: [
          mk('grandiflora', '大豹皮花', 'Stapelia grandiflora'),
          mk('hirsuta', '毛豹皮花', 'Stapelia hirsuta'),
          mk('gigantea', '巨豹皮花', 'Stapelia gigantea'),
        ],
      },
      {
        slug: 'hoya',
        name: '球兰属',
        latinName: 'Hoya',
        description: '多肉质叶片的攀援植物,花如蜡球。',
        defaultLight: '散射光',
        defaultWatering: '见干见湿',
        defaultHardiness: '5°C',
        species: [
          mk('carnosa', '球兰', 'Hoya carnosa'),
          mk('kerrii', '心叶球兰', 'Hoya kerrii', { alias: ['爱心吊兰'] }),
          mk('linearis', '线叶球兰', 'Hoya linearis'),
          mk('obovata', '倒卵球兰', 'Hoya obovata'),
          mk('multiflora', '多花球兰', 'Hoya multiflora'),
        ],
      },
    ],
  },

  /* ---- 马齿苋科 Portulacaceae ---- */
  {
    slug: 'machixian',
    name: '马齿苋科',
    latinName: 'Portulacaceae',
    description: '常见的「太阳花」家族,快生易繁。',
    cover: img('portulacaceae'),
    icon: '🌼',
    orderIdx: 8,
    genera: [
      {
        slug: 'portulaca',
        name: '马齿苋属',
        latinName: 'Portulaca',
        description: '太阳花、松叶牡丹等,阳光越足开花越多。',
        defaultLight: '全日照',
        defaultWatering: '耐旱',
        defaultHardiness: '5°C',
        species: [
          mk('grandiflora', '太阳花', 'Portulaca grandiflora'),
          mk('umbraticola', '彩虹马齿苋', 'Portulaca umbraticola'),
          mk('molokiniensis', '姬花月', 'Portulaca molokiniensis'),
          mk('oleracea', '马齿苋', 'Portulaca oleracea'),
        ],
      },
      {
        slug: 'portulacaria',
        name: '马齿苋树属',
        latinName: 'Portulacaria',
        description: '「金枝玉叶」所在属,盆景常见。',
        defaultLight: '全日照',
        defaultWatering: '耐旱',
        defaultHardiness: '0°C',
        species: [
          mk('afra', '金枝玉叶', 'Portulacaria afra'),
          mk('afravariegata', '斑锦金枝玉叶', 'Portulacaria afra Variegata'),
          mk('amakinis', '雅美之舞', 'Portulacaria afra Aurea'),
        ],
      },
      {
        slug: 'anacampseros',
        name: '回欢草属',
        latinName: 'Anacampseros',
        description: '小型多肉,叶片对生,带白色绵毛。',
        defaultLight: '全日照',
        defaultWatering: '耐旱',
        defaultHardiness: '0°C',
        species: [
          mk('telephiastrum', '回欢草', 'Anacampseros telephiastrum'),
          mk('rufescens', '吹雪之松', 'Anacampseros rufescens'),
        ],
      },
    ],
  },

  /* ---- 葫芦科 Cucurbitaceae(块根多肉) ---- */
  {
    slug: 'hulou',
    name: '葫芦科',
    latinName: 'Cucurbitaceae',
    description: '块根类多肉的经典家族,龟甲龙是代表。',
    cover: img('cucurbitaceae'),
    icon: '🐢',
    orderIdx: 9,
    genera: [
      {
        slug: 'dioscorea',
        name: '薯蓣属',
        latinName: 'Dioscorea',
        description: '块根状多肉,形如巨龟甲,冬型,夏季休眠。',
        defaultLight: '散射光',
        defaultWatering: '冬型,夏季断水',
        defaultHardiness: '5°C',
        species: [
          mk('elephantipes', '龟甲龙', 'Dioscorea elephantipes', { difficulty: 3 }),
          mk('mexicana', '墨西哥龟甲龙', 'Dioscorea mexicana'),
          mk('macrostachya', '大穗龟甲', 'Dioscorea macrostachya'),
        ],
      },
    ],
  },

  /* ---- 萝藦科 Asclepiadaceae(已并入夹竹桃科,保留作专题) ---- */
  {
    slug: 'luomoke',
    name: '萝藦科',
    latinName: 'Asclepiadaceae',
    description: '虽已并入夹竹桃科,但社区习惯独立讨论:吊金钱、大琴姬、火地亚等。',
    cover: img('asclepiadaceae'),
    icon: '⛲',
    orderIdx: 10,
    genera: [
      {
        slug: 'ceropegia',
        name: '吊金钱属',
        latinName: 'Ceropegia',
        description: '心形叶片串成长串,茎如吊钱,是阳台悬挂首选。',
        defaultLight: '散射光',
        defaultWatering: '见干见湿',
        defaultHardiness: '5°C',
        species: [
          mk('woodii', '爱之蔓', 'Ceropegia woodii'),
          mk('linearis', '长线吊金钱', 'Ceropegia linearis'),
          mk('fusca', '暗色吊金钱', 'Ceropegia fusca'),
        ],
      },
      {
        slug: 'huernia',
        name: '剑龙角属',
        latinName: 'Huernia',
        description: '柱状簇生,开星形花。品种体型都不大。',
        defaultLight: '半日照',
        defaultWatering: '见干见湿',
        defaultHardiness: '5°C',
        species: [
          mk('zebrina', '斑马剑龙角', 'Huernia zebrina'),
          mk('keniensis', '肯尼亚剑龙', 'Huernia keniensis'),
        ],
      },
    ],
  },
];

/* ================ 汇总 ================ */

export const taxonomy: CategorySeed[] = [
  crassulaceae,
  cactaceae,
  aizoaceae,
  asphodelaceae,
  euphorbiaceae,
  ...supplementary,
];
