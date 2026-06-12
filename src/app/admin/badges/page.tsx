import { prisma } from '@/lib/db';
import { BadgeGrantClient } from './BadgeGrantClient';

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage() {
  const badges = await prisma.badge.findMany({
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { users: { where: { obtained: true } } } } }
  });
  const serialized = badges.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    icon: b.icon,
    description: b.description,
    obtainedCount: b._count.users
  }));
  const userTotal = await prisma.user.count();
  return <BadgeGrantClient badges={serialized} userTotal={userTotal} />;
}