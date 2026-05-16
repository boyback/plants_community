import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * 关注 / 取消关注 某个三级板块节点。
 * 三种定位方式(任一):
 *   - { type: 'board', slug: 'jingtian' }
 *   - { type: 'genus',    slug: 'echeveria', categorySlug?: 'jingtian' }  // 可选 category 消歧
 *   - { type: 'species',  slug: 'longyue',   genusSlug?: 'graptopetalum' }
 *
 * POST → 关注(幂等);DELETE → 取消关注。
 */
const Body = z.object({
  type: z.enum(['board', 'genus', 'species']),
  slug: z.string(),
  categorySlug: z.string().optional(),
  genusSlug: z.string().optional(),
});

async function resolveTargetId(body: z.infer<typeof Body>) {
  if (body.type === 'board') {
    const c = await prisma.board.findUnique({ where: { slug: body.slug } });
    return c?.id ?? null;
  }
  if (body.type === 'genus') {
    const g = await prisma.genus.findFirst({
      where: {
        slug: body.slug,
        ...(body.categorySlug ? { board: { slug: body.categorySlug } } : {}),
      },
    });
    return g?.id ?? null;
  }
  // species
  const s = await prisma.species.findFirst({
    where: {
      slug: body.slug,
      ...(body.genusSlug ? { genus: { slug: body.genusSlug } } : {}),
    },
  });
  return s?.id ?? null;
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());
  const targetId = await resolveTargetId(body);
  if (!targetId) return fail(404, '目标板块不存在');

  await prisma.boardFollow.upsert({
    where: {
      userId_type_targetId: {
        userId: me.id,
        type: body.type,
        targetId,
      },
    },
    create: { userId: me.id, type: body.type, targetId },
    update: {},
  });
  return { ok: true };
});

export const DELETE = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());
  const targetId = await resolveTargetId(body);
  if (!targetId) return fail(404, '目标板块不存在');

  await prisma.boardFollow.deleteMany({
    where: { userId: me.id, type: body.type, targetId },
  });
  return { ok: true };
});
