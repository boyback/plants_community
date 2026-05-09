/**
 * POST /api/auth/register
 *
 * 一步注册:邮箱 + 验证码(预先验过) + handle + 密码 + 显示名
 *
 * 前置:必须先调 POST /api/auth/email/verify 验证过邮箱(5 分钟内)
 *
 * 用户体验:
 *   1. 注册页:[邮箱] → 点「获取验证码」→ 收件箱拿到 6 位
 *   2. 同一页:[验证码] → 点「校验验证码」(后端 mark verified 5min)
 *   3. 同一页:[handle] [密码] [显示名(可选)] → 点「完成注册」
 *
 * 实际前端可以做成自动:验证码输完即调 verify,然后高亮 handle/密码字段。
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { hashPassword, setAuthCookie, signToken } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';
import { consumeVerifiedEmail } from '@/lib/otp';
import { validateHandleFormat, normalizeHandle } from '@/lib/handle';
import { fireSendMail } from '@/lib/email-mailer';
import { welcomeEmail } from '@/lib/email-templates';

const Body = z.object({
  email: z.string().email('邮箱格式不正确'),
  handle: z.string().min(6, '账号至少 6 位').max(20, '账号最多 20 位'),
  password: z.string().min(6, '密码至少 6 位').max(64),
  /** 显示名 / 昵称(可选,默认用 handle 同名) */
  displayName: z.string().min(1).max(24).optional(),
});

const DEFAULT_AVATAR = '/default-avatar.svg';

export const POST = handler(async (req) => {
  const body = Body.parse(await req.json());
  const email = body.email.toLowerCase();

  // 1) 邮箱必须最近 5min 内通过过验证
  if (!consumeVerifiedEmail(email)) {
    return fail(401, '请先验证邮箱(/api/auth/email/verify)');
  }

  // 2) handle 格式 + 唯一性
  const handleFormatErr = validateHandleFormat(body.handle);
  if (handleFormatErr) return fail(400, handleFormatErr);
  const handle = normalizeHandle(body.handle);

  // 3) 唯一性:email + handle + 显示名(显示名作为 name 字段也唯一)
  const [byEmail, byHandle] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { handle }, select: { id: true } }),
  ]);
  if (byEmail) return fail(409, '该邮箱已注册');
  if (byHandle) return fail(409, '该账号已被占用');

  const displayName = body.displayName?.trim() || handle;
  // name 字段在数据库里 unique,要单独检查
  const byName = await prisma.user.findUnique({
    where: { name: displayName },
    select: { id: true },
  });
  // name 冲突就退化用 handle(handle 此时一定 unique)
  const finalName = byName ? handle : displayName;

  // 4) 创建
  const user = await prisma.user.create({
    data: {
      name: finalName,
      handle,
      email,
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

  // 5) 签 JWT 自动登录
  const token = await signToken({ userId: user.id });
  setAuthCookie(token);

  // 6) 异步发欢迎邮件
  const tpl = welcomeEmail({ userName: user.name, userId: user.id });
  fireSendMail({ to: email, ...tpl });

  return serializeUser(user);
});
