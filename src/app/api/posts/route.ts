import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, stringifyJson } from '@/lib/api';
import { requireUser, isVipActive } from '@/lib/auth';
import { serializePost } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';
import { hasPermission, type Permission } from '@/lib/levels';
import { emitEvent } from '@/lib/events';
import { processRichInput } from '@/lib/richtext';
import { postNeedsReview } from '@/lib/post-review';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

/**
 * 列表查询:支持在任一层级上过滤(?category=xxx / ?genus=xxx / ?species=xxx)。
 * 也保留旧的 ?board=xxx 参数(向后兼容)——同时匹配 Category/Genus/Species/Board 的 slug。
 */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const categorySlug = url.searchParams.get('category') ?? undefined;
  const genusSlug = url.searchParams.get('genus') ?? undefined;
  const speciesSlug = url.searchParams.get('species') ?? undefined;
  const legacyBoard = url.searchParams.get('board') ?? undefined;
  const authorId = url.searchParams.get('author') ?? undefined;
  const sort = url.searchParams.get('sort') ?? 'recommend'; // recommend | latest | hot
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '24'), 100);
  const cursor = url.searchParams.get('cursor') ?? undefined;

  // 公开列表默认仅展示已发布(隐藏 pending/rejected/deleted)
  const where: Record<string, unknown> = {
    deleted: false,
    ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
    ...(authorId ? { authorId } : {}),
  };
  if (categorySlug) where.category = { slug: categorySlug };
  if (genusSlug) where.genus = { slug: genusSlug };
  if (speciesSlug) where.species = { slug: speciesSlug };
  // 旧 board slug 兼容:同时尝试 category/genus/species
  if (legacyBoard && !categorySlug && !genusSlug && !speciesSlug) {
    where.OR = [
      { category: { slug: legacyBoard } },
      { genus: { slug: legacyBoard } },
      { species: { slug: legacyBoard } },
      { board: { slug: legacyBoard } },
    ];
  }

  const orderBy =
    sort === 'latest'
      ? [{ createdAt: 'desc' as const }]
      : sort === 'hot'
      ? [{ views: 'desc' as const }, { createdAt: 'desc' as const }]
      : [{ createdAt: 'desc' as const }];

  const list = await prisma.post.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: postInclude(),
  });

  let nextCursor: string | null = null;
  if (list.length > limit) {
    const next = list.pop()!;
    nextCursor = next.id;
  }

  return {
    items: list.map(serializePost),
    nextCursor,
  };
});

/**
 * 发布新帖:支持三种板块定位方式:
 *   - speciesSlug:挂到品种(三级)
 *   - genusSlug:挂到属(二级)
 *   - categorySlug:挂到科(一级)
 *   - boardSlug(向后兼容):按 legacy board / category 查找
 * 其中至少需提供一个。自动推导上级并写入 categoryId/genusId/speciesId。
 */
const JournalEntryInput = z.object({
  entryDate: z.string(), // ISO
  stage: z
    .enum([
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
    ])
    .default('other'),
  note: z.string().max(2000).default(''),
  images: z.array(z.string()).max(9).default([]),
});

const CreateBody = z
  .object({
    type: z.enum(['rich', 'short', 'vote', 'video', 'event', 'journal']),
    // 板块定位(任一)
    categorySlug: z.string().optional(),
    genusSlug: z.string().optional(),
    speciesSlug: z.string().optional(),
    boardSlug: z.string().optional(), // 向后兼容
    title: z.string().min(1).max(100),
    content: z.unknown().optional(),
    contentJson: z.unknown().optional(),
    tags: z.array(z.string()).max(10).default([]),
    images: z.array(z.string()).max(9).optional(),
    videoUrl: z.string().url().optional(),
    vote: z
      .object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).min(2).max(8),
        multi: z.boolean().default(false),
        deadline: z.string(),
      })
      .optional(),
    event: z
      .object({
        location: z.string().min(1),
        startAt: z.string(),
        endAt: z.string().optional(),
      })
      .optional(),
    journal: z
      .object({
        subjectName: z.string().min(1).max(50),
        startDate: z.string(),
        speciesId: z.string().optional(),
        entries: z.array(JournalEntryInput).max(50).default([]),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.categorySlug && !data.genusSlug && !data.speciesSlug && !data.boardSlug)
      ctx.addIssue({ code: 'custom', message: '必须指定一个板块' });
    if (data.type === 'vote' && !data.vote)
      ctx.addIssue({ code: 'custom', message: '投票贴必须包含 vote 字段' });
    if (data.type === 'event' && !data.event)
      ctx.addIssue({ code: 'custom', message: 'EVENT 贴必须包含 event 字段' });
    if (data.type === 'video' && !data.videoUrl)
      ctx.addIssue({ code: 'custom', message: '视频贴必须包含 videoUrl' });
    if (data.type === 'journal' && !data.journal)
      ctx.addIssue({ code: 'custom', message: '成长日记贴必须包含 journal 字段' });
  });

type ResolvedIds = {
  categoryId: string | null;
  genusId: string | null;
  speciesId: string | null;
  boardId: string | null;
};
type ResolveResult = { ok: true; ids: ResolvedIds } | { ok: false; error: string };

