import { prisma } from '@/lib/db';
import { BannerClient } from './BannerClient';

export const dynamic = 'force-dynamic';

export default async function AdminBannersPage() {
  const items = await prisma.banner.findMany({
    orderBy: [{ orderIdx: 'asc' }, { id: 'asc' }],
  });
  return <BannerClient initial={items} />;
}
