/** 帖子查询的公共 include,方便在多个 Route Handler 与 Server Component 复用 */
export function postInclude() {
  return {
    author: {
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    },
    board: { include: { _count: { select: { posts: true } } } },
    vote: { include: { options: true } },
    event: { include: { _count: { select: { attendees: true } } } },
    _count: { select: { comments: true, likes: true } },
  } as const;
}
