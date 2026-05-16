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
  Journal as DBJournal,
  JournalEntry as DBJournalEntry,
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
  JournalInfo,
  JournalEntry,
  JournalStage,
  JournalEndReason,
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
  permissionOverrides?: { permission: string; effect: 'grant' | 'revoke' }[];
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
    role: u.role as 'user' | 'moderator' | 'admin',
    isSuperAdmin: u.isSuperAdmin ?? false,
    grantedPermissions: (u.permissionOverrides ?? [])
      .filter((p) => p.effect === 'grant')
      .map((p) => p.permission),
    revokedPermissions: (u.permissionOverrides ?? [])
      .filter((p) => p.effect === 'revoke')
      .map((p) => p.permission),
  };
}

// ------------ Board(旧结构,用作兜底) ------------

type BoardWithCount = DBBoard & { _count?: { posts?: number } };

export function serializeLegacyBoard(b: BoardWithCount): Board {
  return {
    id: b.id,
    level: 'category',
    slug: b.slug,
    name: b.name,
    description: b.description,
    cover: b.cover,
    icon: b.icon,
    members: b.members,
    posts: b._count?.posts ?? 0,
    path: [{ level: 'category', slug: b.slug, name: b.name }],
  };
}

// ------------ Category / Genus / Species ------------

import type {
  Genus as DBGenus,
  Species as DBSpecies,
} from '@prisma/client';

type BoardWithCount = DBBoard & {
  _count?: { posts?: number; genera?: number };
  genera?: (DBGenus & { _count?: { posts?: number; species?: number } })[];
};
type GenusWithRelations = DBGenus & {
  board?: DBBoard;
  _count?: { posts?: number; species?: number };
};
type SpeciesWithRelations = DBSpecies & {
  genus?: DBGenus & { board?: DBBoard };
  _count?: { posts?: number };
};

export function serializeCategory(c: BoardWithCount): Board & { genera?: any[] } {
  return {
    id: c.id,
    level: 'category',
    slug: c.slug,
    name: c.name,
    latinName: c.latinName ?? undefined,
    description: c.description,
    cover: c.cover,
    icon: parseJsonArray(c.icons)?.[0] ?? c.icon ?? '🌿',
    icons: parseJsonArray(c.icons),
    members: c.members,
    posts: c._count?.posts ?? 0,
    path: [{ level: 'category', slug: c.slug, name: c.name }],
    childrenCount: c._count?.genera ?? 0,
    genera: c.genera?.map((g) => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      latinName: g.latinName ?? null,
      _count: {
        posts: g._count?.posts ?? 0,
        species: g._count?.species ?? 0,
      },
    })),
  };
}

export function serializeGenus(g: GenusWithRelations): Board {
  const cat = g.board;
  const path = cat
    ? [
        { level: 'category' as const, slug: cat.slug, name: cat.name },
        { level: 'genus' as const, slug: g.slug, name: g.name },
      ]
    : [{ level: 'genus' as const, slug: g.slug, name: g.name }];
  return {
    id: g.id,
    level: 'genus',
    slug: g.slug,
    name: g.name,
    description: g.description,
    cover: g.cover ?? cat?.cover ?? '',
    icon: (cat ? parseJsonArray(cat.icons)?.[0] : null) ?? '🌿',
    members: 0,
    posts: g._count?.posts ?? 0,
    path,
    childrenCount: g._count?.species ?? 0,
  };
}

export function serializeSpecies(s: SpeciesWithRelations): Board {
  const g = s.genus;
  const cat = g?.board;
  const path = [] as { level: 'category' | 'genus' | 'species'; slug: string; name: string }[];
  if (cat) path.push({ level: 'category', slug: cat.slug, name: cat.name });
  if (g) path.push({ level: 'genus', slug: g.slug, name: g.name });
  path.push({ level: 'species', slug: s.slug, name: s.name });
  return {
    id: s.id,
    level: 'species',
    slug: s.slug,
    name: s.name,
    description: s.description,
    cover: s.cover,
    icon: (cat ? parseJsonArray(cat.icons)?.[0] : null) ?? '🌱',
    members: 0,
    posts: s._count?.posts ?? 0,
    path,
  };
}

/** 把完整的 Species 序列化为带全部图鉴字段的对象(/board/科/属/品种 详情页用) */
export function serializeSpeciesFull(s: SpeciesWithRelations) {
  const base = serializeSpecies(s);
  const g = s.genus;
  const cat = g?.board;
  return {
    ...base,
    level: 'species' as const,
    latinName: s.latinName,
    alias: parseJsonArray(s.alias),
    gallery: parseJsonArray(s.gallery),
    difficulty: s.difficulty,
    light: s.light,
    watering: s.watering,
    hardiness: s.hardiness,
    tips: parseJsonArray(s.tips),
    blooming: s.blooming ?? undefined,
    originRegion: s.originRegion ?? undefined,
    growthType: s.growthType ?? undefined,
    categorySlug: cat?.slug ?? '',
    genusSlug: g?.slug ?? '',
  };
}

