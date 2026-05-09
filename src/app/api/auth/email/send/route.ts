/**
 * POST /api/auth/email/send
 *
 * 发送邮箱验证码(同邮箱 60s/封,1h 最多 5 封)
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { sendEmailCode } from '@/lib/otp';

const Body = z.object({
  email: z.string().email('邮箱格式不正确'),
});

export const POST = handler(async (req) => {
  const { email } = Body.parse(await req.json());
  const r = await sendEmailCode(email);
  if (!r.ok) {
    return fail(429, r.error || '发送失败', { retryAfter: r.retryAfter });
  }
  return { ok: true };
});
