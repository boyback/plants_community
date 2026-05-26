import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://plantcommunity.cn';

const AUTH_TOKEN_KEY = 'rouyou.auth.token';
const AUTH_COOKIE_NAME_KEY = 'rouyou.auth.cookieName';
const REQUEST_TIMEOUT_MS = 15000;

type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error?: { message?: string }; message?: string };

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const authHeaders = await getAuthHeaders();
  const init = {
    credentials: 'include' as const,
    headers: { Accept: 'application/json', ...authHeaders },
  };
  const response = await fetchWithRetry(url, init);
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | T | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'ok' in payload && !payload.ok
        ? payload.error?.message ?? payload.message
        : undefined;
    throw new ApiError(message ?? `Request failed: ${response.status}`, response.status);
  }
  if (payload && typeof payload === 'object' && 'ok' in payload) {
    if (payload.ok) return payload.data;
    throw new ApiError(payload.error?.message ?? payload.message ?? 'Request failed', response.status);
  }
  return payload as T;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | T | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'ok' in payload && !payload.ok
        ? payload.error?.message ?? payload.message
        : undefined;
    throw new ApiError(message ?? `Request failed: ${response.status}`, response.status);
  }
  if (payload && typeof payload === 'object' && 'ok' in payload) {
    if (payload.ok) return payload.data;
    throw new ApiError(payload.error?.message ?? payload.message ?? 'Request failed', response.status);
  }
  return payload as T;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | T | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'ok' in payload && !payload.ok
        ? payload.error?.message ?? payload.message
        : undefined;
    throw new ApiError(message ?? `Request failed: ${response.status}`, response.status);
  }
  if (payload && typeof payload === 'object' && 'ok' in payload) {
    if (payload.ok) return payload.data;
    throw new ApiError(payload.error?.message ?? payload.message ?? 'Request failed', response.status);
  }
  return payload as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json', ...authHeaders },
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | T | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'ok' in payload && !payload.ok
        ? payload.error?.message ?? payload.message
        : undefined;
    throw new ApiError(message ?? `Request failed: ${response.status}`, response.status);
  }
  if (payload && typeof payload === 'object' && 'ok' in payload) {
    if (payload.ok) return payload.data;
    throw new ApiError(payload.error?.message ?? payload.message ?? 'Request failed', response.status);
  }
  return payload as T;
}

export async function apiUploadImage(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<UploadImageResponse> {
  const authHeaders = await getAuthHeaders();
  const formData = new FormData();
  formData.append(
    'file',
    {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob,
  );

  const response = await fetchWithTimeout(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...authHeaders,
    },
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<UploadImageResponse>
    | UploadImageResponse
    | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'ok' in payload && !payload.ok
        ? payload.error?.message ?? payload.message
        : undefined;
    throw new ApiError(message ?? `Upload failed: ${response.status}`, response.status);
  }
  if (payload && typeof payload === 'object' && 'ok' in payload) {
    if (payload.ok) return payload.data;
    throw new ApiError(payload.error?.message ?? payload.message ?? 'Upload failed', response.status);
  }
  return payload as UploadImageResponse;
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetchWithTimeout(url, init);
  } catch (err) {
    if (isNetworkError(err)) {
      await sleep(350);
      return fetchWithTimeout(url, init);
    }
    throw err;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('请求超时，请检查网络后重试', 0);
    }
    if (isNetworkError(err)) {
      throw new ApiError('网络连接失败，请稍后重试', 0);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function isNetworkError(err: unknown) {
  return err instanceof TypeError || (err instanceof ApiError && err.status === 0) || (err instanceof Error && err.name === 'AbortError');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  if (!token) return {};
  const cookieName = (await SecureStore.getItemAsync(AUTH_COOKIE_NAME_KEY)) || 'rouyou_token';
  return {
    Cookie: `${cookieName}=${token}`,
    Authorization: `Bearer ${token}`,
  };
}

export async function saveMobileAuth(auth: {
  cookieName: string;
  token: string;
}) {
  await SecureStore.setItemAsync(AUTH_COOKIE_NAME_KEY, auth.cookieName);
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, auth.token);
}

export async function clearMobileAuth() {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(AUTH_COOKIE_NAME_KEY);
}

export interface BoardSummary {
  id: string;
  slug: string;
  name: string;
  latinName?: string | null;
  description?: string | null;
  cover?: string | null;
  icon?: string;
  posts?: number;
  childrenCount?: number;
  genera?: BoardSummary[];
}

export interface MarketListingSummary {
  type: 'product' | 'auction';
  id: string;
  title: string;
  description?: string;
  cover: string;
  price: number;
  maxPrice?: number;
  itemCount?: number;
  shipFrom?: string | null;
  views?: number;
  comments?: number;
  createdAt: string;
  seller?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  products?: {
    id: string;
    title: string;
    description: string;
    price: number;
    stock: number;
    cover: string;
    images: string[];
  }[];
}

export interface MarketListingDetail {
  id: string;
  title: string;
  category?: string;
  shipFrom: string;
  tags: string[];
  description: string;
  tradeMode: 'platform_escrow' | 'online_payment' | 'external';
  tradeModes: Array<'platform_escrow' | 'online_payment' | 'external'>;
  externalUrl?: string;
  contactNote?: string;
  cover: string;
  minPrice: number;
  maxPrice: number;
  itemCount: number;
  viewCount: number;
  commentCount: number;
  status: string;
  createdAt: string;
  seller: {
    id: string;
    name: string;
    avatar?: string | null;
    level?: number;
  };
  taxons: {
    categorySlug?: string | null;
    genusSlug?: string | null;
    speciesSlug?: string | null;
    label: string;
  }[];
  items: {
    id: string;
    title: string;
    price: number;
    stock: number;
    soldCount: number;
    cover: string;
    images: string[];
    description: string;
    status: string;
  }[];
  comments: {
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      avatar?: string | null;
      level?: number;
    };
  }[];
}

