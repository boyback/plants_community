// 数据库实体 → 前端类型 的映射
// 保证前端使用的 User / Post / Comment / ... 字段形状与原先 Mock 一致

import type {
  User as DBUser,
  Post as DBPost,
  Comment as DBComment,
  Board as DBBoard,
  Vote as DBVote,
  VoteOption as DBVoteOption,
  Event as DBEvent,
  Badge as DBBadge,
  UserBadge as DBUserBadge,
  Notification as DBNotification,
  Message as DBMessage,
  Plant as DBPlant,
} from '@prisma/client';

import type {
  User,
  Post,
  PostType,
  Comment,
  Board,
  Badge,
  Notification,
  Message,
  Conversation,
  PlantSpecies,
} from './types';
import { parseJsonArray } from './api';

// ------------ User ------------

type UserWithRelations = DBUser & {
  _count?: {
    posts?: number;
    followers?: number;
    following?: number;
  };
  badges?: (DBUserBadge & { badge: DBBadge })[];
};

export function serializeUser(u: UserWithRelations): User {
  return {
    id: u.id,
    name: u.name,
    avatar: u.avatar,
    bio: u.bio ?? undefined,
    level: u.level,
    posts: u._count?.posts ?? 0,
    followers: u._count?.followers ?? 0,
    following: u._count?.following ?? 0,
    joinedAt: u.joinedAt.toISOString(),
    badges: (u.badges ?? []).map((ub) => serializeBadge(ub.badge, ub.obtained)),
  };
}

// ------------ Board ------------

type BoardWithCount = DBBoard & { _count?: { posts?: number } };

export function serializeBoard(b: BoardWithCount): Board {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description,
    cover: b.cover,
    icon: b.icon,
    members: b.members,
    posts: b._count?.posts ?? 0,
  };
}

// ------------ Badge ------------

export function serializeBadge(b: DBBadge, obtained = false): Badge {
  return {
    id: b.id,
    name: b.name,
    icon: b.icon,
    description: b.description,
    obtained,
  };
}

// ------------ Post ------------

type PostWithRelations = DBPost & {
  author: UserWithRelations;
  board: BoardWithCount;
  vote?:
    | (DBVote & { options: DBVoteOption[] })
    | null;
  event?: (DBEvent & { _count?: { attendees?: number } }) | null;
  _count?: { comments?: number; likes?: number };
  comments?: (DBComment & {
    author: UserWithRelations;
    replies?: (DBComment & { author: UserWithRelations })[];
  })[];
};

export function serializePost(p: PostWithRelations): Post {
  return {
    id: p.id,
    type: p.type as PostType,
    title: p.title,
    content: p.content,
    images: parseJsonArray(p.images),
    videoUrl: p.videoUrl ?? undefined,
    cover: p.cover ?? undefined,
    author: serializeUser(p.author),
    board: serializeBoard(p.board),
    tags: parseJsonArray(p.tags),
    createdAt: p.createdAt.toISOString(),
    likes: p._count?.likes ?? 0,
    comments: p._count?.comments ?? 0,
    shares: p.shares,
    views: p.views,
    vote: p.vote
      ? {
          question: p.vote.question,
          options: p.vote.options
            .sort((a, b) => a.orderIdx - b.orderIdx)
            .map((o) => ({ id: o.id, label: o.label, votes: o.votes })),
          multi: p.vote.multi,
          deadline: p.vote.deadline.toISOString(),
        }
      : undefined,
    event: p.event
      ? {
          startAt: p.event.startAt.toISOString(),
          endAt: p.event.endAt.toISOString(),
          location: p.event.location,
          attendees: p.event._count?.attendees ?? 0,
        }
      : undefined,
    commentList: p.comments
      ? p.comments.map((c) => serializeComment(c))
      : undefined,
  };
}

// ------------ Comment ------------

type CommentWithAuthor = DBComment & {
  author: UserWithRelations;
  replies?: (DBComment & { author: UserWithRelations })[];
};

export function serializeComment(c: CommentWithAuthor): Comment {
  return {
    id: c.id,
    author: serializeUser(c.author),
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    likes: c.likes,
    replies: c.replies?.map((r) => serializeComment(r)),
  };
}

// ------------ Notification ------------

type NotificationWithFrom = DBNotification & { from: UserWithRelations | null };

export function serializeNotification(n: NotificationWithFrom): Notification {
  return {
    id: n.id,
    type: n.type as Notification['type'],
    fromUser: n.from ? serializeUser(n.from) : undefined,
    text: n.text,
    link: n.link ?? undefined,
    createdAt: n.createdAt.toISOString(),
    read: n.read,
  };
}

// ------------ Message ------------

export function serializeMessage(m: DBMessage, meId: string): Message {
  return {
    id: m.id,
    from: m.fromId === meId ? 'me' : 'other',
    text: m.text,
    at: m.createdAt.toISOString(),
  };
}

export interface ConversationSummary extends Conversation {}

// ------------ Plant ------------

export function serializePlant(p: DBPlant): PlantSpecies {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    latinName: p.latinName,
    family: p.family,
    cover: p.cover,
    difficulty: p.difficulty as PlantSpecies['difficulty'],
    light: p.light,
    watering: p.watering,
    hardiness: p.hardiness,
    description: p.description,
    tips: parseJsonArray(p.tips),
    gallery: parseJsonArray(p.gallery),
  };
}
