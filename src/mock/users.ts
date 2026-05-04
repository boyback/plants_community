import type { User, Badge } from '@/lib/types';

const badgePool: Badge[] = [
  { id: 'b1', name: '新苗', icon: '🌱', description: '加入社区', obtained: true },
  { id: 'b2', name: '达人', icon: '🌿', description: '发布 10 篇帖子', obtained: true },
  { id: 'b3', name: '园艺师', icon: '🪴', description: '发布 100 篇帖子', obtained: true },
  { id: 'b4', name: '摄影家', icon: '📷', description: '累计上传 50 张图', obtained: true },
  { id: 'b5', name: '小太阳', icon: '☀️', description: '连续签到 30 天', obtained: true },
  { id: 'b6', name: '夜行者', icon: '🌙', description: '凌晨发帖 x 10', obtained: false },
  { id: 'b7', name: '评论家', icon: '💬', description: '发表 200 条评论', obtained: true },
  { id: 'b8', name: '收藏家', icon: '⭐', description: '收藏 100 个帖子', obtained: false },
  { id: 'b9', name: '老司机', icon: '🚜', description: '注册满 1 年', obtained: true },
  { id: 'b10', name: '花仙子', icon: '🌸', description: '开花帖 x 20', obtained: false },
  { id: 'b11', name: 'EVENT 先锋', icon: '🎉', description: '参与 5 次活动', obtained: false },
  { id: 'b12', name: '投票王', icon: '🗳️', description: '发起 10 次投票', obtained: false },
];

function mkUser(id: string, name: string, avatar: string, bio: string, lv: number): User {
  return {
    id,
    name,
    avatar,
    bio,
    level: lv,
    followers: 100 + parseInt(id.slice(1)) * 37,
    following: 20 + parseInt(id.slice(1)) * 5,
    posts: 8 + parseInt(id.slice(1)) * 3,
    badges: badgePool,
    joinedAt: '2023-03-15T08:00:00Z',
  };
}

export const users: User[] = [
  mkUser('u1', '多肉阿绿', 'https://i.pravatar.cc/150?img=47', '三年肉龄,坐标华北阳台党,喜欢景天和生石花。', 7),
  mkUser('u2', '月光玉露', 'https://i.pravatar.cc/150?img=32', '玉露控,照片都是手机拍的,随便看看。', 5),
  mkUser('u3', '沙漠老王', 'https://i.pravatar.cc/150?img=12', '十年老玩家,仙人球和大戟科都玩。', 9),
  mkUser('u4', '露娜酱', 'https://i.pravatar.cc/150?img=5', '萌新一枚,求带!', 2),
  mkUser('u5', '花园里的熊', 'https://i.pravatar.cc/150?img=68', '全日照派,专治徒长。', 6),
  mkUser('u6', '清风徐来', 'https://i.pravatar.cc/150?img=15', '爱拍照,不爱养,哈哈。', 4),
  mkUser('u7', '番杏女王', 'https://i.pravatar.cc/150?img=44', '研究番杏科十年,主攻生石花。', 8),
  mkUser('u8', '南方小院', 'https://i.pravatar.cc/150?img=23', '广州,夏天挣扎户。', 3),
];

// 当前登录用户(Mock)—— 默认未登录,登录后设置为 users[0]
export const currentUserSeed: User = users[0];
