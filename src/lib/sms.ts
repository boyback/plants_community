/**
 * 短信验证码:发送 + 校验 + 存储
 *
 * 存储:进程内 Map(单容器够用,多副本需换 Redis)
 * 验证码:6 位数字
 * TTL:5 分钟
 * 限频:同手机号 60s 内只能发 1 条;同手机号 1h 内最多 5 条
 *
 * 默认 driver = 腾讯云 SMS;开发期 driver = 'mock' 把验证码写到 console
 *
 * 环境变量:
 *   SMS_DRIVER=tencent | mock           (留空 = mock)
 *   TENCENT_SMS_SECRET_ID
 *   TENCENT_SMS_SECRET_KEY
 *   TENCENT_SMS_REGION=ap-guangzhou      (默认 ap-guangzhou)
 *   TENCENT_SMS_APP_ID                   (短信应用 SDK AppID,腾讯云 SMS 控制台)
 *   TENCENT_SMS_SIGN_NAME=肉友社         (短信签名内容)
 *   TENCENT_SMS_TEMPLATE_ID              (验证码模板 ID,如 1234567)
 */

import { createHmac } from 'node:crypto';

// ============================================================
// 内存存储 + 限频
// ============================================================

interface CodeEntry {
  code: string;
  expiresAt: number; // unix ms
}

const codes = new Map<string, CodeEntry>(); // phone -> { code, expiresAt }
const lastSentAt = new Map<string, number>(); // phone -> ms,用于 60s 限频
const sentLog = new Map<string, number[]>(); // phone -> 发送时间戳数组,用于 1h 限频

const CODE_TTL_MS = 5 * 60 * 1000; // 5 分钟
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 秒
const HOUR_MAX_SENDS = 5;
const HOUR_MS = 60 * 60 * 1000;

// 定期清理过期数据(每 10 分钟)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of codes) if (v.expiresAt < now) codes.delete(k);
    for (const [k, t] of lastSentAt) if (now - t > HOUR_MS) lastSentAt.delete(k);
    for (const [k, arr] of sentLog) {
      const filtered = arr.filter((t) => now - t < HOUR_MS);
      if (filtered.length === 0) sentLog.delete(k);
      else sentLog.set(k, filtered);
    }
  }, 10 * 60 * 1000);
}

// ============================================================
// 限频检查
// ============================================================

export interface RateLimitResult {
  ok: boolean;
  reason?: 'cooldown' | 'hourly';
  retryAfter?: number; // 秒
}

export function checkRateLimit(phone: string): RateLimitResult {
  const now = Date.now();

  // 60s 冷却
  const last = lastSentAt.get(phone);
  if (last && now - last < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      reason: 'cooldown',
      retryAfter: Math.ceil((RESEND_COOLDOWN_MS - (now - last)) / 1000),
    };
  }

  // 1h 内最多 5 条
  const arr = (sentLog.get(phone) || []).filter((t) => now - t < HOUR_MS);
  if (arr.length >= HOUR_MAX_SENDS) {
    return {
      ok: false,
      reason: 'hourly',
      retryAfter: Math.ceil((HOUR_MS - (now - arr[0])) / 1000),
    };
  }

  return { ok: true };
}

function recordSent(phone: string) {
  const now = Date.now();
  lastSentAt.set(phone, now);
  const arr = sentLog.get(phone) || [];
  arr.push(now);
  sentLog.set(phone, arr);
}

// ============================================================
// 验证码生成 + 校验
// ============================================================

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeCode(phone: string, code: string) {
  codes.set(phone, { code, expiresAt: Date.now() + CODE_TTL_MS });
}

export function verifyCode(phone: string, code: string): { ok: boolean; reason?: string } {
  const entry = codes.get(phone);
  if (!entry) return { ok: false, reason: '请先获取验证码' };
  if (entry.expiresAt < Date.now()) {
    codes.delete(phone);
    return { ok: false, reason: '验证码已过期,请重新获取' };
  }
  if (entry.code !== code) return { ok: false, reason: '验证码错误' };
  // 一次性,验证后清除
  codes.delete(phone);
  return { ok: true };
}

// ============================================================
// 腾讯云 SMS Driver
// ============================================================

