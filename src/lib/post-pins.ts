import type { Post, PostPinScope } from '@/lib/types';

export interface PinSortTarget {
  scope: PostPinScope;
  targetId: string;
}

export function sortPostsForPins<T extends Post>(posts: T[], targets: PinSortTarget[]): T[] {
  if (targets.length === 0) return posts;
  const targetKeys = new Set(targets.map((target) => pinKey(target.scope, target.targetId)));

  return [...posts].sort((a, b) => {
    const ap = bestPin(a, targetKeys);
    const bp = bestPin(b, targetKeys);
    if (ap && !bp) return -1;
    if (!ap && bp) return 1;
    if (ap && bp) {
      if (ap.orderIdx !== bp.orderIdx) return ap.orderIdx - bp.orderIdx;
      const at = new Date(ap.pinnedAt).getTime();
      const bt = new Date(bp.pinnedAt).getTime();
      if (at !== bt) return bt - at;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function bestPin(post: Post, targetKeys: Set<string>) {
  return (post.pins ?? [])
    .filter((pin) => targetKeys.has(pinKey(pin.scope, pin.targetId)))
    .sort((a, b) => {
      if (a.orderIdx !== b.orderIdx) return a.orderIdx - b.orderIdx;
      return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime();
    })[0];
}

function pinKey(scope: PostPinScope, targetId: string) {
  return `${scope}:${targetId}`;
}
