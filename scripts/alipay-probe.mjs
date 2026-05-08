#!/usr/bin/env node
/**
 * 支付宝沙箱连通性探针。
 * 用法:
 *   node -r dotenv/config scripts/alipay-probe.mjs
 *
 * 做两件事:
 *   1. alipay.trade.precreate(金额 0.01 元,生成当面付二维码)
 *   2. alipay.trade.query(查询刚创建的单号)
 *
 * 不会触发真实扣款(沙箱无真实资金)。
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { AlipaySdk } = require('alipay-sdk');

function normalizeKey(raw, type /* 'RSA PRIVATE' | 'PUBLIC' */) {
  const unescaped = (raw ?? '').replace(/\\n/g, '\n').trim();
  if (unescaped.includes('BEGIN')) return unescaped;
  const wrapped = unescaped.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? unescaped;
  return `-----BEGIN ${type} KEY-----\n${wrapped}\n-----END ${type} KEY-----`;
}

const {
  ALIPAY_APP_ID,
  ALIPAY_PRIVATE_KEY_PEM,
  ALIPAY_PUBLIC_KEY_PEM,
  ALIPAY_GATEWAY,
  ALIPAY_NOTIFY_URL,
} = process.env;

if (!ALIPAY_APP_ID || !ALIPAY_PRIVATE_KEY_PEM || !ALIPAY_PUBLIC_KEY_PEM) {
  console.error('❌ 缺少 ALIPAY_* 环境变量,请检查 .env');
  process.exit(1);
}

const sdk = new AlipaySdk({
  appId: ALIPAY_APP_ID,
  privateKey: normalizeKey(ALIPAY_PRIVATE_KEY_PEM, 'RSA PRIVATE'),
  alipayPublicKey: normalizeKey(ALIPAY_PUBLIC_KEY_PEM, 'PUBLIC'),
  gateway: ALIPAY_GATEWAY ?? 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
  signType: 'RSA2',
});

const payNo = `PROBE${Date.now()}`;
console.log(`→ 预下单:payNo=${payNo} amount=0.01`);
try {
  const r = await sdk.exec('alipay.trade.precreate', {
    notify_url: ALIPAY_NOTIFY_URL,
    bizContent: {
      out_trade_no: payNo,
      total_amount: '0.01',
      subject: 'RouYou alipay probe',
      timeout_express: '10m',
    },
  });
  console.log('← precreate 返回:');
  console.log(JSON.stringify(r, null, 2));
  if (r.qrCode || r.qr_code) {
    console.log('\n✅ 拿到二维码:', r.qrCode ?? r.qr_code);
  }
} catch (e) {
  console.error('❌ precreate 出错:', e?.message ?? e);
  process.exit(2);
}

console.log(`\n→ 查询:payNo=${payNo}`);
try {
  const q = await sdk.exec('alipay.trade.query', {
    bizContent: { out_trade_no: payNo },
  });
  console.log('← query 返回:');
  console.log(JSON.stringify(q, null, 2));
} catch (e) {
  console.error('⚠️ query 出错(预下单刚创建,部分情况会返 ACQ.TRADE_NOT_EXIST,可忽略):');
  console.error(e?.message ?? e);
}

console.log('\n✅ 探针跑完');
