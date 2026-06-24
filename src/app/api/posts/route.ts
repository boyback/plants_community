import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, stringifyJson } from '@/lib/api';
import { requireUser, getCurrentUser } from '@/lib/auth';
import { serializePost } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';
import type { Permission } from '@/lib/levels';
import { hasUserPermission } from '@/lib/permissions';
import { emitEvent } from '@/lib/events';
import { processRichInput } from '@/lib/richtext';
import { postNeedsReview } from '@/lib/post-review';
import { firePushToBaidu } from '@/lib/baidu-push';
import { sortPostsForPins, type PinSortTarget } from '@/lib/post-pins';
import { incrementSpeciesDailyStat } from '@/lib/species-daily-stats';
import { createUserPlantCode } from '@/lib/user-plant-code';
import { AlbumSyncInput, collectAlbumSyncImages, syncPostImagesToAlbum } from '@/lib/album-sync';
import { normalizeJournalStages, primaryJournalStage } from '@/lib/journal';
import { withUserPendants } from '@/lib/user-pendants';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://plantcommunity.cn';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

/**
 * 列表查询:支持在任一层级上过滤(?board=xxx / ?genus=xxx / ?species=xxx)。
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
  if (categorySlug) where.board = { slug: categorySlug };
  if (genusSlug) where.genus = { slug: genusSlug };
  if (speciesSlug) where.species = { slug: speciesSlug };
  // 旧 board slug 兼容:同时尝试 category/genus/species
  if (legacyBoard && !categorySlug && !genusSlug && !speciesSlug) {
    where.OR = [
      { board: { slug: legacyBoard } },
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
  const pinTargets = await resolvePinTargets({
    categorySlug,
    genusSlug,
    speciesSlug,
    legacyBoard,
  });

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

  // 获取当前用户（如果有登录）
  const currentUser = await getCurrentUser().catch(() => null);

  // 如果用户已登录，获取投票帖的已投票状态
  const postsWithVoteStatus = await Promise.all(
    list.map(async (post) => {
      if (post.type !== 'vote' || !currentUser) {
        return { post, userVoted: false };
      }
      const vote = await prisma.vote.findUnique({ where: { postId: post.id } });
      if (!vote) return { post, userVoted: false };
      const record = await prisma.voteRecord.findFirst({
        where: { voteId: vote.id, userId: currentUser.id },
      });
      return { post, userVoted: !!record };
    })
  );

  const items = postsWithVoteStatus.map(({ post, userVoted }) =>
    serializePost(post as any, userVoted, undefined, currentUser)
  );

  return {
    items: await withUserPendants(sortPostsForPins(items, pinTargets), list),
    nextCursor,
  };
});

/**
 * 发布新帖:支持三种板块定位方式:
 *   - speciesSlug:挂到品种(三级)
 *   - genusSlug:挂到属(二级)
 *   - categorySlug:挂到科(一级)
 *   - boardSlug(向后兼容):按 legacy board / category 查找
 * 其中至少需提供一个。自动推导上级并写入 boardId/genusId/speciesId。
 */
async function resolvePinTargets({
  categorySlug,
  genusSlug,
  speciesSlug,
  legacyBoard,
}: {
  categorySlug?: string;
  genusSlug?: string;
  speciesSlug?: string;
  legacyBoard?: string;
}): Promise<PinSortTarget[]> {
  if (speciesSlug) {
    const species = await prisma.species.findFirst({
      where: { slug: speciesSlug },
      select: { id: true },
    });
    return species ? [{ scope: 'species', targetId: species.id }] : [];
  }

  if (genusSlug) {
    const genus = await prisma.genus.findFirst({
      where: { slug: genusSlug },
      select: { id: true },
    });
    return genus ? [{ scope: 'genus', targetId: genus.id }] : [];
  }

  if (categorySlug) {
    const board = await prisma.board.findFirst({
      where: { slug: categorySlug },
      select: { id: true },
    });
    return board ? [{ scope: 'board', targetId: board.id }] : [];
  }

  if (!legacyBoard) return [];

  const [species, genus, board] = await Promise.all([
    prisma.species.findFirst({ where: { slug: legacyBoard }, select: { id: true } }),
    prisma.genus.findFirst({ where: { slug: legacyBoard }, select: { id: true } }),
    prisma.board.findFirst({ where: { slug: legacyBoard }, select: { id: true } }),
  ]);

  const targets: PinSortTarget[] = [];
  if (species) targets.push({ scope: 'species', targetId: species.id });
  if (genus) targets.push({ scope: 'genus', targetId: genus.id });
  if (board) targets.push({ scope: 'board', targetId: board.id });
  return targets;
}

