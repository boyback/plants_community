/**
 * 支付网关抽象层。
 *
 * 整个项目对外用同一个 `PaymentGateway` 接口,日后要接入任何通道
 * (支付宝 / 微信 / Stripe),只需要实现这个接口并在 `pickGateway` 里切换。
 *
 * 当前实现:
 *   - `AlipayGateway` — 支付宝 PC 网站支付,pagePayUrl 跳转。
 *   - `WechatGateway` — 微信 Native 扫码支付,qrcode 渲染二维码。
 */

export interface PaymentChannel {
  name: 'alipay' | 'wechat' | 'points';
}

export interface CreatePaymentInput {
  payNo: string;
  userId: string;
  amount: number; // 单位:分
  channel: 'alipay' | 'wechat' | 'points';
  subject: string; // 给支付通道展示的标题,如 "订单 RY260507xxxx"
  expireMinutes: number; // 支付单多久过期
  // 为了 webhook 能识别是哪个业务,给 gateway 回调带上的 metadata
  meta: Record<string, string>;
}

export interface CreatePaymentResult {
  qrcode?: string; // 给前端渲染的二维码内容/URL
  pagePayUrl?: string; // 支付宝 PC 网站支付跳转 URL
  rawResponse?: unknown;
}

export type RemotePayStatus = 'pending' | 'scanning' | 'paid' | 'expired' | 'cancelled' | null;

export interface PaymentGateway {
  /** 给通道传入「预下单」,拿到 qrcode/跳转 URL */
  createPayment(in_: CreatePaymentInput): Promise<CreatePaymentResult>;
  /**
   * 主动查询支付状态。
   *   null      = 通道不支持或查询失败
   *   pending   = 二维码已生成但还没被扫码
   *   scanning  = 已有买家扫码(进入支付宝 App 支付页)但还没完成付款
   *   paid      = 支付成功
   *   expired   = 二维码过期
   *   cancelled = 订单被取消/关闭
   */
  queryStatus(payNo: string): Promise<RemotePayStatus>;
  /** 校验 webhook 回调的签名,返回 payNo。校验失败抛错 */
  verifyWebhook(body: string, signature: string): Promise<{ payNo: string }>;
}

// -----------------------------------------------
//  支付宝网关
// -----------------------------------------------

/**
 * 环境变量:
 *   ALIPAY_APP_ID           — 开发者中心创建的沙箱 AppId
 *   ALIPAY_PRIVATE_KEY_PEM  — 商家 RSA2 私钥(PKCS#8 pem,换行用 \n 转义)
 *   ALIPAY_PUBLIC_KEY_PEM   — 支付宝公钥(验签 webhook 用)
 *   ALIPAY_GATEWAY          — https://openapi.alipaydev.com/gateway.do(sandbox)
 *                             或 https://openapi.alipay.com/gateway.do(生产)
 *   ALIPAY_NOTIFY_URL       — webhook 回调地址,形如 https://你域名/api/payments/alipay/webhook
 *   ALIPAY_RETURN_URL       — 用户支付后的跳转地址,形如 https://你域名/checkout/done
 */

type AlipaySdkInstance = {
  exec: (method: string, params: unknown) => Promise<Record<string, unknown>>;
  checkNotifySign: (postData: Record<string, string>) => boolean;
};

let _alipaySdk: AlipaySdkInstance | null = null;

/**
 * 把环境变量里的 key 规范化成 PEM:
 *   - 支持纯 base64(单行,如 "MIIEv...")
 *   - 支持 \n 转义(形如 "-----BEGIN...\n...")
 *   - 支持已经带 BEGIN/END 头尾的真实 PEM
 */
function normalizeKey(raw: string, type: 'PRIVATE' | 'RSA PRIVATE' | 'PUBLIC'): string {
  const unescaped = raw.replace(/\\n/g, '\n').trim();
  if (unescaped.includes('BEGIN')) return unescaped;
  // 纯 base64,自动切 64 列并加头尾
  const wrapped = unescaped.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? unescaped;
  return `-----BEGIN ${type} KEY-----\n${wrapped}\n-----END ${type} KEY-----`;
}

