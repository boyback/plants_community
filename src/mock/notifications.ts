import type { Notification } from '@/lib/types';
import { users } from './users';

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 3600 * 1000).toISOString();
}

export const notifications: Notification[] = [
  {
    id: 'n1',
    type: 'like',
    fromUser: users[1],
    text: '赞了你的帖子《夏天来了,我的景天们终于度夏成功!》',
    link: '/post/p1',
    createdAt: hoursAgo(2),
    read: false,
  },
  {
    id: 'n2',
    type: 'comment',
    fromUser: users[2],
    text: '评论了你:「通风确实是王道,我仙人球也是一样。」',
    link: '/post/p1',
    createdAt: hoursAgo(5),
    read: false,
  },
  {
    id: 'n3',
    type: 'follow',
    fromUser: users[3],
    text: '关注了你',
    link: '/user/u4',
    createdAt: hoursAgo(10),
    read: false,
  },
  {
    id: 'n4',
    type: 'mention',
    fromUser: users[5],
    text: '在《今日份的阳台》中提到了你',
    link: '/post/p7',
    createdAt: hoursAgo(24),
    read: true,
  },
  {
    id: 'n5',
    type: 'system',
    text: '恭喜!你获得了新徽章「小太阳」—— 连续签到 30 天',
    link: '/user/u1',
    createdAt: hoursAgo(48),
    read: true,
  },
  {
    id: 'n6',
    type: 'like',
    fromUser: users[4],
    text: '赞了你的帖子《玉露叶片扦插的完整记录》',
    link: '/post/p6',
    createdAt: hoursAgo(60),
    read: true,
  },
  {
    id: 'n7',
    type: 'system',
    text: '你发起的投票「新手入坑多肉」已截止,点击查看最终结果',
    link: '/post/p3',
    createdAt: hoursAgo(72),
    read: true,
  },
];
