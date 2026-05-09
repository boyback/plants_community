/**
 * POST /api/admin/species   新建品种
 * (列表查询走 /api/admin/species 已有的 GET? 没有,这里也支持下)
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  genusId: z.string().min(1),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  latinName: z.string().min(1).max(120),
  alias: z.string().max(2000).default('[]'), // JSON array
  description: z.string().max(2000),
  cover: z.string().url(),
  gallery: z.string().max(4000).default('[]'), // JSON array
  difficulty: z.number().int().min(1).max(5).default(2),
  light: z.string().max(60),
  watering: z.string().max(60),
  hardiness: z.string().max(60),
  tips: z.string().max(4000).default('[]'), // JSON array
  blooming: z.string().max(60).nullable().optional(),
  originRegion: z.string().max(60).nullable().optional(),
  growthType: z.string().max(60).nullable().optional(),
});

export const POST = handler(async (req) => {
  const me = await requireAdmin();
  const body = Body.parse(await req.json());

  const genus = await prisma.genus.findUnique({ where: { id: body.genusId } });
  if (!genus) return fail(404, 'Genus 不存在');

  const dup = await prisma.species.findUnique({
    where: { genusId_slug: { genusId: body.genusId, slug: body.slug } },
  });
  if (dup) return fail(400, `slug "${body.slug}" 在该属下已存在`);

  const row = await prisma.species.create({ data: body });
  await logAdmin({
    actorId: me.id,
    action: 'species.create',
    targetType: 'species',
    targetId: row.id,
    meta: { slug: row.slug, name: row.name, genusId: row.genusId },
  });
  return row;
});
