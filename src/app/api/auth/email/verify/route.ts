/**
 * POST /api/auth/email/verify
 *
 * 仅校验邮箱验证码,通过后内存里标记该邮箱「已验证」5 分钟。
 * 之后调用方在 /api/auth/register 用同一个邮箱注册时,后端自动信任。
 *
 * Body: { email, code }
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { verifyEmailCode } from '@/lib/otp';

const Body = z.object({
  email: z.string().email('邮箱格式不正确'),
  code: z.string().regex(/^\d{6}$/, '验证码格式不正确'),
});

export const POST = handler(async (req) => {
  const { email, code } = Body.parse(await req.json());
  const v = verifyEmailCode(email, code);
  if (!v.ok) return fail(401, v.reason || '验证失败');
  return { ok: true };
});
