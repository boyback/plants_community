import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { COOKIE_MAX_AGE, COOKIE_NAME, setAuthCookie, signToken, verifyPassword } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';
import { normalizeHandle } from '@/lib/handle';

const Body = z.object({
  account: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(1),
});

export const POST = handler(async (req) => {
  const body = Body.parse(await req.json());
  const account = (body.account ?? body.name ?? '').trim();
  if (!account) return fail(400, '请输入账号');

  const handle = normalizeHandle(account);
  let user = await prisma.user.findUnique({
    where: { handle },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });

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
  if (!user.passwordHash) return fail(401, '该账号是第三方登录账号，请使用对应方式登录');

  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) return fail(401, '账号或密码错误');

  const token = await signToken({ userId: user.id });
  setAuthCookie(token);

  return {
    user: serializeUser(user),
    auth: {
      cookieName: COOKIE_NAME,
      token,
      maxAge: COOKIE_MAX_AGE,
    },
  };
});
