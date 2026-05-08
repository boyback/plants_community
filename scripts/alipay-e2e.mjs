#!/usr/bin/env node
/**
 * 端到端沙箱联调:
 *   1. 用演示账号 u1 登录
 *   2. 拿到第一个商品,发起购买
 *   3. 拿到 payNo → 请求 /api/payments/:payNo/qrcode
 *   4. 打印沙箱二维码 URL
 *
 * 用法:
 *   node -r dotenv/config scripts/alipay-e2e.mjs
 */

const BASE = process.env.TEST_BASE ?? 'http://localhost:3000';

async function j(path, init) {
  const r = await fetch(BASE + path, { ...init, redirect: 'manual' });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body, cookies: r.headers.getSetCookie?.() ?? [] };
}

// 1. 登录
const NAME = process.env.TEST_USER_NAME ?? '多肉阿绿';
const PASS = process.env.TEST_USER_PASS ?? '123456';
console.log(`→ 登录 name=${NAME}`);
const loginR = await fetch(BASE + '/api/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: NAME, password: PASS }),
});
const sc = loginR.headers.getSetCookie?.() ?? [];
const tokenCookie = sc.find((c) => c.startsWith('rouyou_token='));
if (!tokenCookie) {
  console.error('❌ 登录失败,无 token cookie:', await loginR.text());
  process.exit(1);
}
const token = tokenCookie.split(';')[0];
console.log('✅', token.slice(0, 40) + '...');

async function auth(path, init = {}) {
  const r = await fetch(BASE + path, {
    ...init,
    headers: { ...(init.headers ?? {}), cookie: token },
  });
  const text = await r.text();
  try { return { status: r.status, body: JSON.parse(text) }; }
  catch { return { status: r.status, body: text }; }
}

// 2. 找一个商品
console.log('\n→ 找一个能买的商品');
const products = await auth('/api/market/products?limit=30');
const items = products.body?.data?.items ?? products.body?.items ?? [];
const p = items.find((x) => x.status === 'on_sale' && x.price > 0 && x.stock > 0);
if (!p) {
  console.error('❌ 没有可购买商品');
  process.exit(1);
}
console.log(`✅ ${p.title} — ¥${(p.price / 100).toFixed(2)} — id=${p.id}`);

// 3. 下单
console.log('\n→ 下单(qty=1,收货到一个临时地址)');
const order = await auth(`/api/market/products/${p.id}/buy`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    quantity: 1,
    shipName: '沙箱测试',
    shipPhone: '13900000000',
    shipAddress: '浙江省杭州市西湖区文三路 1 号',
  }),
});
if (order.status !== 200) {
  console.error('❌ 下单失败:', order.body);
  process.exit(1);
}
console.log('✅ 订单已创建:', order.body);

// 4. 创建 Payment(走真实 Alipay Gateway)
const orderId = order.body.data?.orderId ?? order.body.orderId;
console.log(`\n→ 创建支付 bizType=order bizId=${orderId} channel=alipay`);
const payR = await auth('/api/payments', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ bizType: 'order', bizId: orderId, channel: 'alipay' }),
});
console.log('状态:', payR.status);
const payment = payR.body?.data ?? payR.body;
console.log(JSON.stringify(payment, null, 2));

if (typeof payment?.qrcode === 'string' && payment.qrcode.startsWith('https://qr.alipay.com/')) {
  console.log('\n🎉 拿到真·沙箱支付宝二维码:');
  console.log('    ' + payment.qrcode);
  console.log('\n下一步:下载支付宝沙箱版 App');
  console.log('  https://open.alipay.com/develop/sandbox/account');
  console.log('然后把 URL 生成二维码图片(任何在线 QR 工具都行)用沙箱 App 扫码支付。');
} else {
  console.log('\n⚠️ 拿到的不是真支付宝二维码:', payment?.qrcode);
}
