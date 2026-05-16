/** 帖子查询的公共 include。
 * @param withJournalEntries true 时下发完整事件列表(详情页用),否则下发前 3 条 + _count(feed 卡片预览用)
 */
export function postInclude(opts?: { withJournalEntries?: boolean }) {
  const journalEntriesInclude = opts?.withJournalEntries
    ? {
        entries: {
          orderBy: [{ entryDate: 'asc' as const }, { orderIdx: 'asc' as const }],
        },
        species: { select: { id: true, slug: true, name: true } },
      }
    : {
        // feed 卡片需要预览前 3 条事件;_count 给出总数判断是否需要蒙层
        entries: {
          orderBy: [{ entryDate: 'asc' as const }, { orderIdx: 'asc' as const }],
          take: 3,
        },
        species: { select: { id: true, slug: true, name: true } },
        _count: { select: { entries: true } },
      };
  return {
    author: {
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    },
    // 三级板块全部 include,serializePost 会按优先级选用
    board: { include: { _count: { select: { posts: true, genera: true } } } },
    genus: {
      include: {
        board: true,
        _count: { select: { posts: true, species: true } },
      },
    },
    species: {
      include: {
        genus: { include: { board: true } },
        _count: { select: { posts: true } },
      },
    },
    // 旧 board 字段继续 include 作为兜底
    board: { include: { _count: { select: { posts: true } } } },
    vote: { include: { options: true } },
    event: { include: { _count: { select: { attendees: true } } } },
    journal: { include: journalEntriesInclude },
    _count: { select: { comments: true, likes: true } },
  } as const;
}
