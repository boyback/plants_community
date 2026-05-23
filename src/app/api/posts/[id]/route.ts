import { z } from 'zod';
import { prisma } from '@/lib/db';
import { fail, handler, stringifyJson } from '@/lib/api';
import { requireUser, getCurrentUser } from '@/lib/auth';
import { serializePost } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';
import { processRichInput } from '@/lib/richtext';
import { postNeedsReview } from '@/lib/post-review';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';
import { ALL_STAGES, STAGE_META } from '@/lib/journal';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const id = pickId(req);

  await prisma.post.update({
    where: { id },
    data: { views: { increment: 1 } },
  }).catch(() => null);

  const currentUser = await getCurrentUser().catch(() => null);

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      ...postInclude({ withJournalEntries: true }),
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          author: {
            include: {
              _count: { select: { posts: true, followers: true, following: true } },
              badges: { include: { badge: true } },
            },
          },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                include: {
                  _count: { select: { posts: true, followers: true, following: true } },
                  badges: { include: { badge: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!post) return fail(200, 'NOT_FOUND', '帖子不存在');

  let userVoted = false;
  if (post.type === 'vote' && currentUser) {
    const vote = await prisma.vote.findUnique({ where: { postId: id } });
    if (vote) {
      const record = await prisma.voteRecord.findFirst({
        where: { voteId: vote.id, userId: currentUser.id },
      });
      userVoted = !!record;
    }
  }

  return serializePost(post as any, userVoted, undefined, currentUser);
});

function pickId(req: Request): string {
  const url = new URL(req.url);
  return url.pathname.split('/').filter(Boolean).pop()!;
}

const VotePatch = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(8),
  multi: z.boolean().default(false),
  deadline: z.string(),
});

const EventPatch = z.object({
  location: z.string().min(1),
  startAt: z.string(),
  endAt: z.string().optional(),
});

const JournalPatch = z.object({
  subjectName: z.string().min(1).max(50),
  startDate: z.string(),
  speciesId: z.string().optional(),
  entries: z
    .array(
      z.object({
        entryDate: z.string(),
        stage: z.string().optional(),
        note: z.string().max(2000).default(''),
        images: z.array(z.string()).max(9).default([]),
      })
    )
    .max(50)
    .default([]),
});

const PatchBody = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.unknown().optional(),
  contentJson: z.unknown().optional(),
  tags: z.array(z.string()).max(10).optional(),
  images: z.array(z.string()).optional(),
  cover: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  categorySlug: z.string().optional(),
  genusSlug: z.string().optional(),
  speciesSlug: z.string().optional(),
  vote: VotePatch.optional(),
  event: EventPatch.optional(),
  journal: JournalPatch.optional(),
});

