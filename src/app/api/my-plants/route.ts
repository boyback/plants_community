import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CreateBody = z.object({
  speciesId: z.string().min(1),
  nickname: z.string().trim().min(1).max(50),
  acquiredAt: z.string().min(1),
  status: z.enum(['healthy', 'watching', 'needs_attention', 'dormant', 'ended']).default('healthy'),
  currentStage: z.enum([
    'germinate',
    'growing',
    'flowering',
    'fruiting',
    'withering',
    'repot',
    'cutting',
    'summer',
    'winter',
    'pest',
    'watering',
    'other',
  ]).default('growing'),
  currentStageLabel: z.string().trim().max(50).optional(),
  note: z.string().trim().max(1000).optional(),
}).superRefine((body, ctx) => {
  if (body.currentStage === 'other' && !body.currentStageLabel?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['currentStageLabel'],
      message: '选择其他阶段时，请填写阶段名称',
    });
  }
});

export const GET = handler(async () => {
  const me = await requireUser();

  const plants = await prisma.userPlant.findMany({
    where: { ownerId: me.id },
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      species: {
        include: {
          genus: {
            include: {
              board: true,
            },
          },
        },
      },
      journal: {
        select: {
          id: true,
          postId: true,
          post: {
            select: {
              deleted: true,
            },
          },
        },
      },
    },
  });

  return plants.map((plant) => ({
    id: plant.id,
    code: plant.code,
    nickname: plant.nickname,
    acquiredAt: plant.acquiredAt.toISOString(),
    status: plant.status,
    currentStage: plant.currentStage,
    currentStageLabel: plant.currentStageLabel ?? '',
    cover: plant.cover ?? plant.species.cover,
    note: plant.note ?? '',
    journalCount: plant.journal && !plant.journal.post.deleted ? 1 : 0,
    journalPostId: plant.journal && !plant.journal.post.deleted ? plant.journal.postId : null,
    species: {
      id: plant.species.id,
      name: plant.species.name,
      latinName: plant.species.latinName,
      cover: plant.species.cover,
      familyName: plant.species.genus.board?.name ?? '未分类',
      familySlug: plant.species.genus.board?.slug ?? '',
      genusName: plant.species.genus.name,
      genusSlug: plant.species.genus.slug,
      speciesSlug: plant.species.slug,
    },
  }));
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = CreateBody.parse(await req.json());

  const species = await prisma.species.findUnique({
    where: { id: body.speciesId },
    select: { id: true, cover: true },
  });
  if (!species) return fail(400, '品种不存在');

  const code = await createUniquePlantCode();
  const plant = await prisma.userPlant.create({
    data: {
      ownerId: me.id,
      speciesId: species.id,
      code,
      nickname: body.nickname,
      acquiredAt: new Date(body.acquiredAt),
      status: body.status,
      currentStage: body.currentStage,
      currentStageLabel: body.currentStage === 'other' ? body.currentStageLabel || null : null,
      cover: species.cover,
      note: body.note || null,
    },
    include: {
      species: {
        include: {
          genus: {
            include: {
              board: true,
            },
          },
        },
      },
      journal: {
        select: {
          id: true,
          postId: true,
          post: {
            select: {
              deleted: true,
            },
          },
        },
      },
    },
  });

  return {
    id: plant.id,
    code: plant.code,
    nickname: plant.nickname,
    acquiredAt: plant.acquiredAt.toISOString(),
    status: plant.status,
    currentStage: plant.currentStage,
    currentStageLabel: plant.currentStageLabel ?? '',
    cover: plant.cover ?? plant.species.cover,
    note: plant.note ?? '',
    journalCount: plant.journal && !plant.journal.post.deleted ? 1 : 0,
    journalPostId: plant.journal && !plant.journal.post.deleted ? plant.journal.postId : null,
    species: {
      id: plant.species.id,
      name: plant.species.name,
      latinName: plant.species.latinName,
      cover: plant.species.cover,
      familyName: plant.species.genus.board?.name ?? '未分类',
      familySlug: plant.species.genus.board?.slug ?? '',
      genusName: plant.species.genus.name,
      genusSlug: plant.species.genus.slug,
      speciesSlug: plant.species.slug,
    },
  };
});

async function createUniquePlantCode() {
  for (let i = 0; i < 5; i += 1) {
    const date = new Date();
    const ymd = date.toISOString().slice(2, 10).replace(/-/g, '');
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `PL-${ymd}-${suffix}`;
    const exists = await prisma.userPlant.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  return `PL-${Date.now().toString(36).toUpperCase()}`;
}