export interface PostAuthorSummary {
  id: string;
  name: string;
  avatar?: string | null;
  level?: number;
}

export interface PostSummary {
  id: string;
  type: string;
  title: string;
  contentText?: string;
  cover?: string;
  images?: string[];
  createdAt: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  author?: PostAuthorSummary;
  board?: {
    name: string;
  };
  tags?: string[];
}

export interface CommentSummary {
  id: string;
  contentText?: string;
  content?: string;
  createdAt: string;
  likes?: number;
  author?: PostAuthorSummary;
}

export interface PostDetail extends PostSummary {
  content?: string;
  commentList?: CommentSummary[];
}

export type OrderStatus =
  | 'pending_payment'
  | 'pending_ship'
  | 'pending_receipt'
  | 'pending_review'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export interface OrderSummary {
  id: string;
  orderNo: string;
  source: 'product' | 'auction';
  listing?: {
    id: string;
    title: string;
    cover: string;
    tradeMode: MarketListingDetail['tradeMode'];
  };
  listingItem?: {
    id: string;
    listingId: string;
    title: string;
    cover: string;
    price: number;
  };
  product?: {
    id: string;
    title: string;
    cover: string;
    price: number;
  };
  auctionId?: string;
  auctionTitle?: string;
  auctionCover?: string;
  seller?: PostAuthorSummary;
  buyer: PostAuthorSummary;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  platformFee?: number;
  sellerAmount?: number;
  depositPaid?: number;
  pointsBackTotal?: number;
  status: OrderStatus;
  tradeMode?: MarketListingDetail['tradeMode'];
  shipName?: string;
  shipPhone?: string;
  shipAddress?: string;
  trackingNo?: string;
  shippedAt?: string;
  receivedAt?: string;
  reviewRating?: number;
  reviewTextPlain?: string;
  reviewedAt?: string;
  cancelledAt?: string;
  refundReason?: string;
  refundedAt?: string;
  createdAt: string;
}

