'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { BannerItem, Post, User } from '@/lib/types';
import { cn, formatNumber } from '@/lib/utils';

type TopicItem = {
  tag: string;
  postCount: number;
  cover?: string | null;
};

type EventItem = {
  id: string;
  title: string;
  cover?: string | null;
  status: string;
  startAt: string;
  endAt: string;
  participantCount: number;
};

type ReminderItem = {
  id: string;
  speciesName: string;
  cover: string;
  text: string;
  when: string;
};

type SelectionItem = {
  id: string;
  name: string;
  latinName: string;
  cover: string;
  difficulty: number;
  href: string;
};

type HomeStats = {
  speciesCount: number;
  marketCount: number;
  journalCount: number;
  postCount: number;
};

export function HomeDashboard({
  posts,
  banners,
  topics,
  events,
  reminders,
  stats,
  recommendUsers,
  selections,
}: {
  posts: Post[];
  banners: BannerItem[];
  topics: TopicItem[];
  events: EventItem[];
  reminders: ReminderItem[];
  stats: HomeStats;
  recommendUsers: User[];
  selections: SelectionItem[];
}) {
  return (
    <AppShell
      rightRail={<InsightRail reminders={reminders} stats={stats} users={recommendUsers} />}
      aiRail={<AiRail />}
    >
      <div className="space-y-6">
        <HomeHero banners={banners} />
        <FeatureGrid stats={stats} />
        <TimelineHighlights reminders={reminders} />
        <HotAtlasZone selections={selections} />
        <EventsStrip events={events} />
        <CommunityPicks posts={posts} />
        <PlantSelection selections={selections} />
        <HotTopics topics={topics} />
      </div>
    </AppShell>
  );
}

function HomeHero({ banners }: { banners: BannerItem[] }) {
  const banner = banners[0];
  const image =
    banner?.image ||
    'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1600';

  return (
    <section className="relative min-h-[330px] overflow-hidden rounded-2xl bg-leaf-100 shadow-sm">
      <Image
        src={image}
        alt={banner?.title || '多肉植物'}
        fill
        priority
        unoptimized
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/58 to-white/8" />
      <div className="relative z-10 flex min-h-[330px] flex-col justify-center px-8 py-8 md:px-12">
        <h1 className="max-w-xl text-4xl font-bold leading-tight text-ink-950 md:text-5xl">
          {banner?.title || '探索多肉的美好世界'}
          <span className="ml-3 text-leaf-600">🌿</span>
        </h1>
        <p className="mt-5 max-w-md text-lg text-ink-700">
          {banner?.subtitle || '记录 · 学习 · 交流 · 成长'}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/search?q=多肉病害诊断" className="inline-flex h-12 items-center gap-2 rounded-full bg-leaf-600 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-leaf-700">
            开始 AI 诊断
          </Link>
          <Link href="/search?q=多肉拍照识别" className="inline-flex h-12 items-center gap-2 rounded-full border border-leaf-200 bg-white/78 px-7 text-sm font-semibold text-ink-800 backdrop-blur transition hover:bg-white">
            拍照识别
          </Link>
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {[0, 1, 2, 3, 4, 5].map((dot) => (
          <span
            key={dot}
            className={cn('h-2 rounded-full bg-white/75 shadow-sm', dot === 1 ? 'w-8 bg-leaf-600' : 'w-2')}
          />
        ))}
      </div>
    </section>
  );
}

