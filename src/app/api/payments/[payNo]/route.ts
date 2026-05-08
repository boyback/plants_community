import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { queryPayment, isScanning } from '@/lib/payment';
import { serializePayment } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const me = await requireUser();
  const payNo = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const p = await queryPayment(payNo);
  if (!p) return fail(404, '支付单不存在');
  if (p.userId !== me.id) return fail(403, '无权查看');
  // 附加瞬时 scanning 字段(DB 不落库)
  return { ...serializePayment(p), scanning: isScanning(payNo) };
});
