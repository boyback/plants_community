import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { UserName } from '@/components/ui/UserName';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatPrice, timeAgo } from '@/lib/utils';
import { ListingDetailClient, type MarketListingDetail } from './ListingDetailClient';

export const dynamic = 'force-dynamic';

export default async function MarketListingPage({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  const raw = await prisma.marketListing.findUnique({
    where: { id: params.id },
    include: {
      seller: {
        include: {
          _count: { select: { posts: true, followers: true, following: true } },
          badges: { include: { badge: true } },
        },
      },
      genus: { select: { slug: true, name: true, cover: true } },
      species: { select: { slug: true, name: true } },
      taxons: { orderBy: { id: 'asc' } },
      items: {
        where: { status: { not: 'off_shelf' } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!raw) notFound();

  const listing: MarketListingDetail = {
    id: raw.id,
    title: raw.title,
    category: raw.category,
    shipFrom: raw.shipFrom,
    tags: parseJsonArray(raw.tags),
    description: raw.description ?? '',
    tradeMode: raw.tradeMode,
    externalUrl: raw.externalUrl ?? undefined,
    contactNote: raw.contactNote ?? undefined,
    cover: raw.cover,
    minPrice: raw.minPrice,
    maxPrice: raw.maxPrice,
    itemCount: raw.itemCount,
    status: raw.status,
    createdAt: raw.createdAt.toISOString(),
    seller: {
      id: raw.seller.id,
      name: raw.seller.name,
      avatar: raw.seller.avatar,
      bio: raw.seller.bio ?? undefined,
      level: raw.seller.level,
      exp: raw.seller.exp,
      joinedAt: raw.seller.joinedAt.toISOString(),
      role: raw.seller.role,
      vipExpireAt: raw.seller.vipExpireAt?.toISOString(),
      vipLifetime: raw.seller.vipLifetime,
      badges: [],
      postsCount: raw.seller._count.posts,
      followersCount: raw.seller._count.followers,
      followingCount: raw.seller._count.following,
    },
    genus: raw.genus ?? undefined,
    species: raw.species ?? undefined,
    taxons: raw.taxons.map((item) => ({
      categorySlug: item.categorySlug,
      genusSlug: item.genusSlug,
      speciesSlug: item.speciesSlug,
      label: item.label,
    })),
    items: raw.items.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      stock: item.stock,
      soldCount: item.soldCount,
      cover: item.cover,
      images: parseJsonArray(item.images),
      description: item.description,
      status: item.status,
    })),
  };

  const others = await prisma.marketListing.findMany({
    where: {
      id: { not: listing.id },
      status: 'on_sale',
      OR: [
        { sellerId: listing.seller.id },
        { category: listing.category },
        ...(raw.genusId ? [{ genusId: raw.genusId }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 4,
    select: { id: true, title: true, cover: true, minPrice: true, maxPrice: true },
  });

  const price = listing.maxPrice !== listing.minPrice
    ? `${formatPrice(listing.minPrice)} - ${formatPrice(listing.maxPrice)}`
    : formatPrice(listing.minPrice);
  const isMine = me?.id === raw.sellerId;

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-1.5 text-xs text-leaf-700/70">
        <Link href="/" className="hover:text-leaf-700">首页</Link>
        <Icon name="arrow-right" size={12} />
        <Link href="/market" className="hover:text-leaf-700">交易中心</Link>
        <Icon name="arrow-right" size={12} />
        <span className="truncate text-ink-700">{listing.title}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <main className="space-y-4">
          <section className="card overflow-hidden">
            <div className="relative aspect-[16/10] bg-leaf-50">
              <Image src={listing.cover} alt={listing.title} fill className="object-cover" unoptimized />
              <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-leaf-600 px-2 py-0.5 text-xs text-white">
                  {tradeModeLabel(listing.tradeMode)}
                </span>
                {listing.itemCount > 1 && (
                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs text-ink-700">
                    {listing.itemCount} 件商品
                  </span>
                )}
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-xl font-bold text-ink-800 md:text-2xl">{listing.title}</h1>
                {isMine && (
                  <Link href={`/market/${listing.id}/edit`} className="btn-outline !px-3 !py-1.5 !text-xs">
                    <Icon name="edit" size={13} />
                    编辑
                  </Link>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-3xl font-bold text-rose-600">{price}</span>
                <span className="text-xs text-leaf-700/70">{timeAgo(listing.createdAt)}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 rounded-xl bg-leaf-50/50 p-3 text-xs">
                <Stat label="发货地" value={listing.shipFrom} />
                <Stat label="商品数" value={listing.itemCount} />
                <Stat label="交易方式" value={tradeModeLabel(listing.tradeMode)} />
              </div>
              {listing.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {listing.tags.map((tag) => (
                    <span key={tag} className="chip text-[11px]">#{tag}</span>
                  ))}
                </div>
              )}
              {listing.taxons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {listing.taxons.map((taxon) => (
                    <span
                      key={`${taxon.categorySlug}:${taxon.genusSlug ?? ''}:${taxon.speciesSlug ?? ''}`}
                      className="rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] text-leaf-700"
                    >
                      {taxon.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {listing.description && (
            <section className="card p-5">
              <h2 className="mb-3 text-base font-semibold text-ink-800">交易说明</h2>
              <div className="whitespace-pre-wrap text-sm leading-7 text-ink-700">{listing.description}</div>
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-4 text-base font-semibold text-ink-800">商品清单</h2>
            <ListingDetailClient listing={listing} />
          </section>
        </main>

        <aside className="space-y-4">
          <section className="card p-4">
            <div className="mb-3 text-sm font-semibold">卖家信息</div>
            <div className="flex items-center gap-3">
              <Avatar src={listing.seller.avatar} alt={listing.seller.name} size={40} />
              <div className="min-w-0 flex-1">
                <UserName user={listing.seller} size="sm" />
                {listing.seller.bio && (
                  <div className="mt-0.5 line-clamp-1 text-[11px] text-leaf-700/70">
                    {listing.seller.bio}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link href={`/user/${listing.seller.id}`} className="btn-outline flex-1 justify-center !text-xs">
                主页
              </Link>
              <Link href={`/messages?to=${listing.seller.id}`} className="btn-primary flex-1 justify-center !text-xs">
                私信
              </Link>
            </div>
          </section>

          {others.length > 0 && (
            <section className="card p-4">
              <div className="mb-3 text-sm font-semibold">相关交易</div>
              <div className="space-y-3">
                {others.map((item) => (
                  <Link key={item.id} href={`/market/${item.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-leaf-50">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-leaf-50">
                      <Image src={item.cover} alt="" fill className="object-cover" unoptimized />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 text-xs font-medium">{item.title}</div>
                      <div className="mt-0.5 text-xs font-bold text-rose-600">
                        {item.maxPrice !== item.minPrice
                          ? `${formatPrice(item.minPrice)} - ${formatPrice(item.maxPrice)}`
                          : formatPrice(item.minPrice)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="card p-4 text-[11px] leading-5 text-leaf-700/70">
            <div className="mb-1 font-medium text-leaf-700">交易须知</div>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>平台担保和在线支付会生成站内订单。</li>
              <li>在线支付收取 1% 手续费，买家支付金额不变。</li>
              <li>自行联系/三方平台交易不在站内付款，请自行确认风险。</li>
            </ul>
          </section>
        </aside>
      </div>
    </Shell>
  );
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function tradeModeLabel(mode: MarketListingDetail['tradeMode']) {
  if (mode === 'platform_escrow') return '平台担保';
  if (mode === 'online_payment') return '在线支付';
  return '自行联系';
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-leaf-700/70">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-ink-800">{value}</div>
    </div>
  );
}
