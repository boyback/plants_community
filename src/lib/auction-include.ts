/** 拍卖查询的公共 include */
export function auctionInclude() {
  return {
    seller: {
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    },
    _count: { select: { participants: true, bids: true } },
  } as const;
}

export function auctionDetailInclude() {
  return {
    seller: {
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    },
    winner: {
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    },
    bids: {
      take: 50,
      orderBy: { createdAt: 'desc' as const },
      include: {
        bidder: {
          include: {
            _count: { select: { posts: true, followers: true, following: true } },
            badges: { include: { badge: true } },
          },
        },
      },
    },
    participants: {
      take: 200,
      include: {
        user: {
          include: {
            _count: { select: { posts: true, followers: true, following: true } },
            badges: { include: { badge: true } },
          },
        },
      },
    },
  } as const;
}
