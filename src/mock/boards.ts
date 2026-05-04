import type { Board } from '@/lib/types';

export const boards: Board[] = [
  {
    id: 'bd1',
    slug: 'jingtian',
    name: '景天科',
    description: '拟石莲、长生草、景天、风车等景天科大家族',
    cover: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=800',
    icon: '🌿',
    members: 12843,
    posts: 5624,
  },
  {
    id: 'bd2',
    slug: 'fanxing',
    name: '番杏科',
    description: '生石花、肉锥、碧光环,番杏圈集结地',
    cover: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800',
    icon: '🪨',
    members: 6421,
    posts: 2134,
  },
  {
    id: 'bd3',
    slug: 'baihe',
    name: '百合科',
    description: '十二卷、玉露、寿、软叶鲨鱼',
    cover: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
    icon: '💎',
    members: 8932,
    posts: 3412,
  },
  {
    id: 'bd4',
    slug: 'xianrenzhang',
    name: '仙人掌科',
    description: '球、柱、瑞凤玉、牡丹、乌羽玉',
    cover: 'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=800',
    icon: '🌵',
    members: 7812,
    posts: 2987,
  },
  {
    id: 'bd5',
    slug: 'dajike',
    name: '大戟科',
    description: '麒麟、铁甲丸、布纹球',
    cover: 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=800',
    icon: '🗿',
    members: 3421,
    posts: 1245,
  },
  {
    id: 'bd6',
    slug: 'yangzhi',
    name: '养殖交流',
    description: '浇水、配土、光照,经验分享和求助',
    cover: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800',
    icon: '💧',
    members: 21034,
    posts: 9823,
  },
  {
    id: 'bd7',
    slug: 'jiaoyi',
    name: '交易市场',
    description: '出肉、收肉、拼团,请文明交易',
    cover: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800',
    icon: '💰',
    members: 15623,
    posts: 6341,
  },
  {
    id: 'bd8',
    slug: 'xinshou',
    name: '新手村',
    description: '萌新报道、小白问答,老手带带新人',
    cover: 'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=800',
    icon: '🌱',
    members: 32145,
    posts: 12843,
  },
];

export function getBoardBySlug(slug: string): Board | undefined {
  return boards.find((b) => b.slug === slug);
}

export function getBoardById(id: string): Board | undefined {
  return boards.find((b) => b.id === id);
}
