import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { locales } from '@/i18n/config';

export const dynamic = 'force-dynamic';

const Body = z.object({
  locale: z.enum(locales as unknown as [string, ...string[]]),
});

/** PATCH /api/users/me/locale  { locale }
 *   未登录用户可调用但不写 DB(cookie 由前端自己写)。
 */
export const PATCH = handler(async (req) => {
  const me = await getCurrentUser();
  const body = Body.parse(await req.json());
  if (!me) return { ok: true, locale: body.locale };
  await prisma.user.update({
    where: { id: me.id },
    data: { locale: body.locale },
  });
  return { ok: true, locale: body.locale };
});

/** GET /api/users/me/locale */
export const GET = handler(async () => {
  const me = await getCurrentUser();
  if (!me) return fail(401, '未登录');
  const u = await prisma.user.findUnique({ where: { id: me.id }, select: { locale: true } });
  return { locale: u?.locale ?? 'zh-CN' };
});
