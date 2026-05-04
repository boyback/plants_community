import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import type { BannerItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const list = await prisma.banner.findMany({
    where: { enabled: true },
    orderBy: { orderIdx: 'asc' },
  });
  const items: BannerItem[] = list.map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    image: b.image,
    link: b.link,
    tint: b.tint,
  }));
  return items;
});
