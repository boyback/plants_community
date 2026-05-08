/**
 * POST /api/payments/wechat/webhook
 *
 * 微信支付结果通知。
 * 文档:https://pay.weixin.qq.com/wiki/doc/apiv3/wechatpay/wechatpay4_5.shtml
 *
 * 校验签名(wechatpay-node-v3 verifySign) + 解密 resource(AES-256-GCM)后,
 * 把 Payment 标记为 paid 并触发业务串联。
 * 响应体必须是 {code:'SUCCESS', message:'成功'},200 OK。
 */

import { NextResponse } from 'next/server';
import { WechatGateway } from '@/lib/payment/gateway';
import { confirmPayment } from '@/lib/payment';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text(); // 必须原始字符串用于验签
  const headers = {
    timestamp: req.headers.get('wechatpay-timestamp') ?? '',
    nonce: req.headers.get('wechatpay-nonce') ?? '',
    serial: req.headers.get('wechatpay-serial') ?? '',
    signature: req.headers.get('wechatpay-signature') ?? '',
  };
  try {
    const { payNo } = await WechatGateway.verifyWebhook(body, JSON.stringify(headers));
    await confirmPayment(payNo);
    return NextResponse.json({ code: 'SUCCESS', message: '成功' }, { status: 200 });
  } catch (err) {
    console.error('[wechat webhook]', err);
    return NextResponse.json(
      { code: 'FAIL', message: err instanceof Error ? err.message : 'unknown' },
      { status: 400 },
    );
  }
}
