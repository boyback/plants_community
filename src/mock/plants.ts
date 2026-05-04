import type { PlantSpecies } from '@/lib/types';

export const plants: PlantSpecies[] = [
  {
    id: 'pl1',
    slug: 'longyue',
    name: '胧月',
    latinName: 'Graptopetalum paraguayense',
    family: '景天科 · 风车草属',
    cover: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000',
    difficulty: 1,
    light: '全日照',
    watering: '见干见湿,一周一次',
    hardiness: '-5°C',
    description:
      '胧月是入门级多肉的代表,非常皮实,耐旱耐寒,上色后叶片呈粉紫色,出状态极美。适合新手入坑。',
    tips: [
      '多晒少水,才能出状态',
      '夏季适度遮阳,避免正午暴晒',
      '叶插成功率极高,非常适合练手',
      '耐寒能力强,北方室内越冬没问题',
    ],
    gallery: [
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000',
      'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1000',
      'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000',
    ],
  },
  {
    id: 'pl2',
    slug: 'yulu',
    name: '玉露',
    latinName: 'Haworthia cooperi',
    family: '百合科 · 十二卷属',
    cover: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000',
    difficulty: 3,
    light: '散射光',
    watering: '表土干透再浇',
    hardiness: '0°C',
    description:
      '玉露叶片剔透如水晶,顶部有透明「窗」,能让阳光穿透进行光合作用。喜散射光,忌烈日。',
    tips: [
      '强光下叶片会变得不透明,失去水晶感',
      '夏天高温会休眠,减少浇水',
      '根系脆弱,建议透气配土',
      '繁殖多靠分株,叶插偶有成功',
    ],
    gallery: [
      'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000',
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000',
    ],
  },
  {
    id: 'pl3',
    slug: 'shengshihua',
    name: '生石花',
    latinName: 'Lithops',
    family: '番杏科 · 生石花属',
    cover: 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000',
    difficulty: 5,
    light: '充足光照',
    watering: '严格控水,夏季几乎断水',
    hardiness: '5°C',
    description:
      '生石花外形酷似石头,是多肉里最具话题性的品种之一。一年一蜕皮,老壳被新叶吸收。对水敏感,被誉为「劝退专用」。',
    tips: [
      '夏季高温休眠,必须断水避免黑腐',
      '蜕皮期间不要浇水,让其吸收老壳',
      '秋天是生长旺季,可适当水肥',
      '烈日下要遮阳,防止晒伤',
    ],
    gallery: [
      'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000',
    ],
  },
  {
    id: 'pl4',
    slug: 'hongzhiyu',
    name: '虹之玉',
    latinName: 'Sedum rubrotinctum',
    family: '景天科 · 景天属',
    cover: 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000',
    difficulty: 1,
    light: '全日照',
    watering: '耐旱,干透浇透',
    hardiness: '-3°C',
    description:
      '虹之玉小巧可爱,叶片糖果色,低温 + 强光下会转为橙红色,非常讨喜。新手友好型。',
    tips: [
      '温差越大,颜色越好看',
      '秋冬是最佳观赏期',
      '叶插成功率极高',
      '夏季闷热可能徒长,注意通风',
    ],
    gallery: [
      'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000',
    ],
  },
  {
    id: 'pl5',
    slug: 'jiwawa',
    name: '吉娃娃',
    latinName: 'Echeveria chihuahuaensis',
    family: '景天科 · 拟石莲属',
    cover: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000',
    difficulty: 3,
    light: '全日照',
    watering: '控水,避免叶心积水',
    hardiness: '-2°C',
    description:
      '吉娃娃叶片肥厚,叶尖粉红,出状态时像一朵盛开的莲花。是拟石莲属中的经典品种。',
    tips: [
      '浇水时避开叶心,否则易黑腐',
      '夏季适度遮阳并保持通风',
      '冬季强日照有助上色',
      '换盆可刺激新根生长',
    ],
    gallery: [
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000',
    ],
  },
  {
    id: 'pl6',
    slug: 'aierfeide',
    name: '艾伦费尔德',
    latinName: 'Turbinicarpus schmiedickeanus',
    family: '仙人掌科 · 陀螺球属',
    cover: 'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000',
    difficulty: 4,
    light: '全日照',
    watering: '严格控水',
    hardiness: '0°C',
    description:
      '陀螺球属的小型种,球体带钩刺,花开如烟火。生长缓慢,对水极度敏感,资深玩家最爱。',
    tips: [
      '严格颗粒土,否则易烂根',
      '花期通常在春季',
      '勿用深盆,浅盆更佳',
      '冬季完全断水休眠',
    ],
    gallery: [
      'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000',
    ],
  },
  {
    id: 'pl7',
    slug: 'heifashi',
    name: '黑法师',
    latinName: 'Aeonium arboreum',
    family: '景天科 · 莲花掌属',
    cover: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000',
    difficulty: 2,
    light: '全日照',
    watering: '冬季生长,夏季休眠',
    hardiness: '0°C',
    description:
      '黑法师是冬型种,夏季休眠时叶片会收拢包住茎干,冬天是疯狂生长季。叶片墨紫黑,极具戏剧感。',
    tips: [
      '冬天反而要勤浇水,夏天要少',
      '生长快速,可修剪塑形',
      '全日照才能黑得漂亮',
      '修剪下来的枝条可直接扦插',
    ],
    gallery: [
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000',
    ],
  },
  {
    id: 'pl8',
    slug: 'qilinhua',
    name: '麒麟花',
    latinName: 'Euphorbia milii',
    family: '大戟科 · 大戟属',
    cover: 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000',
    difficulty: 2,
    light: '全日照',
    watering: '耐旱,少水',
    hardiness: '5°C',
    description:
      '虽然叫「花」,实为多肉质灌木,茎布满硬刺,顶端苞片鲜艳,四季开花,非常皮实。汁液有毒,操作时戴手套。',
    tips: [
      '汁液有毒,避免接触皮肤和眼睛',
      '开花性极好,常年不断花',
      '耐修剪,可塑造造型',
      '不耐寒,北方需室内越冬',
    ],
    gallery: [
      'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000',
    ],
  },
];

export function getPlantBySlug(slug: string): PlantSpecies | undefined {
  return plants.find((p) => p.slug === slug);
}