function normalizePrivateKey(raw: string): { key: string; keyType: 'PKCS1' | 'PKCS8' } {
  const unescaped = raw.replace(/\\n/g, '\n').trim();
  const { createPrivateKey } = require('crypto') as typeof import('crypto');
  if (unescaped.includes('BEGIN RSA PRIVATE KEY')) {
    createPrivateKey(unescaped);
    return { key: unescaped, keyType: 'PKCS1' };
  }
  if (unescaped.includes('BEGIN PRIVATE KEY')) {
    createPrivateKey(unescaped);
    return { key: unescaped, keyType: 'PKCS8' };
  }
  const candidates: Array<{ key: string; keyType: 'PKCS1' | 'PKCS8' }> = [
    { key: normalizeKey(unescaped, 'PRIVATE'), keyType: 'PKCS8' },
    { key: normalizeKey(unescaped, 'RSA PRIVATE'), keyType: 'PKCS1' },
  ];
  for (const candidate of candidates) {
    try {
      createPrivateKey(candidate.key);
      return candidate;
    } catch {
      // try next private key wrapper
    }
  }
  throw new Error('ALIPAY_PRIVATE_KEY_PEM 不是有效的 RSA 应用私钥');
}

function certContent(raw?: string) {
  return raw ? raw.replace(/\\n/g, '\n') : undefined;
}

function getAlipayCertOptions() {
  const {
    ALIPAY_APP_CERT_PATH,
    ALIPAY_APP_CERT_CONTENT,
    ALIPAY_ALIPAY_PUBLIC_CERT_PATH,
    ALIPAY_ALIPAY_PUBLIC_CERT_CONTENT,
    ALIPAY_ROOT_CERT_PATH,
    ALIPAY_ROOT_CERT_CONTENT,
  } = process.env;
  const hasCert =
    (ALIPAY_APP_CERT_PATH || ALIPAY_APP_CERT_CONTENT) &&
    (ALIPAY_ALIPAY_PUBLIC_CERT_PATH || ALIPAY_ALIPAY_PUBLIC_CERT_CONTENT) &&
    (ALIPAY_ROOT_CERT_PATH || ALIPAY_ROOT_CERT_CONTENT);
  if (!hasCert) return null;
  return {
    appCertPath: ALIPAY_APP_CERT_PATH,
    appCertContent: certContent(ALIPAY_APP_CERT_CONTENT),
    alipayPublicCertPath: ALIPAY_ALIPAY_PUBLIC_CERT_PATH,
    alipayPublicCertContent: certContent(ALIPAY_ALIPAY_PUBLIC_CERT_CONTENT),
    alipayRootCertPath: ALIPAY_ROOT_CERT_PATH,
    alipayRootCertContent: certContent(ALIPAY_ROOT_CERT_CONTENT),
  };
}

function alipayTimestamp() {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

function buildAlipayPagePayUrl(input: {
  appId: string;
  gateway: string;
  privateKey: string;
  notifyUrl?: string;
  returnUrl?: string;
  bizContent: Record<string, string>;
}): string {
  const { createSign } = require('crypto') as typeof import('crypto');
  const params: Record<string, string> = {
    app_id: input.appId,
    method: 'alipay.trade.page.pay',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: alipayTimestamp(),
    version: '1.0',
    biz_content: JSON.stringify(input.bizContent),
  };
  if (input.notifyUrl) params.notify_url = input.notifyUrl;
  if (input.returnUrl) params.return_url = input.returnUrl;

  const url = new URL(input.gateway);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const finalParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (key !== 'sign') finalParams[key] = value;
  });
  const signString = Object.keys(finalParams)
    .sort()
    .map((key) => `${key}=${finalParams[key]}`)
    .join('&');
  const sign = createSign('RSA-SHA256').update(signString, 'utf8').sign(input.privateKey, 'base64');
  url.searchParams.set('sign', sign);
  return url.toString();
}

function buildAlipayReturnUrl(returnUrl: string | undefined, input: CreatePaymentInput): string | undefined {
  if (!returnUrl) return undefined;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://plantcommunity.cn';
  let url: URL;
  try {
    url = new URL(returnUrl);
  } catch {
    url = new URL(returnUrl.startsWith('/') ? returnUrl : `/${returnUrl}`, siteUrl);
  }

  url.searchParams.set('payNo', input.payNo);
  if (input.meta.bizType) url.searchParams.set('bizType', input.meta.bizType);
  if (input.meta.orderId) {
    url.searchParams.set('orderId', input.meta.orderId);
    url.searchParams.set('bizId', input.meta.orderId);
  }
  if (input.meta.participantId) {
    url.searchParams.set('participantId', input.meta.participantId);
    url.searchParams.set('bizId', input.meta.participantId);
  }
  return url.toString();
}

