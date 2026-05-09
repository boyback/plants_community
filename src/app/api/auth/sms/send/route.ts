/**
 * POST /api/auth/sms/send
 *
 * 发送短信验证码到指定手机号。
 * 同手机号 60s 限频,1h 内最多 5 条。
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { sendSmsCode } from '@/lib/sms';

const Body = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
});

export const POST = handler(async (req) => {
  const { phone } = Body.parse(await req.json());
  const r = await sendSmsCode(phone);
  if (!r.ok) {
    return fail(429, r.error || '发送失败', { retryAfter: r.retryAfter });
  }
  return { ok: true };
});