interface SmsSendResult {
  ok: boolean;
  error?: string;
}

/**
 * 调用腾讯云 SMS API v3 发短信
 *
 * 接口:https://sms.tencentcloudapi.com  (POST)
 * 鉴权:TC3-HMAC-SHA256
 * 文档:https://cloud.tencent.com/document/api/382/55981
 */
async function sendViaTencent(phone: string, code: string): Promise<SmsSendResult> {
  const secretId = process.env.TENCENT_SMS_SECRET_ID || '';
  const secretKey = process.env.TENCENT_SMS_SECRET_KEY || '';
  const region = process.env.TENCENT_SMS_REGION || 'ap-guangzhou';
  const appId = process.env.TENCENT_SMS_APP_ID || '';
  const signName = process.env.TENCENT_SMS_SIGN_NAME || '';
  const templateId = process.env.TENCENT_SMS_TEMPLATE_ID || '';

  if (!secretId || !secretKey || !appId || !signName || !templateId) {
    return { ok: false, error: '腾讯云 SMS 凭证未配置' };
  }

  const endpoint = 'sms.tencentcloudapi.com';
  const service = 'sms';
  const action = 'SendSms';
  const version = '2021-01-11';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  const payload = {
    PhoneNumberSet: [`+86${phone}`],
    SmsSdkAppId: appId,
    SignName: signName,
    TemplateId: templateId,
    TemplateParamSet: [code, '5'], // {1} = 验证码, {2} = 有效分钟数
  };
  const payloadStr = JSON.stringify(payload);

  // === 1. 拼 canonical request ===
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${endpoint}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const hashedRequestPayload = sha256(payloadStr);
  const canonicalRequest =
    `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

  // === 2. 拼 string to sign ===
  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = sha256(canonicalRequest);
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  // === 3. 计算签名 ===
  const secretDate = hmacSha256(`TC3${secretKey}`, date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, 'tc3_request');
  const signature = hmacSha256(secretSigning, stringToSign).toString('hex');

  // === 4. 拼 Authorization ===
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Host: endpoint,
      'X-TC-Action': action,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Version': version,
      'X-TC-Region': region,
      Authorization: authorization,
    },
    body: payloadStr,
  });

  const data = await res.json();
  if (data?.Response?.Error) {
    return {
      ok: false,
      error: `${data.Response.Error.Code}: ${data.Response.Error.Message}`,
    };
  }
  const item = data?.Response?.SendStatusSet?.[0];
  if (!item || item.Code !== 'Ok') {
    return { ok: false, error: item?.Message || 'SMS 发送失败' };
  }
  return { ok: true };
}

function sha256(s: string | Buffer): string {
  return require('node:crypto').createHash('sha256').update(s).digest('hex');
}

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key as Buffer | string).update(data).digest();
}

// ============================================================
// Mock Driver (开发期使用)
// ============================================================

async function sendViaMock(phone: string, code: string): Promise<SmsSendResult> {
  // eslint-disable-next-line no-console
  console.log(`📱 [MOCK SMS] 给 ${phone} 发验证码: ${code} (有效 5 分钟)`);
  return { ok: true };
}

// ============================================================
// 顶层入口
// ============================================================

/**
 * 发送验证码:含限频检查、生成、存储、调 driver。
 * 失败时返回 ok=false 给路由层格式化。
 */
export async function sendSmsCode(phone: string): Promise<{
  ok: boolean;
  error?: string;
  retryAfter?: number;
}> {
  // 限频
  const limit = checkRateLimit(phone);
  if (!limit.ok) {
    const msg =
      limit.reason === 'cooldown'
        ? `请 ${limit.retryAfter} 秒后再试`
        : `1 小时内最多发 ${HOUR_MAX_SENDS} 条`;
    return { ok: false, error: msg, retryAfter: limit.retryAfter };
  }

  const code = generateCode();
  const driver = (process.env.SMS_DRIVER || 'mock').toLowerCase();
  const result = driver === 'tencent' ? await sendViaTencent(phone, code) : await sendViaMock(phone, code);
  if (!result.ok) {
    return { ok: false, error: result.error || 'SMS 发送失败' };
  }

  storeCode(phone, code);
  recordSent(phone);
  return { ok: true };
}