function getAlipay(): AlipaySdkInstance {
  if (_alipaySdk) return _alipaySdk;
  const {
    ALIPAY_APP_ID,
    ALIPAY_PRIVATE_KEY_PEM,
    ALIPAY_PUBLIC_KEY_PEM,
    ALIPAY_GATEWAY,
  } = process.env;
  const certOptions = getAlipayCertOptions();
  if (!ALIPAY_APP_ID || !ALIPAY_PRIVATE_KEY_PEM || (!ALIPAY_PUBLIC_KEY_PEM && !certOptions)) {
    throw new Error(
      'AlipayGateway 需要环境变量:ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY_PEM / ALIPAY_PUBLIC_KEY_PEM 或支付宝证书三件套',
    );
  }
  // 延迟 require,未安装依赖时给出清晰错误
  let AlipaySdk: new (opts: Record<string, unknown>) => AlipaySdkInstance;
  try {
    // alipay-sdk 4.x 为命名导出;3.x 为 default
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('alipay-sdk');
    AlipaySdk = mod.AlipaySdk ?? mod.default;
    if (!AlipaySdk) throw new Error('alipay-sdk module 没有 AlipaySdk 导出');
  } catch {
    throw new Error(
      'AlipayGateway 需要 alipay-sdk 依赖:npm install alipay-sdk',
    );
  }
  const privateKey = normalizePrivateKey(ALIPAY_PRIVATE_KEY_PEM);
  _alipaySdk = new AlipaySdk({
    appId: ALIPAY_APP_ID,
    privateKey: privateKey.key,
    keyType: privateKey.keyType,
    ...(ALIPAY_PUBLIC_KEY_PEM ? { alipayPublicKey: normalizeKey(ALIPAY_PUBLIC_KEY_PEM, 'PUBLIC') } : {}),
    ...(certOptions ?? {}),
    gateway: ALIPAY_GATEWAY ?? 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
    signType: 'RSA2',
  });
  return _alipaySdk;
}

export const AlipayGateway: PaymentGateway = {
  async createPayment(input) {
    const {
      ALIPAY_APP_ID,
      ALIPAY_PRIVATE_KEY_PEM,
      ALIPAY_GATEWAY,
      ALIPAY_NOTIFY_URL,
      ALIPAY_RETURN_URL,
    } = process.env;
    if (!ALIPAY_APP_ID || !ALIPAY_PRIVATE_KEY_PEM) {
      throw new Error('AlipayGateway 需要环境变量:ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY_PEM');
    }
    const bizContent = {
      out_trade_no: input.payNo,
      total_amount: (input.amount / 100).toFixed(2),
      subject: input.subject,
      timeout_express: `${input.expireMinutes}m`,
      passback_params: encodeURIComponent(JSON.stringify(input.meta)),
      product_code: 'FAST_INSTANT_TRADE_PAY',
    };
    const privateKey = normalizePrivateKey(ALIPAY_PRIVATE_KEY_PEM);
    const pagePayUrl = buildAlipayPagePayUrl({
      appId: ALIPAY_APP_ID,
      gateway: ALIPAY_GATEWAY ?? 'https://openapi.alipay.com/gateway.do',
      privateKey: privateKey.key,
      notifyUrl: ALIPAY_NOTIFY_URL,
      returnUrl: buildAlipayReturnUrl(ALIPAY_RETURN_URL, input),
      bizContent,
    });
    if (!pagePayUrl) {
      throw new Error('支付宝网页支付未返回跳转地址');
    }
    return {
      pagePayUrl,
      rawResponse: pagePayUrl,
    };
  },
  async queryStatus(payNo) {
    const sdk = getAlipay();
    const resp = await sdk.exec('alipay.trade.query', {
      bizContent: { out_trade_no: payNo },
    });
    const status = (resp.tradeStatus ?? resp.trade_status) as string | undefined;
    if (status === 'TRADE_SUCCESS' || status === 'TRADE_FINISHED') return 'paid';
    if (status === 'TRADE_CLOSED') return 'cancelled';
    if (status === 'WAIT_BUYER_PAY') {
      // 进入 WAIT_BUYER_PAY 就意味着已经有买家扫过码(进入支付宝 App 支付页)。
      // 若 buyerLogonId/buyerUserId 已出现,按 scanning 更精确。
      const scanned = !!(resp.buyerLogonId ?? resp.buyer_logon_id ?? resp.buyerUserId ?? resp.buyer_user_id);
      return scanned ? 'scanning' : 'pending';
    }
    // 交易不存在 = 还没被扫 / 预下单还没落定
    const subCode = (resp.subCode ?? resp.sub_code) as string | undefined;
    if (subCode === 'ACQ.TRADE_NOT_EXIST') return 'pending';
    return null;
  },
  async verifyWebhook(body /* urlencoded form body */, _signature) {
    const sdk = getAlipay();
    const params = Object.fromEntries(new URLSearchParams(body));
    // alipay-sdk v4 推荐 checkNotifySignV2,但向下兼容旧 checkNotifySign
    const verify =
      (sdk as unknown as { checkNotifySignV2?: typeof sdk.checkNotifySign })
        .checkNotifySignV2 ?? sdk.checkNotifySign;
    const ok = verify.call(sdk, params);
    if (!ok) throw new Error('Alipay webhook 签名校验失败');
    const payNo = params['out_trade_no'];
    if (!payNo) throw new Error('Alipay webhook 缺少 out_trade_no');
    return { payNo };
  },
};

