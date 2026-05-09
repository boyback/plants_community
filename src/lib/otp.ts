/**
 * 邮箱验证码:发送 + 校验 + 存储
 *
 * 存储:进程内 Map(单容器够用,多副本需换 Redis)
 * 验证码:6 位数字
 * TTL:10 分钟
 * 限频:同邮箱 60s 内只能发 1 封;同邮箱 1h 内最多 5 封
 *
 * driver:
 *   mock     — 开发期把验证码写到 console
 *   smtp     — 通过 SMTP 发送(腾讯/新浪/网易/263 等任何 SMTP 服务通用)
 *
 * 环境变量(smtp):
 *   OTP_DRIVER=smtp | mock                    (留空 = mock)
 *   SMTP_HOST=smtp.exmail.qq.com              (腾讯企业邮)
 *   SMTP_PORT=465                              (一般 465 = SSL,587 = STARTTLS)
 *   SMTP_SECURE=true                           (port=465 时 true)
 *   SMTP_USER=noreply@plantcommunity.cn       (发件邮箱完整地址)
 *   SMTP_PASS=xxx                              (邮箱密码或 SMTP 授权码)
 *   SMTP_FROM_NAME=肉友社                      (显示给用户的发件人名称)
 */

import { sendMail } from './email-mailer';
import { otpEmail } from './email-templates';

// ============================================================
// 内存存储 + 限频
// ============================================================

interface CodeEntry {
  code: string;
  expiresAt: number;
}

const codes = new Map<string, CodeEntry>(); // email -> { code, expiresAt }
const lastSentAt = new Map<string, number>();
const sentLog = new Map<string, number[]>();

const CODE_TTL_MS = 10 * 60 * 1000; // 10 分钟(邮件可能延迟,放宽)
const RESEND_COOLDOWN_MS = 60 * 1000;
const HOUR_MAX_SENDS = 5;
const HOUR_MS = 60 * 60 * 1000;

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
// 限频
// ============================================================

interface RateLimitResult {
  ok: boolean;
  reason?: 'cooldown' | 'hourly';
  retryAfter?: number;
}

function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const last = lastSentAt.get(key);
  if (last && now - last < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      reason: 'cooldown',
      retryAfter: Math.ceil((RESEND_COOLDOWN_MS - (now - last)) / 1000),
    };
  }
  const arr = (sentLog.get(key) || []).filter((t) => now - t < HOUR_MS);
  if (arr.length >= HOUR_MAX_SENDS) {
    return {
      ok: false,
      reason: 'hourly',
      retryAfter: Math.ceil((HOUR_MS - (now - arr[0])) / 1000),
    };
  }
  return { ok: true };
}

function recordSent(key: string) {
  const now = Date.now();
  lastSentAt.set(key, now);
  const arr = sentLog.get(key) || [];
  arr.push(now);
  sentLog.set(key, arr);
}

// ============================================================
// 验证码生成 + 校验
// ============================================================

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function verifyEmailCode(email: string, code: string): { ok: boolean; reason?: string } {
  const key = email.toLowerCase();
  const entry = codes.get(key);
  if (!entry) return { ok: false, reason: '请先获取验证码' };
  if (entry.expiresAt < Date.now()) {
    codes.delete(key);
    return { ok: false, reason: '验证码已过期,请重新获取' };
  }
  if (entry.code !== code) return { ok: false, reason: '验证码错误' };
  codes.delete(key);
  // 标记该邮箱「已通过验证」,5 分钟内允许走注册流程
  markEmailVerified(key);
  return { ok: true };
}

// ============================================================
// 已验证邮箱 session(给注册流程用)
// ============================================================

const verifiedEmails = new Map<string, number>(); // email -> expiresAt
const VERIFIED_TTL_MS = 5 * 60 * 1000;

function markEmailVerified(email: string) {
  verifiedEmails.set(email.toLowerCase(), Date.now() + VERIFIED_TTL_MS);
}

/** 检查邮箱是否近 5min 内通过过验证(注册路由用)。check=true 时校验完即清除 */
export function consumeVerifiedEmail(email: string): boolean {
  const key = email.toLowerCase();
  const expires = verifiedEmails.get(key);
  if (!expires || expires < Date.now()) {
    verifiedEmails.delete(key);
    return false;
  }
  verifiedEmails.delete(key);
  return true;
}

// ============================================================
// 实际发送(SMTP / mock)
// ============================================================

interface SendResult {
  ok: boolean;
  error?: string;
}

async function sendViaSmtp(email: string, code: string): Promise<SendResult> {
  const { subject, html, text } = otpEmail(code, 10);
  return sendMail({ to: email, subject, html, text });
}

async function sendViaMock(email: string, code: string): Promise<SendResult> {
  // eslint-disable-next-line no-console
  console.log(`📧 [MOCK EMAIL] 给 ${email} 发验证码: ${code} (有效 10 分钟)`);
  return { ok: true };
}

// ============================================================
// 顶层入口
// ============================================================

export async function sendEmailCode(email: string): Promise<{
  ok: boolean;
  error?: string;
  retryAfter?: number;
}> {
  const key = email.toLowerCase();

  const limit = checkRateLimit(key);
  if (!limit.ok) {
    const msg =
      limit.reason === 'cooldown'
        ? `请 ${limit.retryAfter} 秒后再试`
        : `1 小时内最多发 ${HOUR_MAX_SENDS} 封`;
    return { ok: false, error: msg, retryAfter: limit.retryAfter };
  }

  const code = generateCode();
  const driver = (process.env.OTP_DRIVER || 'mock').toLowerCase();
  const result = driver === 'smtp' ? await sendViaSmtp(email, code) : await sendViaMock(email, code);
  if (!result.ok) {
    return { ok: false, error: result.error || '邮件发送失败' };
  }

  codes.set(key, { code, expiresAt: Date.now() + CODE_TTL_MS });
  recordSent(key);
  return { ok: true };
}