/**
 * 帖子的 board 字段兼容函数:
 *   优先 species → 其次 genus → 其次 category → 最后 legacy board
 * 返回统一的 Board 对象。
 */
export function serializePostBoard(p: {
  species?: SpeciesWithRelations | null;
  genus?: GenusWithRelations | null;
  board?: BoardWithCount | null;
}): Board {
  if (p.species) return serializeSpecies(p.species);
  if (p.genus) return serializeGenus(p.genus);
  if (p.board) return serializeCategory(p.board);
  // 兜底:一个空板块,不应该发生
  return {
    id: '',
    level: 'category',
    slug: 'unknown',
    name: '未分类',
    description: '',
    cover: '',
    icon: '🌱',
    members: 0,
    posts: 0,
    path: [{ level: 'category', slug: 'unknown', name: '未分类' }],
  };
}

// 为向后兼容,保留 serializeBoard 别名
export const serializeBoard = serializeLegacyBoard;

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
  // 三级板块关系(新)
  board?: BoardWithCount | null;
  genus?: GenusWithRelations | null;
  species?: SpeciesWithRelations | null;
  vote?:
    | (DBVote & { options: DBVoteOption[] })
    | null;
  event?: (DBEvent & { _count?: { attendees?: number } }) | null;
  journal?:
    | (DBJournal & {
        species?: { id: string; slug: string; name: string } | null;
        entries?: DBJournalEntry[];
        _count?: { entries?: number };
      })
    | null;
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
    contentJson: parseRichJson(p.contentJson),
    contentText: p.contentText ?? undefined,
    images: parseJsonArray(p.images),
    videoUrl: p.videoUrl ?? undefined,
    cover: p.cover ?? undefined,
    author: serializeUser(p.author),
    board: serializePostBoard({
      species: p.species,
      genus: p.genus,
      board: p.board,
    }),
    tags: parseJsonArray(p.tags),
    createdAt: p.createdAt.toISOString(),
    likes: p._count?.likes ?? 0,
    comments: p._count?.comments ?? 0,
    shares: p.shares,
    views: p.views,
    pinned: p.pinned ?? false,
    locked: p.locked ?? false,
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
    species: p.species
      ? {
          id: p.species.id,
          slug: p.species.slug,
          name: p.species.name,
          avgDifficulty:
            p.species.ratingCount > 0
              ? p.species.ratingSum / p.species.ratingCount
              : p.species.difficulty,
          ratingCount: p.species.ratingCount,
        }
      : undefined,
    journal: p.journal ? serializeJournal(p.journal) : undefined,
    commentList: p.comments
      ? p.comments.map((c) => serializeComment(c))
      : undefined,
  };
}

function serializeJournalEntry(e: DBJournalEntry): JournalEntry {
  return {
    id: e.id,
    entryDate: e.entryDate.toISOString(),
    stage: e.stage as JournalStage,
    note: e.note,
    images: parseJsonArray(e.images),
    orderIdx: e.orderIdx,
    createdAt: e.createdAt.toISOString(),
  };
}

