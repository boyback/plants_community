import { Shell } from '@/components/layout/Shell';
import { BannerCarousel } from '@/components/home/BannerCarousel';
import { SignInCard } from '@/components/home/SignInCard';
import { FeedTabs } from '@/components/home/FeedTabs';
import { TopicsCard } from '@/components/home/TopicsCard';
import { RecommendUsers } from '@/components/home/RecommendUsers';
import { MonthCalendar } from '@/components/home/MonthCalendar';
import { AppDownloadCard } from '@/components/home/AppDownloadCard';
import { LegalLinks } from '@/components/home/LegalLinks';
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
          {/* 1. 话题 */}
          <TopicsCard />
          {/* 2. 推荐肉友 */}
          <RecommendUsers users={recommendUsers} />
          {/* 3. 签到 */}
          <SignInCard />
          {/* 4. 月历(显示本月签到状态) */}
          <MonthCalendar />
          {/* 5. APP 下载 */}
          <AppDownloadCard />
          {/* 6. 法律入口 */}
          <LegalLinks />
        </div>
      </div>
    </Shell>
  );
}
