import { Shell } from '@/components/layout/Shell';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { SignInCard } from '@/components/home/SignInCard';
import { FeedTabs } from '@/components/home/FeedTabs';
import { TopicsCard } from '@/components/home/TopicsCard';
import { RecommendUsers } from '@/components/home/RecommendUsers';
import { prisma } from '@/lib/db';
import { postInclude } from '@/lib/post-include';
import { serializePost, serializeUser } from '@/lib/serializers';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';
import type { BannerItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [postsRaw, bannersRaw, recommendUsersRaw] = await Promise.all([
    prisma.post.findMany({
      where: {
        deleted: false,
        ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
      },
      orderBy: [{ hotScore: 'desc' }, { createdAt: 'desc' }],
      take: 20,
      include: postInclude(),
    }),
    prisma.banner.findMany({
      where: { enabled: true },
      orderBy: { orderIdx: 'asc' },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    }),
  ]);

  const posts = postsRaw.map(serializePost);
  const banners: BannerItem[] = bannersRaw.map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    image: b.image,
    link: b.link,
    tint: b.tint,
    durationMs: b.durationMs > 0 ? b.durationMs : undefined,
  }));
  const recommendUsers = recommendUsersRaw.map(serializeUser);

  return (
    <Shell>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-6">
          {banners.length > 0 && <BannerCarousel items={banners} />}
          <FeedTabs initial={posts} />
        </div>

        <div className="space-y-5">
          <SignInCard />
          <TopicsCard />
          <RecommendUsers users={recommendUsers} />
          <div className="rounded-xl bg-leaf-50/60 p-4 text-[11px] text-leaf-700/70">
            <div className="mb-1 font-medium text-leaf-700">📬 社区公约</div>
            尊重彼此、理性讨论、严禁广告。交易请走认证渠道,谨防受骗。
          </div>
        </div>
      </div>
    </Shell>
  );
}