function FeatureGrid({ stats }: { stats: HomeStats }) {
  const items = [
    {
      title: 'AI 植物医生',
      desc: '拍照诊断，识别病害',
      href: '/search?q=多肉病害诊断',
      action: '立即诊断',
      tone: 'from-leaf-50 to-white',
      icon: 'star' as IconName,
    },
    {
      title: '植物图鉴',
      desc: `收录 ${formatNumber(stats.speciesCount)}+ 品种`,
      href: '/plants',
      action: '探索图鉴',
      tone: 'from-[#eff8ed] to-white',
      icon: 'plants' as IconName,
    },
    {
      title: '成长时间轴',
      desc: `${formatNumber(stats.journalCount)} 份成长记录`,
      href: '/editor?type=journal',
      action: '记录成长',
      tone: 'from-[#f6f8ef] to-white',
      icon: 'event' as IconName,
    },
    {
      title: '交易市场',
      desc: `多肉交易 · ${formatNumber(stats.marketCount)} 个在售`,
      href: '/market',
      action: '进入市场',
      tone: 'from-[#fff6f0] to-white',
      icon: 'shop' as IconName,
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.title}
          href={item.href}
          className={cn(
            'group min-h-[128px] overflow-hidden rounded-xl border border-leaf-100 bg-gradient-to-br p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
            item.tone
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-base font-bold text-ink-900">{item.title}</span>
              <span className="mt-2 block text-sm text-ink-600">{item.desc}</span>
            </span>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/78 text-leaf-700 shadow-sm">
              <Icon name={item.icon} size={22} />
            </span>
          </div>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-leaf-700">
            {item.action}
            <Icon name="arrow-right" size={14} />
          </span>
        </Link>
      ))}
    </section>
  );
}

