/** 商品查询的公共 include */
export function productInclude() {
  return {
    seller: {
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    },
    _count: { select: { orders: true } },
  } as const;
}
