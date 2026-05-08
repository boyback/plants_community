import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { serializeAuctionDetail } from '@/lib/serializers';
import { auctionDetailInclude } from '@/lib/auction-include';
import { advanceAuctionState } from '@/lib/auction';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;

  // 进入详情前先推进一次状态机(可能会结束本场拍卖)
  await advanceAuctionState(id);

  const me = await getCurrentUser();
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: auctionDetailInclude(),
  });
  if (!auction) return fail(404, '拍卖不存在');
  return serializeAuctionDetail(auction, me?.id);
});