function TimelineHighlights({ reminders }: { reminders: ReminderItem[] }) {
  const fallback: ReminderItem[] = [
    { id: 'sun', speciesName: '玉蝶', cover: '', text: '叶片浓密很好，阳光充足', when: '5月20日' },
    { id: 'water', speciesName: '桃蛋', cover: '', text: '浇水状态稳定', when: '5月18日' },
    { id: 'sprout', speciesName: '白凤', cover: '', text: '新叶萌发，长势喜人', when: '5月15日' },
    { id: 'repot', speciesName: '吉娃娃', cover: '', text: '换盆完成，适应中', when: '5月12日' },
    { id: 'move', speciesName: '劳尔', cover: '', text: '轻微褪色，移到散光处', when: '5月8日' },
  ];
  const items = (reminders.length ? reminders : fallback).slice(0, 5);

  return (
    <section>
      <SectionHead title="成长时间轴精选" href="/editor?type=journal" />
      <div className="relative pt-3">
        <div className="absolute left-[9%] right-[9%] top-5 hidden h-px bg-leaf-200 md:block" />
        <div className="grid gap-3 md:grid-cols-5">
          {items.map((item, index) => (
            <Link
              key={item.id}
              href="/editor?type=journal"
              className="group relative min-h-[118px] overflow-hidden rounded-xl border border-leaf-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="absolute left-1/2 top-[-1px] hidden h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-leaf-600 shadow-[0_0_0_1px_rgba(79,139,67,0.25)] md:block" />
              <div className="relative z-10 max-w-[58%]">
                <div className="text-base font-bold text-ink-900">{normalizeTimelineDate(item.when, index)}</div>
                <p className="mt-3 text-xs leading-5 text-ink-600">{item.text}</p>
              </div>
              {item.cover ? (
                <Image
                  src={item.cover}
                  alt={item.speciesName}
                  width={92}
                  height={82}
                  unoptimized
                  className="absolute bottom-0 right-0 h-[82px] w-[92px] rounded-tl-xl object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <span className="absolute bottom-2 right-3 grid h-16 w-16 place-items-center rounded-xl bg-leaf-50 text-leaf-500">
                  <Icon name="plants" size={28} />
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HotAtlasZone({ selections }: { selections: SelectionItem[] }) {
  if (selections.length === 0) return null;

  const tabs = ['景天科', '番杏科', '十二卷属', '仙人掌科', '块根植物', '稀有品种'];
  const cards = selections.slice(0, 6);

  return (
    <section className="rounded-2xl border border-leaf-100 bg-white/88 p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-5">
          <h2 className="text-xl font-bold text-ink-950">热门图鉴专区</h2>
          <div className="hidden items-center gap-5 md:flex">
            {tabs.map((tab, index) => (
              <Link
                key={tab}
                href="/plants"
                className={cn(
                  'text-sm font-semibold transition-colors',
                  index === 0 ? 'rounded-full bg-leaf-100 px-4 py-1.5 text-leaf-800' : 'text-ink-500 hover:text-leaf-700'
                )}
              >
                {tab}
              </Link>
            ))}
          </div>
        </div>
        <Link href="/plants" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-leaf-700">
          查看全部图鉴
          <Icon name="arrow-right" size={13} />
        </Link>
      </div>

      <div className="relative">
        <AtlasArrow direction="left" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {cards.map((item, index) => (
            <Link
              key={item.id}
              href={item.href}
              className="group relative aspect-[1.08/1] min-h-[190px] overflow-hidden rounded-xl bg-ink-900 shadow-sm"
            >
              <Image
                src={item.cover}
                alt={item.name}
                fill
                sizes="240px"
                unoptimized
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/25 to-black/0" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="line-clamp-1 text-base font-bold">{item.name}</h3>
                <p className="mt-1 line-clamp-1 text-xs italic text-white/78">{item.latinName}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-white/86">
                  <Icon name="eye" size={13} />
                  收藏 {formatNumber(20_000 - index * 1800)}
                </div>
              </div>
            </Link>
          ))}
        </div>
        <AtlasArrow direction="right" />
      </div>

      <div className="mt-5 flex justify-center gap-3">
        <span className="h-1.5 w-16 rounded-full bg-leaf-600" />
        <span className="h-1.5 w-16 rounded-full bg-leaf-100" />
        <span className="h-1.5 w-16 rounded-full bg-leaf-100" />
      </div>
    </section>
  );
}

function AtlasArrow({ direction }: { direction: 'left' | 'right' }) {
  return (
    <button
      type="button"
      aria-label={direction === 'left' ? '上一组' : '下一组'}
      className={cn(
        'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-ink-700 shadow-lg ring-1 ring-leaf-100 transition hover:bg-leaf-50 2xl:grid',
        direction === 'left' ? '-left-5' : '-right-5'
      )}
    >
      <Icon name="arrow-right" size={18} className={direction === 'left' ? 'rotate-180' : ''} />
    </button>
  );
}

function EventsStrip({ events }: { events: EventItem[] }) {
  const items = events.slice(0, 3);
  if (items.length === 0) return null;

  const labels = ['进行中', '报名中', '即将开始'];

  return (
    <section>
      <SectionHead title="热门活动" href="/contests" />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((event, index) => (
          <Link
            key={event.id}
            href={`/contests/${event.id}`}
            className="group relative min-h-[136px] overflow-hidden rounded-xl border border-leaf-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {event.cover && (
              <Image src={event.cover} alt="" fill unoptimized className="object-cover transition duration-500 group-hover:scale-105" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/64 to-white/12" />
            <div className="relative z-10">
              <span className={cn('rounded-md px-2 py-1 text-xs font-semibold text-white', index === 2 ? 'bg-orange-500' : 'bg-leaf-600')}>
                {labels[index] ?? event.status}
              </span>
              <h3 className="mt-4 line-clamp-1 text-base font-bold text-ink-900">{event.title}</h3>
              <p className="mt-2 text-xs text-ink-600">{formatNumber(event.participantCount)} 人参与</p>
              <p className="mt-3 text-xs text-ink-500">{formatDateShort(event.startAt)} - {formatDateShort(event.endAt)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CommunityPicks({ posts }: { posts: Post[] }) {
  const tabs = ['精选', '最新', '关注', '问答', '教程', '美图分享'];
  const cards = posts.slice(0, 5);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5">
          <h2 className="text-xl font-bold text-ink-950">社区精选内容</h2>
          <div className="hidden items-center gap-5 md:flex">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={cn(
                  'text-sm font-semibold transition-colors',
                  index === 0 ? 'rounded-full bg-leaf-100 px-3 py-1 text-leaf-800' : 'text-ink-500 hover:text-leaf-700'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <Link href="/board" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-leaf-700">
          查看更多
          <Icon name="arrow-right" size={13} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {cards.map((post, index) => (
          <HomePostCard key={post.id} post={post} featured={index === 0} />
        ))}
      </div>
    </section>
  );
}

function PlantSelection({ selections }: { selections: SelectionItem[] }) {
  if (selections.length === 0) return null;

  const tabs = ['热门', '新品', '景天科', '番杏科', '仙人掌科', '十二卷属', '更多分类'];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-5">
          <h2 className="text-xl font-bold text-ink-950">植物甄选推荐</h2>
          <div className="hidden items-center gap-4 md:flex">
            {tabs.map((tab, index) => (
              <Link
                key={tab}
                href="/plants"
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  index === 0 ? 'bg-leaf-100 text-leaf-800' : 'text-ink-500 hover:bg-leaf-50 hover:text-leaf-700'
                )}
              >
                {tab}
              </Link>
            ))}
          </div>
        </div>
        <Link href="/plants" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-leaf-700">
          查看更多
          <Icon name="arrow-right" size={13} />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {selections.map((item, index) => (
          <Link
            key={item.id}
            href={item.href}
            className="group overflow-hidden rounded-xl border border-leaf-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative aspect-[4/3] bg-leaf-50">
              <Image src={item.cover} alt={item.name} fill sizes="220px" unoptimized className="object-cover transition duration-500 group-hover:scale-105" />
            </div>
            <div className="p-3">
              <h3 className="line-clamp-1 text-sm font-bold text-ink-900">{item.name}</h3>
              <p className="mt-1 line-clamp-1 text-[11px] text-ink-500">{item.latinName}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="font-bold text-leaf-800">难度 {item.difficulty}</span>
                <span className="inline-flex items-center gap-1 text-leaf-700">
                  <Icon name="check-circle" size={12} />
                  {Math.max(8, 68 - index * 5)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function HomePostCard({ post, featured }: { post: Post; featured?: boolean }) {
  const cover = post.cover ?? post.images?.[0];

  return (
    <Link
      href={`/post/${post.id}`}
      className="group overflow-hidden rounded-xl border border-leaf-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-leaf-50">
        {cover ? (
          <Image
            src={cover}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            unoptimized
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-leaf-300">
            <Icon name="plants" size={44} />
          </div>
        )}
        {featured && (
          <span className="absolute left-3 top-3 rounded-full bg-leaf-600 px-2.5 py-1 text-[11px] font-semibold text-white">
            精选
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-bold text-ink-900 group-hover:text-leaf-700">{post.title}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex min-w-0 items-center gap-2">
            <UserAvatar
              src={post.author.avatar}
              alt={post.author.name}
              size={24}
              pendant={post.author.equip?.pendant ?? null}
              showFestival={false}
            />
            <span className="truncate text-xs text-ink-600">{post.author.name}</span>
            <AuthorBadgeIcons post={post} />
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-ink-500">
            <Icon name="heart" size={13} />
            {formatNumber(post.likes)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function AuthorBadgeIcons({ post }: { post: Post }) {
  const badges = post.author.badges.filter((badge) => badge.obtained).slice(0, 2);
  if (badges.length === 0) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {badges.map((badge) => (
        <span
          key={badge.id}
          title={badge.name}
          className="inline-grid h-4 w-4 place-items-center rounded-full border border-leaf-100 bg-white text-[9px] shadow-sm"
        >
          {badge.icon}
        </span>
      ))}
    </span>
  );
}

function HotTopics({ topics }: { topics: TopicItem[] }) {
  if (topics.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-ink-950">热门话题</h2>
      <div className="grid gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {topics.slice(0, 6).map((topic) => (
          <Link
            key={topic.tag}
            href={`/topic/${encodeURIComponent(topic.tag)}`}
            className="relative min-h-[104px] overflow-hidden rounded-xl border border-leaf-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative z-10">
              <div className="text-sm font-bold text-ink-900"># {topic.tag}</div>
              <div className="mt-2 text-xs text-ink-500">{formatNumber(topic.postCount)} 帖子</div>
            </div>
            {topic.cover && (
              <Image
                src={topic.cover}
                alt=""
                width={76}
                height={76}
                unoptimized
                className="absolute -bottom-4 -right-4 h-20 w-20 rounded-xl object-cover opacity-85"
              />
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

function InsightRail({ reminders, stats, users }: { reminders: ReminderItem[]; stats: HomeStats; users: User[] }) {
  return (
    <>
      <PlantStatusCard stats={stats} />
      <DynamicReminderCard reminders={reminders} users={users} />
      <CommunityRankingCard users={users} />
    </>
  );
}

function PlantStatusCard({ stats }: { stats: HomeStats }) {
  const healthy = Math.max(8, Math.round(stats.speciesCount * 0.07));
  const warning = Math.max(3, Math.round(stats.speciesCount * 0.02));
  const dormant = Math.max(1, Math.round(stats.speciesCount * 0.005));

  return (
    <section className="rounded-xl border border-leaf-100 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-ink-950">我的植物概览</h2>
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="grid grid-cols-4 gap-3 text-center">
          <StatusCount label="总数" value={86} />
          <StatusCount label="健康" value={healthy} className="text-leaf-700" />
          <StatusCount label="休眠" value={warning} className="text-red-600" />
          <StatusCount label="待养" value={dormant} className="text-ink-500" />
        </div>
        <div className="relative grid h-[82px] w-[82px] shrink-0 place-items-center rounded-full bg-[conic-gradient(#4f8b43_0_52%,#8fc6ff_52%_72%,#ff756e_72%_84%,#e7eee2_84%_100%)]">
          <div className="h-[58px] w-[58px] rounded-full bg-white" />
        </div>
      </div>
    </section>
  );
}

function StatusCount({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <div className={cn('text-xl font-bold text-ink-900', className)}>{value}</div>
      <div className="mt-1 text-[11px] text-ink-500">{label}</div>
    </div>
  );
}

function DynamicReminderCard({ reminders, users }: { reminders: ReminderItem[]; users: User[] }) {
  const names = users.length ? users : [];
  const activity = [
    { user: names[0], actor: names[0]?.name ?? '多肉小仙女', text: '评论了你的帖子', time: '2 分钟前', icon: 'comment' as IconName },
    { user: names[1], actor: names[1]?.name ?? '植物爱好者', text: '点赞了你的内容', time: '15 分钟前', icon: 'heart' as IconName },
    { user: undefined, actor: 'AI 助手', text: reminders[0]?.text ? `提醒你${reminders[0].text}` : '提醒你该给植物浇水了', time: '1 小时前', icon: 'plants' as IconName },
    { user: undefined, actor: '社区活动', text: '即将开始：知识问答赛', time: '2 小时前', icon: 'event' as IconName },
  ];

  return (
    <section className="rounded-xl border border-leaf-100 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-ink-950">动态提醒</h2>
      <div className="mt-4 space-y-3">
        {activity.map((item) => (
          <div key={`${item.actor}-${item.time}`} className="flex items-center gap-3">
            {item.user ? (
              <UserAvatar
                src={item.user.avatar}
                alt={item.user.name}
                size={28}
                pendant={item.user.equip?.pendant ?? null}
                showFestival={false}
              />
            ) : (
              <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-leaf-50 text-leaf-700">
                <Icon name={item.icon} size={14} />
              </span>
            )}
            <div className="min-w-0 flex-1 text-xs">
              <span className="inline-flex min-w-0 items-center gap-1 align-middle">
                <span className="truncate font-semibold text-ink-900">{item.actor}</span>
                {item.user && <UserBadgeIcons user={item.user} />}
              </span>
              <span className="ml-1 text-ink-600">{item.text}</span>
            </div>
            <span className="shrink-0 text-[11px] text-ink-400">{item.time}</span>
          </div>
        ))}
      </div>
      <Link href="/notifications" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-leaf-700">
        查看全部通知
        <Icon name="arrow-right" size={12} />
      </Link>
    </section>
  );
}

function CommunityRankingCard({ users }: { users: User[] }) {
  if (users.length === 0) return null;

  return (
    <section className="rounded-xl border border-leaf-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-bold text-ink-950">社区排行榜</h2>
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-leaf-100 px-2 py-1 text-leaf-800">周榜</span>
          <span className="text-ink-400">月榜</span>
          <span className="text-ink-400">总榜</span>
        </div>
      </div>
      <div className="space-y-3">
        {users.slice(0, 5).map((user, index) => (
          <Link key={user.id} href={`/user/${user.id}`} className="flex items-center gap-3 text-sm">
            <span className={cn('w-4 shrink-0 text-center font-bold', index === 0 ? 'text-orange-500' : 'text-ink-500')}>{index + 1}</span>
            <UserAvatar
              src={user.avatar}
              alt={user.name}
              size={28}
              pendant={user.equip?.pendant ?? null}
              showFestival={false}
            />
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <span className="truncate font-semibold text-ink-800">{user.name}</span>
              <UserBadgeIcons user={user} />
            </span>
            <span className="shrink-0 text-xs text-ink-500">{formatNumber(user.pointsBalance || 2800 - index * 380)}</span>
            <span className="text-xs text-ink-400">积分</span>
          </Link>
        ))}
      </div>
      <Link href="/ranking" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-leaf-700">
        查看完整排行榜
        <Icon name="arrow-right" size={12} />
      </Link>
    </section>
  );
}

function UserBadgeIcons({ user }: { user: User }) {
  const badges = user.badges.filter((badge) => badge.obtained).slice(0, 2);
  if (badges.length === 0) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {badges.map((badge) => (
        <span
          key={badge.id}
          title={badge.name}
          className="inline-grid h-4 w-4 place-items-center rounded-full border border-leaf-100 bg-white text-[9px] shadow-sm"
        >
          {badge.icon}
        </span>
      ))}
    </span>
  );
}

function AiRail() {
  return (
    <>
      <AiAssistantCard />
    </>
  );
}

function AiAssistantCard() {
  const questions = ['多肉叶片发软怎么办?', '夏天如何给多肉浇水?', '推荐适合新手的多肉', '叶片化水要怎么处理?'];

  return (
    <section className="rounded-2xl border border-leaf-100 bg-white p-5 shadow-[0_18px_48px_rgba(46,78,38,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-950">AI 助手</h2>
        <div className="flex items-center gap-3 text-ink-600">
          <span className="h-px w-3 bg-ink-400" />
          <Icon name="close" size={15} />
        </div>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-1 text-[11px] font-semibold text-leaf-800">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf-600" />
            在线
          </span>
          <div className="mt-5 font-semibold text-ink-900">Hi，多肉小仙女 🌿</div>
          <p className="mt-2 text-sm leading-5 text-ink-600">有什么植物问题都可以问我哦~</p>
        </div>
        <span className="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-full bg-leaf-50 text-4xl ring-8 ring-leaf-50/60">🤖</span>
      </div>
      <div className="mt-5 space-y-2">
        {questions.map((question) => (
          <Link key={question} href={`/search?q=${encodeURIComponent(question)}`} className="flex items-center gap-2 rounded-xl border border-leaf-100 bg-sand-50/80 px-4 py-3 text-sm text-ink-700 hover:bg-leaf-50">
            <Icon name="check-circle" size={13} className="text-ink-400" />
            {question}
          </Link>
        ))}
      </div>
      <div className="mt-5 flex h-12 items-center gap-2 rounded-xl border border-leaf-100 bg-white px-4 shadow-sm">
        <span className="min-w-0 flex-1 truncate text-sm text-ink-400">告诉我你的植物问题吧...</span>
        <Link href="/search?q=多肉养护问题" aria-label="发送" className="grid h-8 w-8 place-items-center rounded-full bg-leaf-600 text-white hover:bg-leaf-700">
          <Icon name="send" size={15} />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        <AiMiniAction icon="camera" label="拍照识别" href="/search?q=拍照识别多肉" />
        <AiMiniAction icon="plants" label="养护建议" href="/search?q=多肉养护建议" />
        <AiMiniAction icon="settings" label="配土方案" href="/search?q=多肉配土方案" />
        <AiMiniAction icon="arrow-right" label="更多" href="/search?q=多肉问题" />
      </div>
    </section>
  );
}

function AiChatCard() {
  return (
    <section className="rounded-2xl border border-leaf-100 bg-white p-5 shadow-[0_18px_48px_rgba(46,78,38,0.08)]">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-950">AI 助手</h2>
        <div className="flex items-center gap-3 text-ink-500">
          <span className="h-px w-3 bg-ink-400" />
          <Icon name="close" size={15} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="ml-auto max-w-[82%] rounded-2xl rounded-tr-md bg-leaf-100 px-4 py-3 text-sm text-ink-800">
          我的多肉叶片发软是什么原因?
          <div className="mt-1 text-right text-[10px] text-ink-500">10:24</div>
        </div>
        <div className="flex items-start gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf-50 text-lg">🤖</span>
          <div className="rounded-2xl rounded-tl-md bg-sand-50 px-4 py-3 text-sm leading-6 text-ink-700">
            叶片发软通常和控水、根系、光照有关。先检查盆土是否长期湿润，再看根部有没有腐烂；如果最近暴晒，也可能是应激脱水。
            <div className="mt-2 text-[10px] text-ink-500">10:24</div>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {['浇水过多怎么办', '根系检查教程', '叶片发软建议'].map((item) => (
          <Link key={item} href={`/search?q=${encodeURIComponent(item)}`} className="rounded-xl bg-leaf-50 px-3 py-2 text-xs text-leaf-800 hover:bg-leaf-100">
            {item}
          </Link>
        ))}
      </div>
      <div className="mt-4 flex h-12 items-center gap-2 rounded-xl border border-leaf-100 bg-white px-3 shadow-sm">
        <span className="flex-1 truncate text-sm text-ink-400">继续问我植物养护问题...</span>
        <Link href="/search?q=多肉图片诊断" aria-label="上传图片" className="text-ink-500 hover:text-leaf-700">
          <Icon name="image" size={17} />
        </Link>
        <Link href="/search?q=多肉拍照诊断" aria-label="拍照" className="text-ink-500 hover:text-leaf-700">
          <Icon name="camera" size={17} />
        </Link>
        <Link href="/search?q=多肉养护问题" aria-label="发送" className="grid h-8 w-8 place-items-center rounded-full bg-leaf-600 text-white hover:bg-leaf-700">
          <Icon name="send" size={15} />
        </Link>
      </div>
    </section>
  );
}

function AiMiniAction({ icon, label, href }: { icon: IconName; label: string; href: string }) {
  return (
    <Link href={href} className="grid gap-1 rounded-xl bg-leaf-50/70 px-1 py-2 text-center text-[11px] text-ink-700 hover:bg-leaf-100">
      <Icon name={icon} size={14} className="mx-auto text-leaf-700" />
      <span>{label}</span>
    </Link>
  );
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-ink-950">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-leaf-700">
        查看更多
        <Icon name="arrow-right" size={13} />
      </Link>
    </div>
  );
}

function normalizeTimelineDate(when: string, index: number) {
  if (when.includes('月')) return when;
  const days = [20, 18, 15, 12, 8];
  return `5月${days[index] ?? 6}日`;
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}.${day}`;
}
