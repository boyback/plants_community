/**
 * POST /api/payments/alipay/webhook
 *
 * 支付宝通知后台回调。校验签名后,把 Payment 标记为 paid 并触发业务串联
 * (复用 confirmPayment)。响应体必须是纯文本 "success" 表示消费成功。
 *
 * 文档:https://opendocs.alipay.com/common/02khjp
 */

import { NextResponse } from 'next/server';
import { AlipayGateway } from '@/lib/payment/gateway';
import { confirmPayment } from '@/lib/payment';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text(); // 支付宝发的是 form-urlencoded
  try {
    const { payNo } = await AlipayGateway.verifyWebhook(body, '');
    await confirmPayment(payNo);
    // 支付宝要求幂等 — 即使已 paid 也返回 success
    return new NextResponse('success', { status: 200 });
  } catch (err) {
    console.error('[alipay webhook]', err);
    return new NextResponse('fail', { status: 400 });
  }
}
