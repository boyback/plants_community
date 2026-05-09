/**
 * POST /api/auth/sms/login
 *
 * 校验短信验证码:
 *   - 通过则按 phone 找用户;找不到则自动创建新用户
 *   - 签 JWT cookie 完成登录
 *
 * Body: { phone, code }
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { setAuthCookie, signToken } from '@/lib/auth';
import { verifyCode } from '@/lib/sms';
import { generateUniqueName } from '@/lib/wechat-login';
import { serializeUser } from '@/lib/serializers';

const Body = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  code: z.string().regex(/^\d{6}$/, '验证码格式不正确'),
});

export const POST = handler(async (req) => {
  const { phone, code } = Body.parse(await req.json());

  const v = verifyCode(phone, code);
  if (!v.ok) return fail(401, v.reason || '验证失败');

  // 查 / 建 用户
  let user = await prisma.user.findUnique({
    where: { phone },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });

  if (!user) {
    // 默认 name:手机号脱敏(13800001234 → 用户_1234)
    const tail = phone.slice(-4);
    const name = await generateUniqueName(`用户_${tail}`, '用户');
    const created = await prisma.user.create({
      data: {
        name,
        passwordHash: null,
        avatar: '/default-avatar.svg',
        bio: '',
        phone,
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