// -----------------------------------------------
//  微信支付网关(Native 扫码支付)
// -----------------------------------------------

/**
 * 环境变量:
 *   WECHAT_APPID             — 公众号 / 小程序 / 开放平台 APPID
 *   WECHAT_MCHID             — 商户号
 *   WECHAT_SERIAL_NO         — 商户 API 证书序列号
 *   WECHAT_PRIVATE_KEY_PEM   — 商户 API 私钥(apiclient_key.pem 的 PEM 内容)
 *   WECHAT_API_V3_KEY        — APIv3 密钥(32 位)
 *   WECHAT_NOTIFY_URL        — 回调地址,形如 https://你域名/api/payments/wechat/webhook
 */

type WechatPayInstance = {
  transactions_native: (params: {
    description: string;
    out_trade_no: string;
    notify_url: string;
    amount: { total: number; currency?: string };
    attach?: string;
    time_expire?: string;
  }) => Promise<{ status: number; code_url?: string; message?: string; [k: string]: unknown }>;
  query: (
    params: { out_trade_no: string } | { transaction_id: string }
  ) => Promise<{
    status?: number;
    trade_state?: string;
    [k: string]: unknown;
  }>;
  decipher_gcm: <T = unknown>(
    ciphertext: string,
    associated_data: string,
    nonce: string,
    apiSecret?: string
  ) => T;
  verifySign: (p: {
    timestamp: string | number;
    nonce: string;
    body: Record<string, unknown> | string;
    serial: string;
    signature: string;
    apiSecret?: string;
  }) => Promise<boolean>;
};

let _wxpay: WechatPayInstance | null = null;

function getWechat(): WechatPayInstance {
  if (_wxpay) return _wxpay;
  const {
    WECHAT_APPID,
    WECHAT_MCHID,
    WECHAT_SERIAL_NO,
    WECHAT_PRIVATE_KEY_PEM,
    WECHAT_API_V3_KEY,
  } = process.env;
  if (!WECHAT_APPID || !WECHAT_MCHID || !WECHAT_SERIAL_NO || !WECHAT_PRIVATE_KEY_PEM || !WECHAT_API_V3_KEY) {
    throw new Error(
      'WechatGateway 需要环境变量:WECHAT_APPID / WECHAT_MCHID / WECHAT_SERIAL_NO / WECHAT_PRIVATE_KEY_PEM / WECHAT_API_V3_KEY',
    );
  }

  // 私钥 PEM:支持单行 base64 / \n 转义 / 已带头尾三种
  const priv = normalizeKey(WECHAT_PRIVATE_KEY_PEM, 'RSA PRIVATE');

  let Pay: new (opts: Record<string, unknown>) => WechatPayInstance;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('wechatpay-node-v3');
    Pay = mod.default ?? mod;
    if (!Pay) throw new Error('wechatpay-node-v3 module 没有导出构造器');
  } catch {
    throw new Error(
      'WechatGateway 需要 wechatpay-node-v3 依赖:npm install wechatpay-node-v3',
    );
  }

  _wxpay = new Pay({
    appid: WECHAT_APPID,
    mchid: WECHAT_MCHID,
    serial_no: WECHAT_SERIAL_NO,
    privateKey: Buffer.from(priv),
    key: WECHAT_API_V3_KEY,
  });
  return _wxpay;
}

