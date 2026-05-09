/**
 * 取消订阅 token 工具
 *
 * 设计:不写表,用 JWT 风格签名(JWT_SECRET 已有)。
 * 用户点邮件底部「取消订阅」 → 带 token 跳 /api/email/unsubscribe?token=xxx
 * 后端验签得到 userId,把 user.emailUnsubscribed=true。
 */
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const encoder = new TextEncoder();
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://plantcommunity.cn';

export async function makeUnsubscribeToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId, scope: 'unsub' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(encoder.encode(JWT_SECRET));
}

export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    if (payload.scope !== 'unsub') return null;
    if (typeof payload.sub === 'string') return payload.sub;
    return null;
  } catch {
    return null;
  }
}

export async function makeUnsubscribeUrl(userId: string): Promise<string> {
  const token = await makeUnsubscribeToken(userId);
  return `${SITE_URL}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}
