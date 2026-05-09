/**
 * 站点全局配置(目前只覆盖品种现场照相关)
 *   GET   /api/admin/site-config
 *   PATCH /api/admin/site-config
 */
import { z } from 'zod';
import { handler } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { getSiteConfig, setSiteConfig } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

const PatchBody = z.object({
  photoUploadMinLevel: z.number().int().min(1).max(10).optional(),
  photoUploadVipOnly: z.boolean().optional(),
  photoModeration: z.enum(['auto', 'manual']).optional(),
});

export const GET = handler(async () => {
  await requireAdmin({ allowModerator: true });
  return getSiteConfig(true);
});

export const PATCH = handler(async (req) => {
  await requireAdmin();
  const body = PatchBody.parse(await req.json());
  const next = await setSiteConfig(body);
  return next;
});
