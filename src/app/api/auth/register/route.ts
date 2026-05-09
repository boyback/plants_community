import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { hashPassword, setAuthCookie, signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';

const Body = z.object({
  name: z.string().min(2, '用户名至少 2 位').max(24, '用户名最多 24 位'),
  password: z.string().min(6, '密码至少 6 位').max(64),
});

/** 默认头像:本站静态资源,所有新用户用这一张,注册后可在设置页改 */
const DEFAULT_AVATAR = '/default-avatar.svg';

export const POST = handler(async (req) => {
  const body = Body.parse(await req.json());

  const exists = await prisma.user.findUnique({ where: { name: body.name } });
  if (exists) return fail(409, '用户名已被占用');

  const user = await prisma.user.create({
    data: {
      name: body.name,
      passwordHash: await hashPassword(body.password),
      avatar: DEFAULT_AVATAR,
      bio: '新加入的肉友 🌱',
      level: 1,
    },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });

  const token = await signToken({ userId: user.id });
  setAuthCookie(token);

  return serializeUser(user);
});
