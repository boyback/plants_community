import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import type { User as DBUser } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'rouyou_token';
const COOKIE_MAX_AGE = Number(process.env.AUTH_COOKIE_MAX_AGE || 60 * 60 * 24 * 30);

const encoder = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: { userId: string }): Promise<string> {
  return new SignJWT({ sub: payload.userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(encoder.encode(JWT_SECRET));
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    if (typeof payload.sub === 'string') return { userId: payload.sub };
    return null;
  } catch {
    return null;
  }
}

/** 在 Route Handler / Server Component 中设置登录 Cookie */
export function setAuthCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAuthCookie() {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

/** 在 Server Component / Route Handler 中获取当前用户(不存在返回 null) */
export async function getCurrentUser(): Promise<DBUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  return user;
}

/** 必须登录,否则抛 401 — 供 Route Handler 使用 */
export async function requireUser(): Promise<DBUser> {
  const u = await getCurrentUser();
  if (!u) {
    throw new HttpError(401, '请先登录');
  }
  return u;
}

/** 判断用户当前是否 VIP */
export function isVipActive(user: { vipExpireAt: Date | null; vipLifetime: boolean }): boolean {
  if (user.vipLifetime) return true;
  if (!user.vipExpireAt) return false;
  return user.vipExpireAt.getTime() > Date.now();
}

/**
 * 必须是管理员(admin 或 moderator)。用于所有 /api/admin/* 路由。
 * 默认要求 admin,moderator 传 { allowModerator: true } 通过。
 */
export async function requireAdmin(opts: { allowModerator?: boolean } = {}): Promise<DBUser> {
  const u = await requireUser();
  const role = (u as { role?: string }).role;
  const ok =
    role === 'admin' ||
    (opts.allowModerator === true && role === 'moderator');
  if (!ok) {
    throw new HttpError(403, '需要管理员权限');
  }
  return u;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
