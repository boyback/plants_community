import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { UserName } from '@/components/ui/UserName';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
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
      comments: {
        where: { deleted: false },
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: {
          author: {
            include: {
              _count: { select: { posts: true, followers: true, following: true } },
              badges: { include: { badge: true } },
            },
          },
        },
      },
      items: {
        where: { status: { not: 'off_shelf' } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!raw) notFound();
  await prisma.marketListing.update({
    where: { id: raw.id },
    data: { viewCount: { increment: 1 } },
  });
  const tradeModes = await loadListingTradeModes(raw.id, raw.tradeMode);

  const listing: MarketListingDetail = {
    id: raw.id,
    title: raw.title,
    category: raw.category,
    shipFrom: raw.shipFrom,
    tags: parseJsonArray(raw.tags),
    description: raw.description ?? '',
    tradeMode: raw.tradeMode,
    tradeModes,
    externalUrl: raw.externalUrl ?? undefined,
    contactNote: raw.contactNote ?? undefined,
    cover: raw.cover,
    minPrice: raw.minPrice,
    maxPrice: raw.maxPrice,
    itemCount: raw.itemCount,
    viewCount: raw.viewCount + 1,
    commentCount: raw.commentCount,
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
    comments: raw.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: {
        id: comment.author.id,
        name: comment.author.name,
        avatar: comment.author.avatar,
        level: comment.author.level,
        role: comment.author.role,
        vipExpireAt: comment.author.vipExpireAt?.toISOString(),
        vipLifetime: comment.author.vipLifetime,
        badges: [],
        postsCount: comment.author._count.posts,
        followersCount: comment.author._count.followers,
        followingCount: comment.author._count.following,
      },
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

  const isMine = me?.id === raw.sellerId;

  return (
    <Shell withSidebar={false}>
      <div className="mb-4 flex items-center gap-1.5 text-xs text-leaf-700/70">
        <Link href="/" className="hover:text-leaf-700">首页</Link>
        <Icon name="arrow-right" size={12} />
        <Link href="/market" className="hover:text-leaf-700">交易中心</Link>
        <Icon name="arrow-right" size={12} />
        <span className="truncate text-ink-700">{listing.title}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <main className="space-y-4">
          <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-xl font-bold text-ink-800 md:text-2xl">{listing.title}</h1>
              {isMine && (
                <Link href={`/market/${listing.id}/edit`} className="btn-outline !px-3 !py-1.5 !text-xs">
                  <Icon name="edit" size={13} />
                  编辑
                </Link>
              )}
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <InfoRow label="板块品种">
                {listing.taxons.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {listing.taxons.map((taxon) => (
                      <span
                        key={`${taxon.categorySlug}:${taxon.genusSlug ?? ''}:${taxon.speciesSlug ?? ''}`}
                        className="rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] text-leaf-700"
                      >
                        {taxon.label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-ink-500">未设置</span>
                )}
              </InfoRow>
              <InfoRow label="发货地">
                <span className="text-ink-800">{listing.shipFrom}</span>
              </InfoRow>
              <InfoRow label="说明">
                <div className="whitespace-pre-wrap leading-7 text-ink-700">
                  {listing.description || '无'}
                </div>
              </InfoRow>
              <InfoRow label="交易方式">
                <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-xs font-medium text-leaf-700">
                  {listing.tradeModes.map(tradeModeLabel).join(' / ')}
                </span>
              </InfoRow>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-base font-semibold text-ink-800">商品信息</h2>
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

async function loadListingTradeModes(id: string, fallback: MarketListingDetail['tradeMode']) {
  try {
    const rows = await prisma.$queryRaw<Array<{ tradeModes: string | null }>>`
      SELECT tradeModes FROM market_listings WHERE id = ${id}
    `;
    const modes = parseJsonArray(rows[0]?.tradeModes).filter(
      (mode): mode is MarketListingDetail['tradeMode'] =>
        mode === 'platform_escrow' || mode === 'online_payment' || mode === 'external',
    );
    return modes.length ? modes : [fallback];
  } catch {
    return [fallback];
  }
}

function tradeModeLabel(mode: MarketListingDetail['tradeMode']) {
  if (mode === 'platform_escrow') return '平台担保';
  if (mode === 'online_payment') return '在线支付';
  return '自行联系';
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-leaf-100 pb-3 last:border-0 last:pb-0 sm:grid-cols-[72px_1fr]">
      <div className="text-xs text-leaf-700/70">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
