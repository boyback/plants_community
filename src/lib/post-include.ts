/** 帖子查询的公共 include。
 * @param withJournalEntries true 时下发完整事件列表(详情页用),否则下发前 5 条(feed 卡片预览用,前端负责截断)
 */
export function postInclude(opts?: { withJournalEntries?: boolean }) {
  const pinsOrderBy = [{ orderIdx: 'asc' as const }, { pinnedAt: 'desc' as const }];
  const journalEntriesInclude = opts?.withJournalEntries
    ? {
        entries: {
          orderBy: [{ entryDate: 'asc' as const }, { orderIdx: 'asc' as const }],
          include: { _count: { select: { likes: true, comments: true } } },
        },
        species: { select: { id: true, slug: true, name: true } },
      }
    : {
        // feed 卡片需要预览前 5 条事件;_count 给出总数判断是否需要蒙层
        entries: {
          orderBy: [{ entryDate: 'asc' as const }, { orderIdx: 'asc' as const }],
          take: 5,
          include: { _count: { select: { likes: true, comments: true } } },
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
    vote: { include: { options: true } },
    event: { include: { _count: { select: { attendees: true } } } },
    journal: { include: journalEntriesInclude },
    pins: { orderBy: pinsOrderBy },
    _count: { select: { comments: true, likes: true } },
  } as const;
}
