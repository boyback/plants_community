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
  BoardFull,
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
import { parseSpeciesGallery } from './species-gallery';
import { STAGE_META } from './journal';

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
    pointsBalance: u.pointsBalance,
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
    privacy: {
      showFollowing: u.privacyShowFollowing,
      showFollowers: u.privacyShowFollowers,
    },
  };
}

// ------------ Board(旧结构,用作兜底) ------------

type BoardWithCount = DBBoard & {
  _count?: { posts?: number; genera?: number };
  genera?: GenusWithRelations[];
};

export function serializeLegacyBoard(b: BoardWithCount): Board {
  return {
    id: b.id,
    level: 'category',
    slug: b.slug,
    name: b.name,
    description: b.description,
    cover: b.cover,
    icon: parseJsonArray(b.icons)?.[0] ?? '🌿',
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

type GenusWithRelations = DBGenus & {
  board?: DBBoard | null;
  _count?: { posts?: number; species?: number };
  species?: (DBSpecies & { _count?: { posts?: number } })[];
};
type SpeciesWithRelations = DBSpecies & {
  genus?: (DBGenus & { board?: DBBoard | null }) | null;
  _count?: { posts?: number };
};

export function serializeCategory(c: BoardWithCount): BoardFull & { genera?: any[] } {
  return {
    id: c.id,
    level: 'category',
    slug: c.slug,
    name: c.name,
    latinName: c.latinName ?? undefined,
    description: c.description,
    cover: c.cover,
    kind: c.kind as 'family' | 'discussion' | 'market' | 'system',
    linkPath: (c as any).linkPath ?? null,
    icon: parseJsonArray(c.icons)?.[0] ?? '🌿',
    members: c.members,
    posts: c._count?.posts ?? 0,
    path: [{ level: 'category', slug: c.slug, name: c.name }],
    childrenCount: c._count?.genera ?? 0,
    genera: c.genera?.map((g) => ({
      id: g.id,
      level: 'genus',
      slug: g.slug,
      name: g.name,
      latinName: g.latinName ?? null,
      description: g.description,
      cover: g.cover ?? c.cover,
      icon: parseJsonArray(c.icons)?.[0] ?? '🌿',
      members: 0,
      posts: g._count?.posts ?? 0,
      path: [
        { level: 'category' as const, slug: c.slug, name: c.name },
        { level: 'genus' as const, slug: g.slug, name: g.name },
      ],
      childrenCount: g._count?.species ?? 0,
      _count: {
        posts: g._count?.posts ?? 0,
        species: g._count?.species ?? 0,
      },
      species: g.species?.map((s) => ({
        id: s.id,
        level: 'species',
        slug: s.slug,
        name: s.name,
        latinName: s.latinName ?? null,
        description: s.description,
        cover: s.cover ?? g.cover ?? c.cover,
        icon: parseJsonArray(c.icons)?.[0] ?? '🌿',
        members: 0,
        posts: s._count?.posts ?? 0,
        path: [
          { level: 'category' as const, slug: c.slug, name: c.name },
          { level: 'genus' as const, slug: g.slug, name: g.name },
          { level: 'species' as const, slug: s.slug, name: s.name },
        ],
        _count: { posts: s._count?.posts ?? 0 },
      })),
    }) as any),
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
  const galleryData = parseSpeciesGallery(s.gallery);
  return {
    ...base,
    level: 'species' as const,
    latinName: s.latinName,
    alias: parseJsonArray(s.alias),
    gallery: galleryData.items.map((item) => item.url),
    galleryItems: galleryData.items,
    coverPosition: galleryData.coverPosition,
    difficulty: s.difficulty,
    light: s.light,
    watering: s.watering,
    hardiness: s.hardiness,
    tips: parseJsonArray(s.tips),
    blooming: s.blooming ?? undefined,
    originRegion: s.originRegion ?? undefined,
    growthType: s.growthType ?? undefined,
    growthSpeed: s.growthSpeed ?? undefined,
    summerDormancy: s.summerDormancy ?? undefined,
    lightRequirement: s.lightRequirement ?? undefined,
    idealTemperature: s.idealTemperature ?? undefined,
    minTemperature: s.minTemperature ?? undefined,
    maxTemperature: s.maxTemperature ?? undefined,
    humidity: s.humidity ?? undefined,
    soil: s.soil ?? undefined,
    riskTips: parseJsonArray(s.riskTips),
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
  // 当前用户是否已投票
  userVoted?: boolean;
  userVotedOptionIds?: string[];
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPost = any;

type PostViewer = {
  id: string;
  role?: 'user' | 'moderator' | 'admin' | null;
  isSuperAdmin?: boolean | null;
  moderatorScopes?: { type: 'board' | 'genus' | 'species'; targetId: string }[] | null;
} | null | undefined;

const EDITABLE_POST_TYPES = new Set(['rich', 'image', 'short', 'video', 'vote', 'event', 'journal', 'help']);

function moderatorCanManagePost(
  p: { boardId?: string | null; genusId?: string | null; speciesId?: string | null },
  viewer: NonNullable<PostViewer>
) {
  if (viewer.role !== 'moderator') return false;
  const scopes = Array.isArray(viewer.moderatorScopes) ? viewer.moderatorScopes : [];
  return scopes.some((scope) => {
    if (scope.type === 'board') return Boolean(p.boardId && scope.targetId === p.boardId);
    if (scope.type === 'genus') return Boolean(p.genusId && scope.targetId === p.genusId);
    return Boolean(p.speciesId && scope.targetId === p.speciesId);
  });
}

export function getPostAdminPermissions(
  p: {
    authorId?: string | null;
    author?: { id?: string | null } | null;
    type?: string;
    boardId?: string | null;
    genusId?: string | null;
    speciesId?: string | null;
  },
  viewer?: PostViewer
) {
  if (!viewer) {
    return {
      canManage: false,
      canEdit: false,
      canDelete: false,
      canMove: false,
      canPin: false,
      canLock: false,
      canBan: false,
      canReview: false,
    };
  }

  const authorId = p.authorId ?? p.author?.id ?? null;
  const isAuthor = Boolean(authorId && viewer.id === authorId);
  const isSuperAdmin = viewer.isSuperAdmin === true;
  const isModerator = moderatorCanManagePost(p, viewer);
  const isAdmin = viewer.role === 'admin';
  const canEdit = isAuthor && EDITABLE_POST_TYPES.has(String(p.type));
  const canDelete = isAuthor || isModerator || isAdmin || isSuperAdmin;
  const canMove = isModerator || isAdmin || isSuperAdmin;
  const canPin = isModerator || isAdmin || isSuperAdmin;
  const canLock = isModerator || isAdmin || isSuperAdmin;
  const canBan = isSuperAdmin && !isAuthor;
  const canReview = isSuperAdmin;
  return {
    canManage: canEdit || canDelete || canMove || canPin || canLock || canBan || canReview,
    canEdit,
    canDelete,
    canMove,
    canPin,
    canLock,
    canBan,
    canReview,
  };
}

export function serializePost(p: AnyPost, userVoted?: boolean, userVotedOptionIds?: string[], viewer?: PostViewer): Post {
  const adminPermissions = getPostAdminPermissions(p, viewer);
  const pins = Array.isArray(p.pins)
    ? p.pins.map((pin: any) => ({
        id: pin.id,
        scope: pin.scope,
        targetId: pin.targetId ?? '',
        orderIdx: pin.orderIdx ?? 0,
        pinnedAt: pin.pinnedAt?.toISOString?.() ?? String(pin.pinnedAt),
        pinnedBy: pin.pinnedBy ?? null,
      }))
    : [];
  const pinState = {
    any: pins.length > 0,
    global: pins.some((pin: any) => pin.scope === 'global'),
    board: pins.some((pin: any) => ['board', 'genus', 'species'].includes(pin.scope)),
    topic: pins.some((pin: any) => pin.scope === 'topic'),
  };
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
    updatedAt: p.updatedAt?.toISOString(),
    likes: p._count?.likes ?? 0,
    comments: p._count?.comments ?? 0,
    shares: p.shares,
    views: p.views,
    pins,
    pinState,
    locked: p.locked ?? false,
    adminPermissions,
    vote: p.vote
      ? {
          question: p.vote.question,
          options: p.vote.options
            .sort((a: { orderIdx: number }, b: { orderIdx: number }) => a.orderIdx - b.orderIdx)
            .map((o: { id: string; label: string; votes: number }) => ({ id: o.id, label: o.label, votes: o.votes })),
          multi: p.vote.multi,
          deadline: p.vote.deadline.toISOString(),
          voted: p.userVoted ?? userVoted ?? false,
          votedOptionIds: p.userVotedOptionIds ?? userVotedOptionIds ?? [],
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
          cover: p.species.cover,
          avgDifficulty:
            p.species.ratingCount > 0
              ? p.species.ratingSum / p.species.ratingCount
              : p.species.difficulty,
          ratingCount: p.species.ratingCount,
        }
      : undefined,
    journal: p.journal ? serializeJournal(p.journal) : undefined,
    commentList: p.comments
      ? p.comments.map((c: any) => serializeComment(c))
      : undefined,
  };
}

function serializeJournalEntry(e: DBJournalEntry & { _count?: { likes?: number; comments?: number }; liked?: boolean }): JournalEntry {
  return {
    id: e.id,
    entryDate: e.entryDate.toISOString(),
    stage: e.stage as JournalStage,
    stageLabel: e.stageLabel ?? undefined,
    note: e.note,
    images: parseJsonArray(e.images),
    orderIdx: e.orderIdx,
    createdAt: e.createdAt.toISOString(),
    likes: e._count?.likes ?? 0,
    comments: e._count?.comments ?? 0,
    liked: Boolean(e.liked),
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
  journalEntry?: (DBJournalEntry & { _count?: { likes?: number; comments?: number } }) | null;
  replies?: CommentWithAuthor[];
};

export function serializeComment(c: CommentWithAuthor): Comment {
  const refStage = c.journalEntry
    ? c.journalEntry.stage === 'other'
      ? c.journalEntry.stageLabel || STAGE_META.other.zh
      : STAGE_META[c.journalEntry.stage as JournalStage]?.zh ?? c.journalEntry.stage
    : '';
  const refImages = c.journalEntry ? parseJsonArray(c.journalEntry.images) : [];

  return {
    id: c.id,
    parentId: c.parentId,
    author: serializeUser(c.author),
    content: c.content,
    contentJson: parseRichJson(c.contentJson),
    contentText: c.contentText ?? undefined,
    createdAt: c.createdAt.toISOString(),
    likes: c.likes,
    journalEntryRef: c.journalEntry
      ? {
          id: c.journalEntry.id,
          dateLabel: c.journalEntry.entryDate.toISOString().slice(0, 10),
          stageLabel: refStage,
          note: c.journalEntry.note || undefined,
          image: refImages[0],
        }
      : undefined,
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
  const galleryData = parseSpeciesGallery(p.gallery);
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
    gallery: galleryData.items.map((item) => item.url),
  };
}

// ============================================================
// 交易 / 积分 / 任务 / 皮肤 / 会员
// ============================================================

import type {
  Product as DBProduct,
  MarketListing as DBMarketListing,
  MarketListingItem as DBMarketListingItem,
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
    category: p.category,
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
  listing?: Pick<DBMarketListing, 'id' | 'title' | 'cover' | 'tradeMode'> | null;
  listingItem?: Pick<DBMarketListingItem, 'id' | 'listingId' | 'title' | 'cover' | 'price'> | null;
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
    listing: o.listing
      ? {
          id: o.listing.id,
          title: o.listing.title,
          cover: o.listing.cover,
          tradeMode: o.listing.tradeMode as NonNullable<Order['tradeMode']>,
        }
      : undefined,
    listingItem: o.listingItem
      ? {
          id: o.listingItem.id,
          listingId: o.listingItem.listingId,
          title: o.listingItem.title,
          cover: o.listingItem.cover,
          price: o.listingItem.price,
        }
      : undefined,
    tradeMode: o.tradeMode as Order['tradeMode'],
    auctionId: o.auctionId ?? undefined,
    auctionTitle: o.auction?.title,
    auctionCover: o.auction?.cover,
    buyer: serializeUser(o.buyer),
    seller: o.seller ? serializeUser(o.seller) : undefined,
    quantity: o.quantity,
    unitPrice: o.unitPrice,
    totalPrice: o.totalPrice,
    platformFee: o.platformFee,
    sellerAmount: o.sellerAmount,
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
    category: a.category,
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