function serializeJournal(
  j: DBJournal & {
    species?: { id: string; slug: string; name: string } | null;
    entries?: DBJournalEntry[];
    _count?: { entries?: number };
  }
): JournalInfo {
  const now = j.endDate ?? new Date();
  const ms = now.getTime() - j.startDate.getTime();
  const daysSinceStart = Math.max(0, Math.floor(ms / 86400_000));
  return {
    subjectName: j.subjectName,
    startDate: j.startDate.toISOString(),
    endDate: j.endDate ? j.endDate.toISOString() : undefined,
    endReason: j.endReason as JournalEndReason,
    entriesCount:
      j._count?.entries ?? (j.entries ? j.entries.length : 0),
    daysSinceStart,
    entries: j.entries
      ? [...j.entries]
          .sort(
            (a, b) =>
              a.entryDate.getTime() - b.entryDate.getTime() ||
              a.orderIdx - b.orderIdx
          )
          .map(serializeJournalEntry)
      : undefined,
    speciesId: j.species?.id,
    speciesName: j.species?.name,
    speciesSlug: j.species?.slug,
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
    contentJson: parseRichJson(c.contentJson),
    contentText: c.contentText ?? undefined,
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

// ============================================================
// 交易 / 积分 / 任务 / 皮肤 / 会员
// ============================================================

import type {
  Product as DBProduct,
  Order as DBOrder,
  Payment as DBPayment,
  SkinItem as DBSkinItem,
  UserSkin as DBUserSkin,
  Task as DBTask,
  TaskProgress as DBTaskProgress,
  ActivityReward as DBActivityReward,
} from '@prisma/client';

import type {
  Product,
  Order,
  Payment,
  SkinItem,
  UserSkinItem,
  TaskItem,
  ActivityRewardItem,
  EquipState,
} from './types';

type ProductWithRelations = DBProduct & {
  seller?: UserWithRelations | null;
  _count?: { orders?: number };
};

export function serializeProduct(p: ProductWithRelations): Product {
  return {
    id: p.id,
    source: p.source as Product['source'],
    title: p.title,
    cover: p.cover,
    images: parseJsonArray(p.images),
    description: p.description,
    descriptionJson: parseRichJson(p.descriptionJson),
    descriptionText: p.descriptionText ?? undefined,
    category: p.board,
    price: p.price,
    originalPrice: p.originalPrice ?? undefined,
    stock: p.stock,
    pointsBack: p.pointsBack,
    status: p.status as Product['status'],
    seller: p.seller ? serializeUser(p.seller) : undefined,
    shipFrom: p.shipFrom ?? undefined,
    tags: parseJsonArray(p.tags),
    createdAt: p.createdAt.toISOString(),
    ordersCount: p._count?.orders ?? 0,
  };
}

type OrderWithRelations = DBOrder & {
  product?: ProductWithRelations | null;
  auction?: { id: string; title: string; cover: string } | null;
  buyer: UserWithRelations;
  seller?: UserWithRelations | null;
};

export function serializeOrder(o: OrderWithRelations): Order {
  return {
    id: o.id,
    orderNo: o.orderNo,
    source: o.source as Order['source'],
    product: o.product ? serializeProduct(o.product) : undefined,
    auctionId: o.auctionId ?? undefined,
    auctionTitle: o.auction?.title,
    auctionCover: o.auction?.cover,
    buyer: serializeUser(o.buyer),
    seller: o.seller ? serializeUser(o.seller) : undefined,
    quantity: o.quantity,
    unitPrice: o.unitPrice,
    totalPrice: o.totalPrice,
    depositPaid: o.depositPaid,
    pointsBackTotal: o.pointsBackTotal,
    status: o.status as Order['status'],
    shipName: o.shipName ?? undefined,
    shipPhone: o.shipPhone ?? undefined,
    shipAddress: o.shipAddress ?? undefined,
    trackingNo: o.trackingNo ?? undefined,
    shippedAt: o.shippedAt?.toISOString(),
    receivedAt: o.receivedAt?.toISOString(),
    reviewRating: o.reviewRating ?? undefined,
    reviewText: o.reviewText ?? undefined,
    reviewTextJson: parseRichJson(o.reviewTextJson),
    reviewTextPlain: o.reviewTextPlain ?? undefined,
    reviewedAt: o.reviewedAt?.toISOString(),
    cancelledAt: o.cancelledAt?.toISOString(),
    refundReason: o.refundReason ?? undefined,
    refundedAt: o.refundedAt?.toISOString(),
    createdAt: o.createdAt.toISOString(),
  };
}

export function serializePayment(p: DBPayment): Payment {
  return {
    id: p.id,
    payNo: p.payNo,
    bizType: p.bizType as Payment['bizType'],
    bizId: p.bizId,
    channel: p.channel as Payment['channel'],
    amount: p.amount,
    qrcode: p.qrcode ?? undefined,
    status: p.status as Payment['status'],
    expireAt: p.expireAt.toISOString(),
    paidAt: p.paidAt?.toISOString(),
    createdAt: p.createdAt.toISOString(),
  };
}

export function serializeSkin(s: DBSkinItem): SkinItem {
  return {
    id: s.id,
    slug: s.slug,
    kind: s.kind as SkinItem['kind'],
    name: s.name,
    preview: s.preview,
    description: s.description,
    pricePoints: s.pricePoints,
    vipOnly: s.vipOnly,
    rarity: s.rarity as SkinItem['rarity'],
    meta: s.meta ? safeJson(s.meta) : null,
  };
}

export function serializeUserSkin(
  us: DBUserSkin & { skin: DBSkinItem }
): UserSkinItem {
  return {
    ...serializeSkin(us.skin),
    obtainedFrom: us.obtainedFrom,
    obtainedAt: us.obtainedAt.toISOString(),
  };
}

export function serializeEquip(map: {
  bubble?: DBSkinItem | null;
  reaction?: DBSkinItem | null;
  sticker?: DBSkinItem | null;
  pendant?: DBSkinItem | null;
}): EquipState {
  return {
    bubble: map.bubble ? serializeSkin(map.bubble) : null,
    reaction: map.reaction ? serializeSkin(map.reaction) : null,
    sticker: map.sticker ? serializeSkin(map.sticker) : null,
    pendant: map.pendant ? serializeSkin(map.pendant) : null,
  };
}

export function serializeTask(
  t: DBTask & { progress?: DBTaskProgress[] }
): TaskItem {
  const tp = t.progress?.[0];
  return {
    id: t.id,
    slug: t.slug,
    kind: t.kind as TaskItem['kind'],
    title: t.title,
    description: t.description,
    icon: t.icon,
    rewardPoints: t.rewardPoints,
    rewardExp: t.rewardExp,
    rewardActivity: t.rewardActivity,
    target: t.target,
    progress: tp?.progress ?? 0,
    completed: tp?.completed ?? false,
    claimed: tp?.claimed ?? false,
  };
}

export function serializeActivityReward(
  r: DBActivityReward & { reward?: DBSkinItem | null },
  claimedThisMonth = false
): ActivityRewardItem {
  return {
    id: r.id,
    threshold: r.threshold,
    title: r.title,
    description: r.description,
    rewardPoints: r.rewardPoints,
    rewardSkin: r.reward ? serializeSkin(r.reward) : null,
    claimedThisMonth,
  };
}

function safeJson(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** 解析数据库里的 ProseMirror JSON 字符串 */
function parseRichJson(s: string | null | undefined): unknown {
  if (!s) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

// ============================================================
// 收货地址 / 拍卖
// ============================================================

import type {
  Address as DBAddress,
  Auction as DBAuction,
  Bid as DBBid,
  AuctionParticipant as DBAuctionParticipant,
} from '@prisma/client';

import type { Address, Auction, AuctionDetail, Bid, AuctionParticipant } from './types';

export function serializeAddress(a: DBAddress): Address {
  return {
    id: a.id,
    name: a.name,
    phone: a.phone,
    province: a.province ?? undefined,
    city: a.city ?? undefined,
    district: a.district ?? undefined,
    detail: a.detail,
    zip: a.zip ?? undefined,
    tag: a.tag ?? undefined,
    isDefault: a.isDefault,
    createdAt: a.createdAt.toISOString(),
  };
}

type AuctionWithRelations = DBAuction & {
  seller: UserWithRelations;
  winner?: UserWithRelations | null;
  _count?: { participants?: number };
};

export function serializeAuction(a: AuctionWithRelations): Auction {
  return {
    id: a.id,
    seller: serializeUser(a.seller),
    title: a.title,
    cover: a.cover,
    images: parseJsonArray(a.images),
    description: a.description,
    descriptionJson: parseRichJson(a.descriptionJson),
    descriptionText: a.descriptionText ?? undefined,
    category: a.board,
    tags: parseJsonArray(a.tags),
    startPrice: a.startPrice,
    minIncrement: a.minIncrement,
    buyNowPrice: a.buyNowPrice ?? undefined,
    depositAmount: a.depositAmount,
    reservePrice: a.reservePrice ?? undefined,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    actualEndAt: a.actualEndAt?.toISOString(),
    antiSnipeMinutes: a.antiSnipeMinutes,
    status: a.status as Auction['status'],
    result: (a.result ?? undefined) as Auction['result'] | undefined,
    currentPrice: a.currentPrice,
    bidCount: a.bidCount,
    winner: a.winner ? serializeUser(a.winner) : undefined,
    winningOrderId: a.winningOrderId ?? undefined,
    createdAt: a.createdAt.toISOString(),
  };
}

type BidWithBidder = DBBid & { bidder: UserWithRelations };
export function serializeBid(b: BidWithBidder): Bid {
  return {
    id: b.id,
    bidder: serializeUser(b.bidder),
    amount: b.amount,
    createdAt: b.createdAt.toISOString(),
  };
}

type ParticipantWithUser = DBAuctionParticipant & { user: UserWithRelations };
export function serializeParticipant(p: ParticipantWithUser): AuctionParticipant {
  return {
    id: p.id,
    user: serializeUser(p.user),
    depositStatus: p.depositStatus as AuctionParticipant['depositStatus'],
    depositAmount: p.depositAmount,
    createdAt: p.createdAt.toISOString(),
  };
}

export function serializeAuctionDetail(
  a: AuctionWithRelations & {
    bids: BidWithBidder[];
    participants: ParticipantWithUser[];
  },
  meId?: string
): AuctionDetail {
  const my = meId ? a.participants.find((p) => p.userId === meId) : undefined;
  return {
    ...serializeAuction(a),
    bids: a.bids.map(serializeBid),
    participantsCount: a.participants.length,
    myParticipant: my ? serializeParticipant(my) : null,
  };
}
