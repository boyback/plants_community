import { prisma } from '@/lib/db';
import { AnnouncementClient } from './AnnouncementClient';

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const items = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
  // Date 必须序列化
  const serialized = items.map((a) => ({
    ...a,
    startAt: a.startAt?.toISOString() ?? null,
    endAt: a.endAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString()
  }));
  return <AnnouncementClient initial={serialized} />;
}