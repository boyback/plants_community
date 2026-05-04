import type { Conversation } from '@/lib/types';
import { users } from './users';

function minsAgo(n: number) {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

export const conversations: Conversation[] = [
  {
    id: 'cv1',
    user: users[1],
    lastMessage: '好的,那我明天发你。',
    lastAt: minsAgo(5),
    unread: 2,
    messages: [
      { id: 'm1', from: 'other', text: '你好!请问你那边还有多头胧月吗?', at: minsAgo(60) },
      { id: 'm2', from: 'me', text: '有的,还剩 3 棵。', at: minsAgo(55) },
      { id: 'm3', from: 'other', text: '那能包邮到上海吗?', at: minsAgo(20) },
      { id: 'm4', from: 'me', text: '包邮可以,80 一棵,三棵优惠到 220。', at: minsAgo(15) },
      { id: 'm5', from: 'other', text: '成交!', at: minsAgo(10) },
      { id: 'm6', from: 'other', text: '好的,那我明天发你。', at: minsAgo(5) },
    ],
  },
  {
    id: 'cv2',
    user: users[2],
    lastMessage: '配土比例我一会发你。',
    lastAt: minsAgo(60),
    unread: 0,
    messages: [
      { id: 'm1', from: 'other', text: '王哥,请教一下仙人球配土?', at: minsAgo(120) },
      { id: 'm2', from: 'me', text: '配土比例我一会发你。', at: minsAgo(60) },
    ],
  },
  {
    id: 'cv3',
    user: users[4],
    lastMessage: '周末一起去花市呗?',
    lastAt: minsAgo(180),
    unread: 1,
    messages: [
      { id: 'm1', from: 'other', text: '在吗?', at: minsAgo(200) },
      { id: 'm2', from: 'other', text: '周末一起去花市呗?', at: minsAgo(180) },
    ],
  },
  {
    id: 'cv4',
    user: users[6],
    lastMessage: '你那篇度夏帖子太有用了,已收藏!',
    lastAt: minsAgo(1200),
    unread: 0,
    messages: [
      {
        id: 'm1',
        from: 'other',
        text: '你那篇度夏帖子太有用了,已收藏!',
        at: minsAgo(1200),
      },
    ],
  },
];
