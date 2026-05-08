/**
 * Feed 推荐算法层 — 纯函数,好测试。
 *
 * 提供两组能力:
 *   1. computeHotScore(post, now) — 基于单帖的绝对热度分。定时任务刷 DB。
 *   2. personalize(score, post, userProfile) — 个性化微调(follow 加权等),query 时实时算。
 *
 * 输出用于按分排序。
 */

export interface HotInputs {
  likes: number;
  comments: number;
  collects: number;
  shares: number;
  views: number;
  createdAt: Date | string | number;
  /** 作者是否 VIP(可选,加权 1.1) */
  authorVip?: boolean;
  /** 是否有封面(可选,加权 1.05) */
  hasCover?: boolean;
}

/**
 * 算出绝对热度。
 * 公式(HN 变体):
 *   gravity = 1.6
 *   score = log(1 + interactions + epsilon) / (hoursSince + 2)^gravity
 *   × modifier(VIP/封面/新帖 boost)
 *
 * 最低返回 0。
 */
export function computeHotScore(input: HotInputs, now: Date = new Date()): number {
  const { likes, comments, collects, shares, views, createdAt } = input;
  const interactions =
    Math.max(0, likes) +
    Math.max(0, comments) * 2 +
    Math.max(0, collects) * 3 +
    Math.max(0, shares) * 0.5 +
    Math.max(0, views) * 0.05;
  const ts = new Date(createdAt).getTime();
  const hours = Math.max(0, (now.getTime() - ts) / 3_600_000);
  const gravity = 1.6;
  const base = Math.log10(1 + interactions + 1) / Math.pow(hours + 2, gravity);

  let modifier = 1;
  if (input.authorVip) modifier *= 1.1;
  if (input.hasCover) modifier *= 1.05;
  // 最新 24h 给 1.3x 新帖 boost
  if (hours < 24) modifier *= 1.3;

  return base * modifier;
}

export interface UserProfile {
  userId: string;
  /** 已关注的作者 id 集合 */
  followingSet: Set<string>;
  /** 最近浏览/点赞的 category 权重(Softmax 归一化) */
  categoryAffinity: Map<string, number>;
  /** 最近关注的板块 id(Category/Genus/Species 混合) */
  followedBoardIds: Set<string>;
}

export interface PostForRank {
  id: string;
  authorId: string;
  categoryId: string | null;
  genusId: string | null;
  speciesId: string | null;
  hotScore: number;
  createdAt: Date | string;
}

/**
 * 基于 userProfile 做个性化微调。
 *   - 关注的作者       +0.8(翻几倍)
 *   - 关注的板块       +0.4
 *   - categoryAffinity 按权重 ×(0.5 ~ 1.5)线性缩放
 *   - 最后 24h 内发布  已在 hotScore 里 boost
 *
 * 输出一个【相对分】:不是概率,仅用于同一查询的排序。
 */
export function personalize(
  post: PostForRank,
  user: UserProfile | null,
): number {
  const base = post.hotScore;
  if (!user) return base;

  let bonus = 0;
  if (user.followingSet.has(post.authorId)) bonus += 0.8;
  for (const boardId of [post.categoryId, post.genusId, post.speciesId]) {
    if (boardId && user.followedBoardIds.has(boardId)) {
      bonus += 0.4;
      break; // 只加一次,避免重复
    }
  }

  // category affinity 缩放(0.5 ~ 1.5):用户最近喜欢的类目,对应 post 得分放大
  let scale = 1;
  if (post.categoryId) {
    const aff = user.categoryAffinity.get(post.categoryId);
    if (typeof aff === 'number') {
      scale = 0.5 + aff; // aff 取值范围 0~1,Softmax 保证
    }
  }

  return base * scale + bonus;
}

/**
 * Softmax:把一组计数变成 [0, 1] 的权重(和为 1)。
 * 用于 categoryAffinity。
 */
export function softmax(counts: Map<string, number>): Map<string, number> {
  if (counts.size === 0) return counts;
  let max = -Infinity;
  for (const v of counts.values()) if (v > max) max = v;
  let sum = 0;
  const exp = new Map<string, number>();
  for (const [k, v] of counts) {
    const e = Math.exp(v - max);
    exp.set(k, e);
    sum += e;
  }
  const out = new Map<string, number>();
  for (const [k, e] of exp) out.set(k, e / sum);
  return out;
}
