/** 帖子查询的公共 include */
export function postInclude() {
  return {
    author: {
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    },
    // 三级板块全部 include,serializePost 会按优先级选用
    category: { include: { _count: { select: { posts: true, genera: true } } } },
    genus: {
      include: {
        category: true,
        _count: { select: { posts: true, species: true } },
      },
    },
    species: {
      include: {
        genus: { include: { category: true } },
        _count: { select: { posts: true } },
      },
    },
    // 旧 board 字段继续 include 作为兜底
    board: { include: { _count: { select: { posts: true } } } },
    vote: { include: { options: true } },
    event: { include: { _count: { select: { attendees: true } } } },
    _count: { select: { comments: true, likes: true } },
  } as const;
}
