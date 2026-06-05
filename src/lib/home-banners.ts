export const HOME_BANNER_IMAGES = [
  'https://cdn.plantcommunity.cn/cmoz85oi8000ay601io2nm9iv/202606/mq1i4tjg0967l1.png',
  'https://cdn.plantcommunity.cn/cmoz85oi8000ay601io2nm9iv/202606/mq1i4tqhkoomj4.png',
  'https://cdn.plantcommunity.cn/cmoz85oi8000ay601io2nm9iv/202606/mq1i4tlekwnysu.png',
];

export const HOME_BANNER_TITLES = [
  '遇见多肉，遇见美好',
  '探索品种之美 · 分享养护经验 · 收藏成长时光',
  '发现生活的小确幸,记录植物成长的每一条',
];

export function getHomeBannerImage(index: number, fallback: string) {
  return HOME_BANNER_IMAGES[index] ?? fallback;
}

export function getHomeBannerTitle(index: number, fallback: string) {
  return HOME_BANNER_TITLES[index] ?? fallback;
}
