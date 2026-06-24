import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';
import { processRichInput } from '@/lib/richtext';
import { processSpeciesDescriptionTabs } from '@/lib/species-description-tabs.server';
import { getSpeciesDescriptionTabs } from '@/lib/species-description-tabs';

export const dynamic = 'force-dynamic';

const Body = z.object({
  genusId: z.string().optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().min(1).max(80).optional(),
  latinName: z.string().min(1).max(120).optional(),
  alias: z.string().max(2000).optional(),
  description: z.string().max(12000).optional(),
  descriptionJson: z.unknown().optional(),
  descriptionText: z.string().optional(),
  descriptionTabs: z.unknown().optional(),
  cover: z.string().url().optional(),
  gallery: z.string().max(12000).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  light: z.string().max(60).optional(),
  watering: z.string().max(60).optional(),
  hardiness: z.string().max(60).optional(),
  tips: z.string().max(4000).optional(),
  blooming: z.string().max(60).nullable().optional(),
  originRegion: z.string().max(60).nullable().optional(),
  growthType: z.string().max(60).nullable().optional(),
  growthSpeed: z.string().max(60).nullable().optional(),
  summerDormancy: z.string().max(60).nullable().optional(),
  lightRequirement: z.string().max(80).nullable().optional(),
  idealTemperature: z.string().max(60).nullable().optional(),
  minTemperature: z.string().max(60).nullable().optional(),
  maxTemperature: z.string().max(60).nullable().optional(),
  humidity: z.string().max(60).nullable().optional(),
  soil: z.string().max(120).nullable().optional(),
  riskTips: z.string().max(4000).nullable().optional(),
});

function pickId(req: Request) {
  return new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
}

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const body = Body.parse(await req.json());
  const exists = await prisma.species.findUnique({ where: { id } });
  if (!exists) return fail(404, 'Species 不存在');

  if (body.slug && body.slug !== exists.slug) {
    const targetGenus = body.genusId ?? exists.genusId;
    const dup = await prisma.species.findUnique({
      where: { genusId_slug: { genusId: targetGenus, slug: body.slug } },
    });
    if (dup && dup.id !== id) return fail(400, `slug "${body.slug}" 在该属下已存在`);
  }

  const {
    descriptionJson: rawDescriptionJson,
    descriptionText: _descriptionText,
    descriptionTabs: rawDescriptionTabs,
    genusId,
    ...bodyData
  } = body;
  const data: Prisma.SpeciesUpdateInput = { ...bodyData };
  if (genusId) {
    data.genus = { connect: { id: genusId } };
  }
  if (
    body.descriptionTabs !== undefined ||
    body.descriptionJson !== undefined ||
    body.description !== undefined
  ) {
    const legacyDescription = processRichInput({
      json: rawDescriptionJson,
      html: body.description,
      text: body.description ?? exists.descriptionText ?? exists.description,
      textMaxLen: 1000,
    });
    const storedDescription = processSpeciesDescriptionTabs(
      Array.isArray(rawDescriptionTabs)
        ? rawDescriptionTabs
        : getSpeciesDescriptionTabs(rawDescriptionTabs ?? exists.descriptionTabs, {
          description: legacyDescription.html || exists.description,
          descriptionJson: legacyDescription.json || exists.descriptionJson,
          descriptionText: legacyDescription.text || exists.descriptionText,
        }),
      Array.isArray(rawDescriptionTabs) ? undefined : {
        description: legacyDescription.html || exists.description,
        descriptionJson: legacyDescription.json || exists.descriptionJson,
        descriptionText: legacyDescription.text || exists.descriptionText,
      }
    );
    data.description = storedDescription.description;
    data.descriptionJson = storedDescription.descriptionJson;
    data.descriptionText = storedDescription.descriptionText;
    data.descriptionTabs = JSON.stringify(storedDescription.tabs);
  }

  await prisma.species.update({ where: { id }, data });
  await logAdmin({
    actorId: me.id,
    action: 'species.update',
    targetType: 'species',
    targetId: id,
    meta: data,
  });
  return { ok: true };
});

export const DELETE = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const exists = await prisma.species.findUnique({
    where: { id },
    include: { _count: { select: { posts: true, ratings: true } } },
  });
  if (!exists) return fail(404, 'Species 不存在');
  if (exists._count.posts > 0) {
    return fail(400, `该品种下还有 ${exists._count.posts} 个帖子`);
  }
  // ratings 走级联删,不阻拦
  await prisma.species.delete({ where: { id } });
  await logAdmin({
    actorId: me.id,
    action: 'species.delete',
    targetType: 'species',
    targetId: id,
    meta: { slug: exists.slug, name: exists.name, ratings: exists._count.ratings },
  });
  return { ok: true };
});
