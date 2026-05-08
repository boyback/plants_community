import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { AlipaySdk } = require('alipay-sdk');
function n(r, t){const u=(r??'').replace(/\\n/g,'\n').trim();if(u.includes('BEGIN'))return u;const w=u.replace(/\s+/g,'').match(/.{1,64}/g)?.join('\n')??u;return `-----BEGIN ${t} KEY-----\n${w}\n-----END ${t} KEY-----`;}
const sdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID,
  privateKey: n(process.env.ALIPAY_PRIVATE_KEY_PEM,'RSA PRIVATE'),
  alipayPublicKey: n(process.env.ALIPAY_PUBLIC_KEY_PEM,'PUBLIC'),
  gateway: process.env.ALIPAY_GATEWAY,
  signType: 'RSA2',
});
const r = await sdk.exec('alipay.trade.query', { bizContent: {out_trade_no: process.argv[2]}});
console.log(JSON.stringify(r, null, 2));
