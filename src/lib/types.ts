export type PostType = 'rich' | 'short' | 'vote' | 'video' | 'event' | 'help';

export interface User {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  level: number;
  followers: number;
  following: number;
  posts: number;
  badges: Badge[];
  joinedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string; // emoji
  description: string;
  obtained: boolean;
}

/**
 * 通用「板块节点」:可能是 Category(一级 科)/ Genus(二级 属)/ Species(三级 品种)。
 * 前端大部分场景(帖子卡片、面包屑、侧栏)对三个层级的显示需求一致,用统一接口表示。
 */
export type BoardLevel = 'category' | 'genus' | 'species';

export interface Board {
  id: string;
  level: BoardLevel;
  slug: string;        // 最后一级的 slug
  name: string;
  description: string;
  cover: string;
  icon: string;        // emoji 或简单标识(只有 category 有)
  members: number;
  posts: number;
  // 完整路径(所有层级的 slug + name,便于面包屑)
  path: BoardPathSegment[];
  // 仅当 level !== 'species' 时有子节点展示
  childrenCount?: number;
}

export interface BoardPathSegment {
  level: BoardLevel;
  slug: string;
  name: string;
}

/**
 * 下列三个接口只在需要细节时用;通用 Board 就已足够用于多数场景。
 */
export interface CategoryKind {
  family: 'family';
  discussion: 'discussion';
  market: 'market';
}

export interface CategoryFull extends Board {
  level: 'category';
  latinName?: string;
  kind: 'family' | 'discussion' | 'market';
  genera?: Board[];
}

export interface GenusFull extends Board {
  level: 'genus';
  latinName?: string;
  categorySlug: string;
  species?: Board[];
}

export interface SpeciesFull extends Board {
  level: 'species';
  latinName: string;
  alias: string[];
  gallery: string[];
  difficulty: number;
  light: string;
  watering: string;
  hardiness: string;
  tips: string[];
  blooming?: string;
  originRegion?: string;
  growthType?: string;
  categorySlug: string;
  genusSlug: string;
}

export interface Comment {
  id: string;
  author: User;
  /** sanitized HTML(渲染缓存) */
  content: string;
  /** ProseMirror JSON(权威源,可选) */
  contentJson?: unknown;
  /** 纯文本预览(可选) */
  contentText?: string;
  createdAt: string;
  likes: number;
  replies?: Comment[];
}

export interface VoteOption {
  id: string;
  label: string;
  votes: number;
}

export interface Post {
  id: string;
  type: PostType;
  title: string;
  /** sanitized HTML(渲染缓存) */
  content: string;
  /** ProseMirror JSON(权威源,仅 rich/event 类型有) */
  contentJson?: unknown;
  /** 纯文本摘要(列表 / SEO / 通知用) */
  contentText?: string;
  images?: string[];
  videoUrl?: string;
  cover?: string;
  author: User;
  board: Board;
  tags: string[];
  createdAt: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  // 投票贴
  vote?: {
    question: string;
    options: VoteOption[];
    multi: boolean;
    deadline: string;
  };
  // EVENT 贴
  event?: {
    startAt: string;
    endAt: string;
    location: string;
    attendees: number;
  };
  commentList?: Comment[];
}

export interface PlantSpecies {
  id: string;
  slug: string;
  name: string;
  latinName: string;
  family: string; // 科属
  cover: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  light: string;
  watering: string;
  hardiness: string; // 耐寒度
  description: string;
  tips: string[];
  gallery: string[];
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'system' | 'mention';
  fromUser?: User;
  text: string;
  link?: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  user: User;
  lastMessage: string;
  lastAt: string;
  unread: number;
  messages: Message[];
}

export interface Message {
  id: string;
  from: 'me' | 'other';
  text: string;
  at: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  tint: string; // tailwind color class for overlay
  /** 这张图停留毫秒数,0 = 用全站默认(3000ms) */
  durationMs?: number;
}

// ============================================================
// 交易 / 积分 / 任务 / 皮肤 / 会员
// ============================================================

export type ProductSource = 'official' | 'c2c';
export type ProductStatus = 'on_sale' | 'sold_out' | 'off_shelf' | 'pending_review';

export interface Product {
  id: string;
  source: ProductSource;
  title: string;
  cover: string;
  images: string[];
  description: string;
  descriptionJson?: unknown;
  descriptionText?: string;
  category: string;
  price: number;          // 分
  originalPrice?: number;
  stock: number;
  pointsBack: number;
  status: ProductStatus;
  seller?: User;
  shipFrom?: string;
  tags: string[];
  createdAt: string;
  ordersCount?: number;
}

export type OrderStatus =
  | 'pending_payment'
  | 'pending_ship'
  | 'pending_receipt'
  | 'pending_review'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type OrderSource = 'product' | 'auction';

