import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { serializeProduct } from '@/lib/serializers';
import { productInclude } from '@/lib/market-include';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const p = await prisma.product.findUnique({
    where: { id },
    include: productInclude(),
  });
  if (!p) return fail(404, '商品不存在');
  return serializeProduct(p);
});
