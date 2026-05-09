/**
 * POST /api/auth/email/login
 *
 * 校验邮箱验证码:
 *   - 通过则按 email 找用户;找不到则自动创建新用户
 *   - 签 JWT cookie
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { setAuthCookie, signToken } from '@/lib/auth';
import { verifyEmailCode } from '@/lib/otp';
import { generateUniqueName } from '@/lib/wechat-login';
import { serializeUser } from '@/lib/serializers';

const Body = z.object({
  email: z.string().email('邮箱格式不正确'),
  code: z.string().regex(/^\d{6}$/, '验证码格式不正确'),
});

export const POST = handler(async (req) => {
  const { email, code } = Body.parse(await req.json());

  const v = verifyEmailCode(email, code);
  if (!v.ok) return fail(401, v.reason || '验证失败');

  const normalizedEmail = email.toLowerCase();

  // 查 / 建 用户
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });

  if (!user) {
    // name 默认用邮箱前缀(@ 之前部分),冲突自动追加随机后缀
    const localPart = normalizedEmail.split('@')[0] || '用户';
    const name = await generateUniqueName(localPart, '用户');
    const created = await prisma.user.create({
      data: {
        name,
        passwordHash: null,
        avatar: '/default-avatar.svg',
        bio: '',
        email: normalizedEmail,
      },
    });
    user = await prisma.user.findUnique({
      where: { id: created.id },
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    });
  }

  if (!user) return fail(500, '登录失败');

  const token = await signToken({ userId: user.id });
  setAuthCookie(token);

  return serializeUser(user);
});