export interface Order {
  id: string;
  orderNo: string;
  source: OrderSource;
  product?: Product;        // 拍卖订单可能没有 product
  auctionId?: string;
  auctionTitle?: string;
  auctionCover?: string;
  buyer: User;
  seller?: User;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  depositPaid: number;       // 已抵扣保证金
  pointsBackTotal: number;
  status: OrderStatus;
  shipName?: string;
  shipPhone?: string;
  shipAddress?: string;
  trackingNo?: string;
  shippedAt?: string;
  receivedAt?: string;
  reviewRating?: number;
  reviewText?: string;
  reviewTextJson?: unknown;
  reviewTextPlain?: string;
  reviewedAt?: string;
  cancelledAt?: string;
  refundReason?: string;
  refundedAt?: string;
  createdAt: string;
}

export type PaymentChannel = 'wechat' | 'alipay' | 'points';
export type PaymentStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'refunded';
export type PaymentBizType = 'order' | 'vip';

export interface Payment {
  id: string;
  payNo: string;
  bizType: PaymentBizType;
  bizId: string;
  channel: PaymentChannel;
  amount: number;
  qrcode?: string;
  status: PaymentStatus;
  expireAt: string;
  paidAt?: string;
  createdAt: string;
  /** 瞬时字段,不落库:true 表示最近被远端标记为"已扫码,等待付款" */
  scanning?: boolean;
}

export interface PointsLedgerItem {
  id: string;
  type: string;
  delta: number;
  balance: number;
  refType?: string;
  refId?: string;
  remark?: string;
  createdAt: string;
}

export type SkinKind = 'bubble' | 'reaction' | 'sticker' | 'pendant';

export interface SkinItem {
  id: string;
  slug: string;
  kind: SkinKind;
  name: string;
  preview: string;
  description: string;
  pricePoints: number;
  vipOnly: boolean;
  rarity: 'normal' | 'rare' | 'epic' | 'legendary';
  meta?: Record<string, unknown> | null;
}

export interface UserSkinItem extends SkinItem {
  obtainedFrom: string;
  obtainedAt: string;
}

export interface EquipState {
  bubble?: SkinItem | null;
  reaction?: SkinItem | null;
  sticker?: SkinItem | null;
  pendant?: SkinItem | null;
}

export type TaskKind = 'daily' | 'monthly' | 'achievement';

export interface TaskItem {
  id: string;
  slug: string;
  kind: TaskKind;
  title: string;
  description: string;
  icon: string;
  rewardPoints: number;
  rewardExp: number;
  rewardActivity: number;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface ActivityRewardItem {
  id: string;
  threshold: number;
  title: string;
  description: string;
  rewardPoints: number;
  rewardSkin?: SkinItem | null;
  claimedThisMonth: boolean;
}

export interface MonthlyRankRow {
  rank: number;
  user: User;
  score: number;
}

export type VipPlanKey = 'monthly' | 'quarterly' | 'yearly' | 'lifetime' | 'monthly_points';

export interface VipPlanInfo {
  key: VipPlanKey;
  title: string;
  subtitle: string;
  amount: number;       // 分,积分卡为 0
  pointsCost: number;   // 积分卡所需积分
  durationDays: number; // 终身为 99999
  recommended?: boolean;
}

export interface UserVipState {
  isVip: boolean;
  lifetime: boolean;
  expireAt?: string | null;
  daysLeft?: number | null;
}

export interface UserExtended extends User {
  exp?: number;
  pointsBalance?: number;
  vip?: UserVipState;
  equip?: EquipState;
}

// ============================================================
// 收货地址 / 拍卖
// ============================================================

export interface Address {
  id: string;
  name: string;
  phone: string;
  province?: string;
  city?: string;
  district?: string;
  detail: string;
  zip?: string;
  tag?: string;
  isDefault: boolean;
  createdAt: string;
}

export type AuctionStatus = 'draft' | 'scheduled' | 'live' | 'finished' | 'cancelled';
export type AuctionResult = 'won' | 'paid' | 'no_bidder' | 'defaulted' | 'cancelled';
export type DepositStatus = 'pending' | 'held' | 'applied' | 'refunded' | 'forfeited';

export interface Auction {
  id: string;
  seller: User;
  title: string;
  cover: string;
  images: string[];
  description: string;
  descriptionJson?: unknown;
  descriptionText?: string;

  category: string;
  tags: string[];

  startPrice: number;
  minIncrement: number;
  buyNowPrice?: number;
  depositAmount: number;
  reservePrice?: number;

  startAt: string;
  endAt: string;
  actualEndAt?: string;
  antiSnipeMinutes: number;

  status: AuctionStatus;
  result?: AuctionResult;
  currentPrice: number;
  bidCount: number;

  winner?: User;
  winningOrderId?: string;

  createdAt: string;
}

export interface Bid {
  id: string;
  bidder: User;
  amount: number;
  createdAt: string;
}

export interface AuctionParticipant {
  id: string;
  user: User;
  depositStatus: DepositStatus;
  depositAmount: number;
  createdAt: string;
}

export interface AuctionDetail extends Auction {
  bids: Bid[];
  myParticipant?: AuctionParticipant | null;
  participantsCount: number;
}
