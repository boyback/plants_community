import { z } from 'zod';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PlantPatch = z.object({
  speciesId: z.string().min(1),
  nickname: z.string().trim().min(1).max(50),
  acquiredAt: z.string().min(1),
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
  ]),
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

export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const body = PlantPatch.parse(await req.json());

  const [plant, species] = await Promise.all([
    prisma.userPlant.findFirst({ where: { id, ownerId: me.id }, select: { id: true } }),
    prisma.species.findUnique({ where: { id: body.speciesId }, select: { id: true, cover: true } }),
  ]);

  if (!plant) return fail(404, '植物档案不存在');
  if (!species) return fail(400, '品种不存在');

  const updated = await prisma.userPlant.update({
    where: { id },
    data: {
      speciesId: species.id,
      nickname: body.nickname,
      acquiredAt: new Date(body.acquiredAt),
      currentStage: body.currentStage,
      currentStageLabel: body.currentStage === 'other' ? body.currentStageLabel || null : null,
      note: body.note || null,
      cover: species.cover,
    },
    select: { id: true },
  });

  return updated;
});

function pickId(req: Request) {
  const url = new URL(req.url);
  return url.pathname.split('/').filter(Boolean).pop()!;
}