const JournalEntryInput = z.object({
  entryDate: z.string(), // ISO
  stage: z.string().trim().max(50).optional(),
  stages: z.array(z.string().trim().min(1).max(50)).max(12).optional(),
  stageLabel: z.string().trim().max(50).optional(),
  note: z.string().trim().min(1, '每条记录都需要填写心得').max(2000),
  images: z.array(z.string()).min(1, '每条记录都需要上传配图').max(9).default([]),
}).superRefine((entry, ctx) => {
  const stages = normalizeJournalStages(entry.stages, entry.stage);
  if (stages.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stage'],
      message: '每条记录都需要选择阶段',
    });
  }
});

const CreateBody = z
  .object({
    type: z.enum(['rich', 'image', 'vote', 'video', 'event', 'help', 'journal']),
    // 板块定位(任一)
    categorySlug: z.string().optional(),
    genusSlug: z.string().optional(),
    speciesSlug: z.string().optional(),
    boardSlug: z.string().optional(), // 向后兼容
    title: z.string().min(1).max(500),
    content: z.unknown().optional(),
    contentJson: z.unknown().optional(),
    tags: z.array(z.string()).default([]),
    cover: z.string().url().nullable().optional(),
    images: z.array(z.string()).max(50).optional(),
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
    albumSync: AlbumSyncInput,
  })
  .superRefine((data, ctx) => {
    if (!data.categorySlug && !data.genusSlug && !data.speciesSlug && !data.boardSlug)
      ctx.addIssue({ code: 'custom', message: '必须指定一个板块' });
    if (data.type !== 'image' && data.type !== 'video' && data.title.length > 100)
      ctx.addIssue({ code: 'custom', message: '帖子标题不能超过 100 字' });
    if (data.type === 'vote' && !data.vote)
      ctx.addIssue({ code: 'custom', message: '投票贴必须包含 vote 字段' });
    if (data.type === 'event' && !data.event)
      ctx.addIssue({ code: 'custom', message: 'EVENT 贴必须包含 event 字段' });
    if (data.type === 'video' && !data.videoUrl)
      ctx.addIssue({ code: 'custom', message: '视频贴必须包含 videoUrl' });
    if (data.type === 'image' && (!data.images || data.images.length === 0))
      ctx.addIssue({ code: 'custom', message: '图文贴必须上传图片' });
    if (data.type === 'journal' && !data.journal)
      ctx.addIssue({ code: 'custom', message: '记录贴必须包含 journal 字段' });
  });

type ResolvedIds = {
  boardId: string | null;
  genusId: string | null;
  speciesId: string | null;
};
type ResolveResult = { ok: true; ids: ResolvedIds } | { ok: false; error: string };