/** 根据入参解析出 categoryId / genusId / speciesId / boardId */
async function resolveBoardIds(body: z.infer<typeof CreateBody>): Promise<ResolveResult> {
  const ids: ResolvedIds = { categoryId: null, genusId: null, speciesId: null, boardId: null };

  if (body.speciesSlug) {
    const sp = await prisma.species.findFirst({
      where: { slug: body.speciesSlug },
      include: { genus: { include: { category: true } } },
    });
    if (!sp) return { ok: false, error: '指定的品种不存在' };
    ids.speciesId = sp.id;
    ids.genusId = sp.genusId;
    ids.categoryId = sp.genus.categoryId;
    return { ok: true, ids };
  }

  if (body.genusSlug) {
    const g = await prisma.genus.findFirst({
      where: { slug: body.genusSlug },
      include: { category: true },
    });
    if (!g) return { ok: false, error: '指定的属不存在' };
    ids.genusId = g.id;
    ids.categoryId = g.categoryId;
    return { ok: true, ids };
  }

  if (body.categorySlug) {
    const c = await prisma.category.findUnique({ where: { slug: body.categorySlug } });
    if (!c) return { ok: false, error: '指定的板块不存在' };
    ids.categoryId = c.id;
    return { ok: true, ids };
  }

  if (body.boardSlug) {
    const c = await prisma.category.findUnique({ where: { slug: body.boardSlug } });
    if (c) {
      ids.categoryId = c.id;
      return { ok: true, ids };
    }
    const legacy = await prisma.board.findUnique({ where: { slug: body.boardSlug } });
    if (legacy) {
      ids.boardId = legacy.id;
      const sameName = await prisma.category.findFirst({ where: { name: legacy.name } });
      if (sameName) ids.categoryId = sameName.id;
      return { ok: true, ids };
    }
    return { ok: false, error: '指定的板块不存在' };
  }

  return { ok: false, error: '必须指定板块' };
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = CreateBody.parse(await req.json());

  const isVip = isVipActive(me);
  const permMap: Record<typeof body.type, Permission> = {
    rich: 'post:rich',
    short: 'post:short',
    video: 'post:video',
    vote: 'post:vote',
    event: 'post:event',
    // journal 复用 rich 权限(通常 Lv.2+ 即可发)
    journal: 'post:rich',
  };
  const need = permMap[body.type];
  if (!hasPermission({ level: me.level, isVip }, need)) {
    return fail(403, `当前等级不允许发布该类型帖子,开通大会员或升级即可解锁`);
  }
  if (body.images && body.images.length > 0) {
    if (!hasPermission({ level: me.level, isVip }, 'post:image')) {
      return fail(403, '需要 Lv.4 以上才能在帖子里附图,开通大会员可解锁');
    }
  }

  const resolved = await resolveBoardIds(body);
  if (!resolved.ok) return fail(400, resolved.error);
  const { ids: resolvedIds } = resolved;

  const cover = body.images?.[0] ?? null;

  const isRich = body.type === 'rich' || body.type === 'event';
  const stored = processRichInput({
    json: isRich ? body.contentJson : undefined,
    html: isRich && typeof body.content === 'string' ? body.content : undefined,
    text: !isRich && typeof body.content === 'string' ? body.content : undefined,
    textMaxLen: 2000,
  });

  // 含外链 → 自动送审
  const needsReview = postNeedsReview({
    cover,
    images: body.images ?? [],
    videoUrl: body.videoUrl ?? null,
    content: stored.html,
  });

  const created = await prisma.post.create({
    data: {
      type: body.type,
      title: body.title,
      content: stored.html,
      contentJson: stored.json || null,
      contentText: stored.text,
      cover,
      images: stringifyJson(body.images ?? []),
      videoUrl: body.videoUrl ?? null,
      tags: stringifyJson(body.tags ?? []),
      categoryId: resolvedIds.categoryId,
      genusId: resolvedIds.genusId,
      speciesId: resolvedIds.speciesId,
      boardId: resolvedIds.boardId,
      authorId: me.id,
      ...(REVIEW_FILTER_ENABLED && {
        reviewStatus: needsReview ? 'pending' : 'published',
      }),
      ...(body.vote && {
        vote: {
          create: {
            question: body.vote.question,
            multi: body.vote.multi,
            deadline: new Date(body.vote.deadline),
            options: {
              create: body.vote.options.map((label, i) => ({
                label,
                orderIdx: i,
              })),
            },
          },
        },
      }),
      ...(body.event && {
        event: {
          create: {
            location: body.event.location,
            startAt: new Date(body.event.startAt),
            endAt: new Date(body.event.endAt ?? body.event.startAt),
          },
        },
      }),
      ...(body.journal && {
        journal: {
          create: {
            subjectName: body.journal.subjectName,
            startDate: new Date(body.journal.startDate),
            speciesId: body.journal.speciesId ?? resolvedIds.speciesId ?? null,
            entries: {
              create: body.journal.entries.map((e, i) => ({
                entryDate: new Date(e.entryDate),
                stage: e.stage,
                note: e.note,
                images: stringifyJson(e.images),
                orderIdx: i,
              })),
            },
          },
        },
      }),
    },
    include: postInclude(),
  });

  await emitEvent({ kind: 'post_create', userId: me.id, postId: created.id });

  return serializePost(created);
});
