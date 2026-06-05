import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import type { BannerItem } from '@/lib/types';
import { getHomeBannerImage, getHomeBannerTitle } from '@/lib/home-banners';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const list = await prisma.banner.findMany({
    where: { enabled: true },
    orderBy: { orderIdx: 'asc' },
  });
  const items: BannerItem[] = list.map((b, index) => ({
    id: b.id,
    title: getHomeBannerTitle(index, b.title),
    image: getHomeBannerImage(index, b.image),
    link: b.link,
    tint: b.tint,
  }));
  return items;
});