/** 根据入参解析出 boardId / genusId / speciesId / boardId */
async function resolveBoardIds(body: z.infer<typeof CreateBody>): Promise<ResolveResult> {
  const ids: ResolvedIds = { boardId: null, genusId: null, speciesId: null };

  if (body.speciesSlug) {
    const sp = await prisma.species.findFirst({
      where: { slug: body.speciesSlug },
      include: { genus: { include: { board: true } } },
    });
    if (!sp) return { ok: false, error: '指定的品种不存在' };
    ids.speciesId = sp.id;
    ids.genusId = sp.genusId;
    ids.boardId = sp.genus.boardId;
    return { ok: true, ids };
  }

  if (body.genusSlug) {
    const g = await prisma.genus.findFirst({
      where: { slug: body.genusSlug },
      include: { board: true },
    });
    if (!g) return { ok: false, error: '指定的属不存在' };
    ids.genusId = g.id;
    ids.boardId = g.boardId;
    return { ok: true, ids };
  }

  if (body.categorySlug) {
    const c = await prisma.board.findUnique({ where: { slug: body.categorySlug } });
    if (!c) return { ok: false, error: '指定的板块不存在' };
    ids.boardId = c.id;
    return { ok: true, ids };
  }

  if (body.boardSlug) {
    const c = await prisma.board.findUnique({ where: { slug: body.boardSlug } });
    if (c) {
      ids.boardId = c.id;
      return { ok: true, ids };
    }
    const legacy = await prisma.board.findUnique({ where: { slug: body.boardSlug } });
    if (legacy) {
      ids.boardId = legacy.id;
      const sameName = await prisma.board.findFirst({ where: { name: legacy.name } });
      if (sameName) ids.boardId = sameName.id;
      return { ok: true, ids };
    }
    return { ok: false, error: '指定的板块不存在' };
  }

  return { ok: false, error: '必须指定板块' };
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = CreateBody.parse(await req.json());

  const permMap: Record<typeof body.type, Permission> = {
    rich: 'post:rich',
    image: 'post:rich',
    help: 'post:short',
    video: 'post:video',
    vote: 'post:vote',
    event: 'post:event',
    // journal 复用 rich 权限(通常 Lv.2+ 即可发)
    journal: 'post:rich',
  };
  const need = permMap[body.type];
  if (!(await hasUserPermission(me, need))) {
    return fail(403, `当前等级不允许发布该类型帖子,升级后即可解锁`);
  }
  if (body.cover || (body.images && body.images.length > 0)) {
    if (!(await hasUserPermission(me, 'post:image'))) {
      return fail(403, '需要 Lv.4 以上才能在帖子里附图');
    }
  }

  const resolved = await resolveBoardIds(body);
  if (!resolved.ok) return fail(400, resolved.error);
  const { ids: resolvedIds } = resolved;
  const finalIds = resolvedIds;
  if (body.type === 'journal' && !finalIds.speciesId) {
    return fail(400, '记录贴需要选择具体品种');
  }

  if (body.albumSync?.mode === 'existing') {
    if (!body.albumSync.albumId) return fail(400, '请选择要追加的相册');
    const album = await prisma.album.findFirst({
      where: { id: body.albumSync.albumId, userId: me.id },
      select: { id: true },
    });
    if (!album) return fail(400, '只能同步到自己的相册');
  }

  const cover = body.type === 'image' || body.type === 'video' ? null : body.cover ?? null;

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

  const created = await prisma.$transaction(async (tx) => {
    const journalSpeciesId = body.journal ? body.journal.speciesId ?? finalIds.speciesId : null;
    let userPlantId: string | null = null;

    if (body.type === 'journal' && body.journal && journalSpeciesId) {
      const startDate = new Date(body.journal.startDate);
      const species = await tx.species.findUnique({
        where: { id: journalSpeciesId },
        select: { cover: true },
      });
      const latestEntry = [...body.journal.entries].sort(
        (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime(),
      )[0];
      const currentStages = normalizeJournalStages(latestEntry?.stages, latestEntry?.stage);
      const currentStage = primaryJournalStage(currentStages, 'growing');
      const existingPlant = await tx.userPlant.findFirst({
        where: {
          ownerId: me.id,
          speciesId: journalSpeciesId,
          nickname: body.journal.subjectName,
          acquiredAt: startDate,
          journal: null,
        },
        select: { id: true },
      });
      const plant = existingPlant
        ? await tx.userPlant.update({
            where: { id: existingPlant.id },
            data: {
              currentStage: currentStage as any,
              currentStageLabel: currentStage === 'other' ? latestEntry?.stageLabel || null : null,
              cover: cover ?? species?.cover ?? null,
              note: latestEntry?.note || null,
            },
            select: { id: true },
          })
        : await tx.userPlant.create({
            data: {
              ownerId: me.id,
              speciesId: journalSpeciesId,
              code: await createUserPlantCode(tx, me.id, body.journal.subjectName, startDate),
              nickname: body.journal.subjectName,
              acquiredAt: startDate,
              currentStage: currentStage as any,
              currentStageLabel: currentStage === 'other' ? latestEntry?.stageLabel || null : null,
              cover: cover ?? species?.cover ?? null,
              note: latestEntry?.note || null,
            },
            select: { id: true },
          });
      userPlantId = plant.id;
    }

    const createdPost = await tx.post.create({
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
        boardId: finalIds.boardId,
        genusId: finalIds.genusId,
        speciesId: finalIds.speciesId,
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
              userPlantId,
              startDate: new Date(body.journal.startDate),
              speciesId: journalSpeciesId,
              entries: {
                create: body.journal.entries.map((e, i) => ({
                  entryDate: new Date(e.entryDate),
                  stage: primaryJournalStage(normalizeJournalStages(e.stages, e.stage)) as any,
                  stages: stringifyJson(normalizeJournalStages(e.stages, e.stage)),
                  stageLabel: e.stageLabel || null,
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

    await syncPostImagesToAlbum({
      tx,
      sync: body.albumSync,
      userId: me.id,
      postId: createdPost.id,
      postTitle: createdPost.title,
      cover,
      images: collectAlbumSyncImages({
        cover,
        images: body.images ?? [],
        journal: body.journal,
      }),
    });

    return createdPost;
  });

  await emitEvent({ kind: 'post_create', userId: me.id, postId: created.id });

  // 待审核帖不推百度(避免推了一个未公开页面)
  if (!needsReview) {
    firePushToBaidu(`${SITE_URL}/post/${created.id}`);
    await incrementSpeciesDailyStat(finalIds.speciesId, 'posts');
  }

  return withUserPendants(serializePost(created), created);
});
