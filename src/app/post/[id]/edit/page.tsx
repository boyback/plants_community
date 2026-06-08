import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { parseJsonArray } from '@/lib/api';
import { PostComposer } from '@/components/editor/PostComposer';
import type { PostType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PostEditPage({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect(`/login?redirect=/post/${params.id}/edit`);

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      contentJson: true,
      cover: true,
      images: true,
      videoUrl: true,
      tags: true,
      authorId: true,
      deleted: true,
      board: { select: { slug: true } },
      genus: { select: { slug: true } },
      species: { select: { slug: true } },
      vote: {
        include: {
          options: { orderBy: { orderIdx: 'asc' } },
          _count: { select: { records: true } },
        },
      },
      event: true,
      journal: {
        include: {
          entries: { orderBy: [{ entryDate: 'asc' }, { orderIdx: 'asc' }] },
        },
      },
    },
  });

  if (!post) notFound();
  if (post.deleted) notFound();
  if (post.authorId !== me.id) {
    return (
      <AppShell showFloatingAi={false}>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">!</div>
          <div className="mt-3 text-lg font-semibold">无权编辑</div>
          <p className="mt-1 text-sm text-leaf-700/70">只能编辑自己发布的帖子</p>
        </div>
      </AppShell>
    );
  }

  const images = parseJsonArray(post.images);

  return (
    <AppShell showFloatingAi={false}>
      <PostComposer
        mode="edit"
        initialValue={{
          id: post.id,
          type: post.type as PostType,
          title: post.title,
          content: post.content,
          contentJson: parseRichJson(post.contentJson),
          cover: post.cover ?? images[0] ?? '',
          videoUrl: post.videoUrl ?? '',
          tags: parseJsonArray(post.tags),
          categorySlug: post.board?.slug ?? '',
          genusSlug: post.genus?.slug ?? '',
          speciesSlug: post.species?.slug ?? '',
          voteOptions: post.vote?.options.map((option) => option.label),
          voteMulti: post.vote?.multi,
          voteDeadline: post.vote ? toDateTimeLocal(post.vote.deadline) : '',
          voteOptionsLocked: (post.vote?._count.records ?? 0) > 0,
          eventLocation: post.event?.location ?? '',
          eventStartAt: post.event ? toDateTimeLocal(post.event.startAt) : '',
          journal: post.journal
            ? {
                subjectName: post.journal.subjectName,
                startDate: toDateInput(post.journal.startDate),
                entries: post.journal.entries.map((entry) => ({
                  id: entry.id,
                  entryDate: toDateInput(entry.entryDate),
                  stage: entry.stage,
                  stageLabel: entry.stageLabel ?? '',
                  note: entry.note,
                  images: parseJsonArray(entry.images),
                })),
              }
            : undefined,
        }}
      />
    </AppShell>
  );
}

function parseRichJson(s: string | null | undefined): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toDateTimeLocal(date: Date): string {
  return date.toISOString().slice(0, 16);
}
