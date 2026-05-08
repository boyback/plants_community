#!/usr/bin/env node
/**
 * 微信支付(Native)连通性探针。
 *   node -r dotenv/config scripts/wechat-probe.mjs
 *
 * 做两件事:
 *   1. transactions_native(金额 0.01 元,生成二维码 URL)
 *   2. query(查询刚创建的单号)
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

function normalizeKey(raw, type) {
  const u = (raw ?? '').replace(/\\n/g, '\n').trim();
  if (u.includes('BEGIN')) return u;
  const w = u.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? u;
  return `-----BEGIN ${type} KEY-----\n${w}\n-----END ${type} KEY-----`;
}

const {
  WECHAT_APPID,
  WECHAT_MCHID,
  WECHAT_SERIAL_NO,
  WECHAT_PRIVATE_KEY_PEM,
  WECHAT_API_V3_KEY,
  WECHAT_NOTIFY_URL,
} = process.env;

if (!WECHAT_APPID || !WECHAT_MCHID || !WECHAT_SERIAL_NO || !WECHAT_PRIVATE_KEY_PEM || !WECHAT_API_V3_KEY) {
  console.error('❌ 缺少 WECHAT_* 环境变量,请检查 .env');
  process.exit(1);
}

const WxPayMod = require('wechatpay-node-v3');
const WxPay = WxPayMod.default ?? WxPayMod;

const wx = new WxPay({
  appid: WECHAT_APPID,
  mchid: WECHAT_MCHID,
  serial_no: WECHAT_SERIAL_NO,
  privateKey: Buffer.from(normalizeKey(WECHAT_PRIVATE_KEY_PEM, 'RSA PRIVATE')),
  key: WECHAT_API_V3_KEY,
});

const payNo = `WXPROBE${Date.now()}`;
console.log(`→ Native 预下单 payNo=${payNo} amount=1 分(0.01 元)`);

try {
  const r = await wx.transactions_native({
    description: 'RouYou wechat probe',
    out_trade_no: payNo,
    notify_url: WECHAT_NOTIFY_URL ?? 'http://localhost:3000/api/payments/wechat/webhook',
    amount: { total: 1, currency: 'CNY' },
  });
  console.log('← 返回:');
  console.log(JSON.stringify(r, null, 2));
  if (r.code_url) {
    console.log('\n✅ 拿到二维码 URL:', r.code_url);
    console.log('(把这串生成二维码图,用微信 App 扫码即可支付 0.01)');
  }
} catch (e) {
  console.error('❌ 预下单失败:', e?.response?.data ?? e?.message ?? e);
  process.exit(2);
}

console.log(`\n→ 查询 payNo=${payNo}`);
try {
  const q = await wx.query({ out_trade_no: payNo });
  console.log('← 返回:');
  console.log(JSON.stringify(q, null, 2));
} catch (e) {
  console.error('⚠️ 查询失败(新单通常返回 ORDERNOTEXIST,可忽略):', e?.response?.data ?? e?.message ?? e);
}

console.log('\n✅ 探针跑完');
