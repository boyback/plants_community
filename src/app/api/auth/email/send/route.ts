/**
 * POST /api/auth/email/send
 *
 * 发送邮箱验证码。
 * Body: { email, purpose? }
 *   purpose='register' (默认): 要求邮箱**未**注册;若已注册返 409
 *   purpose='login'           : 要求邮箱**已**注册(找回密码 / 邮箱登录用)
 *
 * 限频:同邮箱 60s/封,1h 最多 5 封
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { sendEmailCode } from '@/lib/otp';

const Body = z.object({
  email: z.string().email('邮箱格式不正确'),
  purpose: z.enum(['register', 'login']).default('register'),
});

export const POST = handler(async (req) => {
  const { email, purpose } = Body.parse(await req.json());
  const normalized = email.toLowerCase();

  // 提前检查邮箱是否已注册,避免白发验证码
  const exist = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });

  if (purpose === 'register' && exist) {
    return fail(409, '该邮箱已注册,请直接登录');
  }
  if (purpose === 'login' && !exist) {
    return fail(404, '该邮箱未注册,请先注册');
  }

  const r = await sendEmailCode(normalized);
  if (!r.ok) {
    return fail(429, r.error || '发送失败', { retryAfter: r.retryAfter });
  }
  return { ok: true };
});
