import { Prisma, type Species, type SpeciesContribution } from '@prisma/client';
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { parseJsonArray } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';
import { incrementSpeciesDailyStat } from '@/lib/species-daily-stats';
import { parseSpeciesGallery, stringifySpeciesGallery, type SpeciesGalleryItem } from '@/lib/species-gallery';

export const dynamic = 'force-dynamic';

const Body = z.object({
  status: z.enum(['approved', 'rejected']),
  applyToSpecies: z.boolean().optional(),
  applyOptions: z.object({
    images: z.array(z.string().url()).max(9).optional(),
    cover: z.string().url().optional(),
  }).optional(),
  reviewNote: z.string().max(500).optional(),
});

function pickId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const index = parts.indexOf('contributions');
  return parts[index + 1]!;
}

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const body = Body.parse(await req.json());

  const exists = await prisma.speciesContribution.findUnique({
    where: { id },
    include: { species: true },
  });
  if (!exists) return fail(404, '投稿不存在');

  let applied = false;
  if (body.status === 'approved' && body.applyToSpecies) {
    const data = buildSpeciesUpdate(exists, body.applyOptions);
    if (data) {
      await prisma.species.update({
        where: { id: exists.speciesId },
        data,
      });
      applied = true;
    }
  }

  if (body.status === 'approved') {
    await incrementSpeciesDailyStat(exists.speciesId, 'contributions');
  }

  const row = await prisma.speciesContribution.update({
    where: { id },
    data: {
      status: body.status,
      reviewedBy: me.id,
      reviewedAt: new Date(),
    },
  });

  await logAdmin({
    actorId: me.id,
    action: `species.contribution.${body.status}`,
    targetType: 'speciesContribution',
    targetId: id,
    meta: {
      speciesId: exists.speciesId,
      speciesName: exists.species.name,
      type: exists.type,
      applied,
      reviewNote: body.reviewNote?.trim() || undefined,
    },
  });

  return { id: row.id, status: row.status, applied };
});

type ContributionWithSpecies = SpeciesContribution & { species: Species };

function buildSpeciesUpdate(
  item: ContributionWithSpecies,
  applyOptions?: { images?: string[]; cover?: string },
): Prisma.SpeciesUpdateInput | null {
  const payload = item.payload as {
    fieldName?: string;
    suggestedValue?: string;
    content?: string;
    images?: string[];
    stage?: string;
    note?: string;
  };

  const type = String(item.type);

  if (type === 'image' || type === 'growth_image' || type === 'gallery_image') {
    const submitted = Array.isArray(payload.images) ? payload.images.filter(Boolean) : [];
    const picked = Array.isArray(applyOptions?.images) && applyOptions.images.length > 0
      ? applyOptions.images.filter((url) => submitted.includes(url))
      : submitted;
    const incoming = unique(picked);
    if (incoming.length === 0) return null;

    const gallery = parseSpeciesGallery(item.species.gallery);
    const current = gallery.items;
    const additions: SpeciesGalleryItem[] = incoming.map((url, index) => ({
      url,
      category: payload.stage?.trim() || undefined,
      note: payload.note?.trim() || undefined,
      contributorId: item.userId,
      approvedAt: new Date().toISOString(),
      orderIdx: current.length + index,
    }));
    const data: Prisma.SpeciesUpdateInput = {
      gallery: stringifySpeciesGallery({
        ...gallery,
        items: uniqueGalleryItems([...current, ...additions]).slice(0, 60),
      }),
    };
    if (applyOptions?.cover && incoming.includes(applyOptions.cover)) {
      data.cover = applyOptions.cover;
    }
    return data;
  }

  if (type === 'care_tip') {
    const text = payload.content?.trim();
    if (!text) return null;
    const current = parseJsonArray(item.species.tips);
    return { tips: JSON.stringify(unique([...current, text]).slice(0, 80)) };
  }

  if (type === 'morphology') {
    const text = payload.content?.trim();
    if (!text) return null;
    const current = item.species.description?.trim();
    return {
      description: current ? `${current}\n\n${text}` : text,
    };
  }

  if (type === 'correction') {
    const key = normalizeFieldName(payload.fieldName);
    const value = payload.suggestedValue?.trim();
    if (!key || !value) return null;
    return { [key]: value } as Prisma.SpeciesUpdateInput;
  }

  return null;
}

function normalizeFieldName(raw?: string) {
  const text = (raw ?? '').trim().toLowerCase();
  const map: Record<string, keyof Prisma.SpeciesUpdateInput> = {
    中文名: 'name',
    名称: 'name',
    拉丁名: 'latinName',
    拉丁学名: 'latinName',
    别名: 'alias',
    描述: 'description',
    原产地: 'originRegion',
    花期: 'blooming',
    生长型: 'growthType',
    生长类型: 'growthType',
    生长速度: 'growthSpeed',
    夏眠: 'summerDormancy',
    光照: 'light',
    光照需求: 'lightRequirement',
    浇水: 'watering',
    耐寒: 'hardiness',
    最低温度: 'minTemperature',
    最高温度: 'maxTemperature',
    适宜温度: 'idealTemperature',
    湿度: 'humidity',
    适宜湿度: 'humidity',
    配土: 'soil',
    配土建议: 'soil',
  };
  return map[text];
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function uniqueGalleryItems(items: SpeciesGalleryItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