export const WechatGateway: PaymentGateway = {
  async createPayment(input) {
    const wx = getWechat();
    const resp = await wx.transactions_native({
      description: input.subject,
      out_trade_no: input.payNo,
      notify_url: process.env.WECHAT_NOTIFY_URL ?? '',
      amount: { total: input.amount, currency: 'CNY' },
      attach: JSON.stringify(input.meta).slice(0, 128),
      time_expire: new Date(Date.now() + input.expireMinutes * 60_000).toISOString(),
    });
    const qrcode = resp.code_url as string | undefined;
    if (!qrcode) {
      throw new Error(`微信预下单失败: ${JSON.stringify(resp)}`);
    }
    return { qrcode, rawResponse: resp };
  },
  async queryStatus(payNo) {
    const wx = getWechat();
    const resp = await wx.query({ out_trade_no: payNo });
    const state = resp.trade_state as string | undefined;
    if (state === 'SUCCESS') return 'paid';
    if (state === 'CLOSED' || state === 'REVOKED') return 'cancelled';
    if (state === 'PAYERROR') return 'cancelled';
    if (state === 'USERPAYING') return 'scanning'; // 用户正在支付
    if (state === 'NOTPAY' || state === 'REFUND') return 'pending';
    return null;
  },
  async verifyWebhook(body, headers) {
    // body: JSON 字符串;headers: 'timestamp|nonce|serial|signature' 以 '|' 分隔的辅助字符串,
    // 或者前端直接传 JSON headers(为了兼容我们上层约定),这里先按约定解析
    const wx = getWechat();
    // 预期 headers 是 JSON,包含 timestamp/nonce/serial/signature
    let h: { timestamp: string; nonce: string; serial: string; signature: string };
    try {
      h = JSON.parse(headers);
    } catch {
      throw new Error('WechatGateway verifyWebhook: headers 必须是 JSON 字符串');
    }
    const ok = await wx.verifySign({
      timestamp: h.timestamp,
      nonce: h.nonce,
      body,
      serial: h.serial,
      signature: h.signature,
    });
    if (!ok) throw new Error('Wechat webhook 签名校验失败');
    // 解密 resource
    const parsed = JSON.parse(body) as {
      resource?: { ciphertext?: string; associated_data?: string; nonce?: string };
    };
    const res = parsed.resource;
    if (!res?.ciphertext || !res?.nonce) {
      throw new Error('Wechat webhook 缺少 resource 信息');
    }
    const plain = wx.decipher_gcm<{ out_trade_no?: string }>(
      res.ciphertext,
      res.associated_data ?? '',
      res.nonce,
    );
    if (!plain.out_trade_no) {
      throw new Error('Wechat webhook 解密后缺少 out_trade_no');
    }
    return { payNo: plain.out_trade_no };
  },
};

// -----------------------------------------------
//  工厂:按渠道选择网关
// -----------------------------------------------

/**
 * PAYMENT_GATEWAY:
 *   'alipay' — 支付宝可用
 *   'wechat' — 微信可用
 *   'real'   — 支付宝/微信均可用
 */
export function pickGateway(channel?: 'alipay' | 'wechat' | 'points'): PaymentGateway {
  const chosen = (process.env.PAYMENT_GATEWAY ?? 'real').toLowerCase();

  if (channel === 'alipay') {
    if (chosen === 'alipay' || chosen === 'real') return AlipayGateway;
    throw new Error('支付宝支付未启用');
  }
  if (channel === 'wechat') {
    if (chosen === 'wechat' || chosen === 'real') return WechatGateway;
    throw new Error('微信支付未启用');
  }
  if (channel === 'points') {
    throw new Error('钻石支付不走支付网关');
  }

  if (chosen === 'alipay') return AlipayGateway;
  if (chosen === 'wechat') return WechatGateway;
  throw new Error('支付渠道未指定');
}
