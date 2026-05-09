/**
 * 当前用户的个人资料编辑
 *
 *   PATCH /api/users/me/profile
 *   body: { avatar?: string, bio?: string, name?: string }
 *
 * 限制:
 *   - avatar:必须是 /uploads/... 或本站 CDN(cdn.plantcommunity.cn)或 /default-avatar.svg
 *     拒绝任何外站图片(避免被滥用为图床 / 含恶意外链)
 *   - bio:最大 200 字
 *   - name:2-24 位,且不能与他人重复
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

const Body = z
  .object({
    avatar: z.string().min(1).max(1000).optional(),
    bio: z.string().max(200).optional(),
    name: z.string().min(2).max(24).optional(),
  })
  .strict();

/** 允许的 avatar 源:本站相对路径 / 七牛 CDN 域名 */
function isValidAvatarUrl(url: string, cdnDomain?: string): boolean {
  if (url.startsWith('/uploads/')) return true;
  if (url === '/default-avatar.svg') return true;
  if (cdnDomain) {
    try {
      const u = new URL(url);
      const allowed = new URL(cdnDomain).host;
      if (u.host === allowed) return true;
    } catch {
      // 解析失败不通过
    }
  }
  return false;
}

export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());

  const data: Record<string, unknown> = {};

  if (body.avatar !== undefined) {
    if (!isValidAvatarUrl(body.avatar, process.env.QINIU_DOMAIN)) {
      return fail(
        400,
        '头像只能用站内上传的图片(七牛 CDN 或本站 /uploads/),不允许外链'
      );
    }
    data.avatar = body.avatar;
  }

  if (body.bio !== undefined) {
    data.bio = body.bio.trim() || null;
  }

  if (body.name !== undefined && body.name !== me.name) {
    const exists = await prisma.user.findUnique({ where: { name: body.name } });
    if (exists) return fail(409, '用户名已被占用');
    data.name = body.name;
  }

  if (Object.keys(data).length === 0) {
    return { ok: true, changed: false };
  }

  const user = await prisma.user.update({
    where: { id: me.id },
    data,
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });

  return { ok: true, user: serializeUser(user) };
});
