import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { setAuthCookie, signToken, verifyPassword } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';

const Body = z.object({
  name: z.string().min(1),
  password: z.string().min(1),
});

export const POST = handler(async (req) => {
  const body = Body.parse(await req.json());

  const user = await prisma.user.findUnique({
    where: { name: body.name },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });

  if (!user) return fail(401, '用户名或密码错误');

  // 第三方登录用户(微信)无密码,密码登录路径不可用
  if (!user.passwordHash) {
    return fail(401, '该账号是微信登录账号,请使用微信登录或先在「设置」中设置密码');
  }

  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) return fail(401, '用户名或密码错误');

  const token = await signToken({ userId: user.id });
  setAuthCookie(token);

  return serializeUser(user);
});
