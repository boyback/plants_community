import { notFound, redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { parseJsonArray } from '@/lib/api';
import { PostEditor } from './PostEditor';

export const dynamic = 'force-dynamic';

const EDITABLE_TYPES = ['rich', 'short', 'video'] as const;

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
      images: true,
      videoUrl: true,
      tags: true,
      authorId: true,
      deleted: true,
      category: { select: { slug: true } },
      genus: { select: { slug: true } },
      species: { select: { slug: true } },
    },
  });

  if (!post) notFound();
  if (post.deleted) notFound();
  if (post.authorId !== me.id) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">🚫</div>
          <div className="mt-3 text-lg font-semibold">无权编辑</div>
          <p className="mt-1 text-sm text-leaf-700/70">只能编辑自己发布的帖子</p>
        </div>
      </Shell>
    );
  }

  if (!EDITABLE_TYPES.includes(post.type as (typeof EDITABLE_TYPES)[number])) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">🔒</div>
          <div className="mt-3 text-lg font-semibold">该类型帖子不支持编辑</div>
          <p className="mt-1 text-sm text-leaf-700/70">
            投票 / 活动 / 成长日记 / 求助 类型涉及报名、投票、记录、悬赏等数据,不允许后续修改。
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PostEditor
        post={{
          id: post.id,
          type: post.type as 'rich' | 'short' | 'video',
          title: post.title,
          content: post.content,
          contentJson: parseRichJson(post.contentJson),
          images: parseJsonArray(post.images),
          videoUrl: post.videoUrl ?? '',
          tags: parseJsonArray(post.tags),
          categorySlug: post.category?.slug ?? '',
          genusSlug: post.genus?.slug ?? '',
          speciesSlug: post.species?.slug ?? '',
        }}
      />
    </Shell>
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