export interface AddressSummary {
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

export interface PaymentSummary {
  id: string;
  payNo: string;
  bizType: 'order' | 'vip' | 'deposit' | 'auction_balance';
  bizId: string;
  channel: 'wechat' | 'alipay' | 'points';
  amount: number;
  qrcode?: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'refunded';
  expireAt: string;
  paidAt?: string;
  createdAt: string;
  scanning?: boolean;
}

export type AuctionStatus = 'draft' | 'scheduled' | 'live' | 'finished' | 'cancelled';
export type AuctionResult = 'won' | 'paid' | 'no_bidder' | 'defaulted' | 'cancelled';
export type DepositStatus = 'pending' | 'held' | 'applied' | 'refunded' | 'forfeited';

export interface AuctionSummary {
  id: string;
  seller: PostAuthorSummary;
  title: string;
  cover: string;
  images: string[];
  description: string;
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
  winner?: PostAuthorSummary;
  winningOrderId?: string;
  createdAt: string;
}

export interface AuctionDetail extends AuctionSummary {
  bids: {
    id: string;
    bidder: PostAuthorSummary;
    amount: number;
    createdAt: string;
  }[];
  myParticipant?: {
    id: string;
    user: PostAuthorSummary;
    depositStatus: DepositStatus;
    depositAmount: number;
    createdAt: string;
  } | null;
  participantsCount: number;
}

export interface CollectionSummary {
  posts: {
    collectedAt: string;
    post: PostSummary;
  }[];
  marketItems: {
    collectedAt: string;
    item: {
      id: string;
      listingId: string;
      title: string;
      price: number;
      stock: number;
      soldCount: number;
      cover: string;
      images: string[];
      description: string;
      status: string;
      listing: {
        id: string;
        title: string;
        shipFrom?: string | null;
        status: string;
      };
    };
  }[];
}

export interface NotificationSummary {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'system' | 'mention';
  fromUser?: PostAuthorSummary;
  text: string;
  link?: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationsResponse {
  items: NotificationSummary[];
  unread: number;
}

export interface PointsSummary {
  balance: number;
  earned: number;
  spent: number;
  exp: number;
  level: number;
}

export interface PointsLedgerItem {
  id: string;
  type: string;
  delta: number;
  balance: number;
  refType?: string | null;
  refId?: string | null;
  remark?: string | null;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  slug: string;
  kind: 'daily' | 'monthly' | 'achievement';
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

export interface TasksResponse {
  daily: TaskItem[];
  monthly: TaskItem[];
  achievement: TaskItem[];
}

export interface ActivitySummary {
  yearMonth: string;
  score: number;
  rank: number | null;
  totalParticipants: number;
}

export interface ActivityRewardsResponse {
  myScore: number;
  items: {
    id: string;
    threshold: number;
    title: string;
    description: string;
    rewardPoints: number;
    claimedThisMonth: boolean;
    reached: boolean;
    rewardSkin?: {
      id: string;
      name: string;
      preview: string;
    } | null;
  }[];
}

export interface LevelConfig {
  level: number;
  name: string;
  expRequired: number;
  permissions: string[];
  perks: string[];
}

export interface LevelsResponse {
  levels: LevelConfig[];
}

export interface SearchResponse {
  q: string;
  posts: {
    id: string;
    title: string;
    excerpt: string;
    cover?: string | null;
    createdAt: string;
    views: number;
    likes: number;
    comments: number;
    author: {
      id: string;
      name: string;
      handle?: string | null;
      avatar?: string | null;
    };
  }[];
  species: {
    id: string;
    name: string;
    latinName?: string | null;
    cover: string;
    url: string;
  }[];
  boards: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    cover?: string | null;
  }[];
  users: {
    id: string;
    name: string;
    handle?: string | null;
    avatar?: string | null;
    bio?: string | null;
    level: number;
    posts: number;
    followers: number;
  }[];
}

export interface HotSearchResponse {
  hot: {
    q: string;
    kind: 'species' | 'topic';
    count?: number;
  }[];
}

export type RankingKind = 'activity' | 'points' | 'posts' | 'comments' | 'level' | 'followers';

export interface RankingResponse {
  kind: RankingKind;
  yearMonth: string;
  title: string;
  desc: string;
  unit: string;
  items: {
    rank: number;
    score: number;
    user: {
      id: string;
      name: string;
      avatar?: string | null;
      level: number;
      pointsBalance: number;
      posts: number;
      comments: number;
      followers: number;
    };
  }[];
}

export interface UserProfileSummary {
  id: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  level: number;
  pointsBalance?: number;
  posts: number;
  followers: number;
  following: number;
  joinedAt: string;
  badges?: {
    id: string;
    name: string;
    icon: string;
    description: string;
    obtained: boolean;
  }[];
}

export interface UserProfileResponse {
  user: UserProfileSummary;
  isMe: boolean;
  followed: boolean;
  exp: number;
  vip: {
    isVip: boolean;
    lifetime: boolean;
    expireAt: string | null;
  };
  posts: PostSummary[];
}

export interface UserConnectionResponse {
  total: number;
  items: UserProfileSummary[];
}

export interface BoardDetailResponse {
  type: 'category' | 'genus' | 'species';
  path: { label: string; slug: string }[];
  detail: {
    id: string;
    slug: string;
    name: string;
    latinName?: string | null;
    alias?: string[];
    description?: string | null;
    cover?: string | null;
    gallery?: string[];
    difficulty?: number;
    light?: string;
    watering?: string;
    hardiness?: string;
    tips?: string[];
    blooming?: string | null;
    originRegion?: string | null;
    growthType?: string | null;
    ratingCount?: number;
    avgDifficulty?: number;
    posts?: number;
    generaCount?: number;
    speciesCount?: number;
    genus?: { id: string; slug: string; name: string; latinName?: string | null };
    category?: { id: string; slug: string; name: string };
  };
  children: {
    id: string;
    slug: string;
    name: string;
    latinName?: string | null;
    cover?: string | null;
    posts?: number;
    speciesCount?: number;
    path: string;
  }[];
  related: {
    id: string;
    slug: string;
    name: string;
    latinName?: string | null;
    cover?: string | null;
    posts?: number;
    path: string;
  }[];
  posts: PostSummary[];
}

export interface AuthMe {
  user: {
    id: string;
    name: string;
    avatar?: string | null;
    bio?: string | null;
    level: number;
    pointsBalance?: number;
    posts?: number;
    followers?: number;
    following?: number;
  } | null;
  signInStreak?: number;
  signedInToday?: boolean;
  todaySignedCount?: number;
  exp?: number;
  pointsBalance?: number;
  privacy?: {
    showFollowing: boolean;
    showFollowers: boolean;
  };
  vip?: {
    isVip: boolean;
    lifetime?: boolean;
    expireAt?: string | null;
  };
}

export interface MobileLoginResponse {
  user: AuthMe['user'];
  auth: {
    cookieName: string;
    token: string;
    maxAge: number;
  };
}

export interface UploadImageResponse {
  id: string;
  url: string;
  key: string;
  mime: string;
  size: number;
  originalMime?: string;
  converted?: boolean;
}

export function absoluteAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.toLowerCase().endsWith('.svg')) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
