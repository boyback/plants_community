/**
 * POST /api/auth/login
 *
 * 账号 + 密码登录。
 * 「账号」字段优先按 handle 匹配,兼容老用户用 name(显示名)登录。
 *
 * Body: { account, password } 或兼容老的 { name, password }
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { setAuthCookie, signToken, verifyPassword } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';
import { normalizeHandle } from '@/lib/handle';

const Body = z.object({
  /** 账号 — handle 或 name(老用户兼容) */
  account: z.string().min(1).optional(),
  /** 兼容老前端字段 */
  name: z.string().min(1).optional(),
  password: z.string().min(1),
});

export const POST = handler(async (req) => {
  const body = Body.parse(await req.json());
  const account = (body.account ?? body.name ?? '').trim();
  if (!account) return fail(400, '请输入账号');

  // 1) 先按 handle 查(优先)
  const handle = normalizeHandle(account);
  let user = await prisma.user.findUnique({
    where: { handle },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });

  // 2) 没有则按 name 查(兼容老用户用「显示名」登录)
  if (!user) {
    user = await prisma.user.findUnique({
      where: { name: account },
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    });
  }

  if (!user) return fail(401, '账号或密码错误');

  // 第三方登录用户(微信)无密码,密码登录路径不可用
  if (!user.passwordHash) {
    return fail(401, '该账号是第三方登录账号,请使用对应方式登录');
  }

  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) return fail(401, '账号或密码错误');

  const token = await signToken({ userId: user.id });
  setAuthCookie(token);

  return serializeUser(user);
});