export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const body = PatchBody.parse(await req.json());

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      vote: {
        include: {
          options: { orderBy: { orderIdx: 'asc' } },
          _count: { select: { records: true } },
        },
      },
      event: true,
      journal: true,
    },
  });

  if (!post) return fail(404, '帖子不存在');
  if (post.deleted) return fail(400, '帖子已删除');
  if (post.authorId !== me.id) return fail(403, '只能编辑自己的帖子');

  if (post.type === 'vote' && body.vote && post.vote && post.vote._count.records > 0) {
    const nextOptions = cleanVoteOptions(body.vote.options);
    const currentOptions = post.vote.options.map((option) => option.label);
    if (!sameVoteOptions(currentOptions, nextOptions)) {
      return fail(400, '已有用户投票，不能修改投票选项');
    }
  }

  const isRich = post.type === 'rich' || post.type === 'event';
  let stored: { html: string; json: string | null; text: string | null } | null = null;
  if (body.content !== undefined || body.contentJson !== undefined) {
    stored = processRichInput({
      json: isRich ? body.contentJson : undefined,
      html: isRich && typeof body.content === 'string' ? body.content : undefined,
      text: !isRich && typeof body.content === 'string' ? body.content : undefined,
      textMaxLen: 2000,
    });
  }

  const finalImages = body.images ?? null;
  const finalVideoUrl = body.videoUrl !== undefined ? body.videoUrl : post.videoUrl;
  const finalCover =
    body.cover !== undefined ? body.cover : finalImages ? finalImages[0] ?? null : post.cover;
  const finalContent = stored ? stored.html : post.content;

  const needsReview = postNeedsReview({
    cover: finalCover,
    images: finalImages ?? undefined,
    videoUrl: finalVideoUrl,
    content: finalContent,
  });

  const boardIds = await resolveBoardIds(body);
  if (!boardIds.ok) return fail(400, boardIds.error);

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(stored && {
          content: stored.html,
          contentJson: stored.json,
          contentText: stored.text,
        }),
        ...(body.tags !== undefined && { tags: stringifyJson(body.tags) }),
        ...(body.images !== undefined && {
          images: stringifyJson(body.images),
          ...(body.cover === undefined && { cover: body.images[0] ?? null }),
        }),
        ...(body.cover !== undefined && { cover: body.cover }),
        ...(body.videoUrl !== undefined && { videoUrl: body.videoUrl }),
        ...(boardIds.ids && boardIds.ids),
        ...(REVIEW_FILTER_ENABLED && {
          reviewStatus: needsReview ? 'pending' : 'published',
          reviewReason: needsReview ? '编辑后含外链，等待审核' : null,
          reviewedAt: needsReview ? null : new Date(),
        }),
      },
    });

    if (post.type === 'vote' && body.vote) {
      const vote = post.vote
        ? await tx.vote.update({
            where: { id: post.vote.id },
            data: {
              question: body.vote.question,
              multi: body.vote.multi,
              deadline: new Date(body.vote.deadline),
            },
          })
        : await tx.vote.create({
            data: {
              postId: id,
              question: body.vote.question,
              multi: body.vote.multi,
              deadline: new Date(body.vote.deadline),
            },
          });

      if (!post.vote || post.vote._count.records === 0) {
        const options = cleanVoteOptions(body.vote.options);
        await tx.voteOption.deleteMany({ where: { voteId: vote.id } });
        await tx.voteOption.createMany({
          data: options.map((label, orderIdx) => ({
            voteId: vote.id,
            label,
            orderIdx,
          })),
        });
      }
    }

    if (post.type === 'event' && body.event) {
      await tx.event.upsert({
        where: { postId: id },
        create: {
          postId: id,
          location: body.event.location,
          startAt: new Date(body.event.startAt),
          endAt: new Date(body.event.endAt ?? body.event.startAt),
        },
        update: {
          location: body.event.location,
          startAt: new Date(body.event.startAt),
          endAt: new Date(body.event.endAt ?? body.event.startAt),
        },
      });
    }

    if (post.type === 'journal' && body.journal) {
      const speciesId = body.journal.speciesId ?? boardIds.ids?.speciesId ?? post.speciesId ?? null;
      const journal = post.journal
        ? await tx.journal.update({
            where: { id: post.journal.id },
            data: {
              subjectName: body.journal.subjectName,
              startDate: new Date(body.journal.startDate),
              speciesId,
            },
          })
        : await tx.journal.create({
            data: {
              postId: id,
              subjectName: body.journal.subjectName,
              startDate: new Date(body.journal.startDate),
              speciesId,
            },
          });

      await tx.journalEntry.deleteMany({ where: { journalId: journal.id } });
      await tx.journalEntry.createMany({
        data: body.journal.entries.map((entry, orderIdx) => ({
          journalId: journal.id,
          entryDate: new Date(entry.entryDate),
          stage: normalizeJournalStage(entry.stage) as any,
          note: entry.note,
          images: stringifyJson(entry.images),
          orderIdx,
        })),
      });
    }
  });

  return { ok: true, needsReview };
});

async function resolveBoardIds(body: {
  categorySlug?: string;
  genusSlug?: string;
  speciesSlug?: string;
}): Promise<
  | { ok: true; ids: { boardId: string | null; genusId: string | null; speciesId: string | null } | null }
  | { ok: false; error: string }
> {
  if (body.speciesSlug) {
    const sp = await prisma.species.findFirst({
      where: { slug: body.speciesSlug },
      include: { genus: { include: { board: true } } },
    });
    if (!sp) return { ok: false, error: '指定的品种不存在' };
    return {
      ok: true,
      ids: {
        boardId: sp.genus.boardId ?? null,
        genusId: sp.genusId,
        speciesId: sp.id,
      },
    };
  }
  if (body.genusSlug) {
    const g = await prisma.genus.findFirst({
      where: {
        slug: body.genusSlug,
        ...(body.categorySlug ? { board: { slug: body.categorySlug } } : {}),
      },
      include: { board: true },
    });
    if (!g) return { ok: false, error: '指定的属不存在' };
    return {
      ok: true,
      ids: {
        boardId: g.boardId ?? null,
        genusId: g.id,
        speciesId: null,
      },
    };
  }
  if (body.categorySlug) {
    const c = await prisma.board.findUnique({ where: { slug: body.categorySlug } });
    if (!c) return { ok: false, error: '指定的板块不存在' };
    return {
      ok: true,
      ids: {
        boardId: c.id,
        genusId: null,
        speciesId: null,
      },
    };
  }
  return { ok: true, ids: null };
}

function cleanVoteOptions(options: string[]): string[] {
  return options.map((option) => option.trim()).filter(Boolean);
}

function sameVoteOptions(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function normalizeJournalStage(value: string | undefined): string {
  if (!value) return 'other';
  if ((ALL_STAGES as string[]).includes(value)) return value;

  const matched = ALL_STAGES.find((stage) => STAGE_META[stage].zh === value);
  return matched ?? 'other';
}
