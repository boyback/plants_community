import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { hasUserPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

function pickParams(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return {
    listingId: parts[parts.length - 4],
    itemId: parts[parts.length - 2],
  };
}

export const GET = handler(async (req) => {
  const me = await requireUser();
  const { listingId, itemId } = pickParams(req);
  const item = await prisma.marketListingItem.findFirst({
    where: { id: itemId, listingId },
    select: { id: true },
  });
  if (!item) return fail(404, '商品不存在');

  const [existing, totalRows] = await Promise.all([
    prisma.$queryRaw<Array<{ userId: string }>>`
      SELECT userId FROM market_listing_item_collects
      WHERE userId = ${me.id} AND itemId = ${itemId}
      LIMIT 1
    `,
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) AS total FROM market_listing_item_collects WHERE itemId = ${itemId}
    `,
  ]);
  return { collected: existing.length > 0, total: Number(totalRows[0]?.total ?? 0) };
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  if (!(await hasUserPermission(me, 'post:collect'))) {
    return fail(403, '当前等级暂不能收藏');
  }

  const { listingId, itemId } = pickParams(req);
  const item = await prisma.marketListingItem.findFirst({
    where: { id: itemId, listingId },
    select: { id: true },
  });
  if (!item) return fail(404, '商品不存在');

  const existing = await prisma.$queryRaw<Array<{ userId: string }>>`
    SELECT userId FROM market_listing_item_collects
    WHERE userId = ${me.id} AND itemId = ${itemId}
    LIMIT 1
  `;

  if (existing.length) {
    await prisma.$transaction([
      prisma.$executeRaw`
        DELETE FROM market_listing_item_collects
        WHERE userId = ${me.id} AND itemId = ${itemId}
      `,
      prisma.$executeRaw`
        UPDATE market_listing_items
        SET collectCount = GREATEST(collectCount - 1, 0)
        WHERE id = ${itemId}
      `,
    ]);
  } else {
    await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO market_listing_item_collects (userId, itemId, createdAt)
        VALUES (${me.id}, ${itemId}, NOW())
      `,
      prisma.$executeRaw`
        UPDATE market_listing_items
        SET collectCount = collectCount + 1
        WHERE id = ${itemId}
      `,
    ]);
  }

  const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) AS total FROM market_listing_item_collects WHERE itemId = ${itemId}
  `;
  return { collected: !existing.length, total: Number(totalRows[0]?.total ?? 0) };
});
