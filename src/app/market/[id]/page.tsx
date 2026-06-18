import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { UserIdentity } from '@/components/ui/UserIdentity';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import { ListingDetailClient, MarketListingComments, type MarketListingDetail } from './ListingDetailClient';
import { Prisma } from '@prisma/client';
import styles from './page.module.scss';



export const dynamic = "force-dynamic";

export default async function MarketListingPage({
  params,
  searchParams



}: {params: {id: string;};searchParams?: {item?: string;};}) {
  const me = await getCurrentUser();
  const raw = await prisma.marketListing.findUnique({
    where: { id: params.id },
    include: {
      seller: {
        include: {
          _count: { select: { posts: true, followers: true, following: true } },
          badges: { include: { badge: true } }
        }
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
              badges: { include: { badge: true } }
            }
          }
        }
      },
      items: {
        where: { status: { not: 'off_shelf' } },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!raw) notFound();
  await prisma.marketListing.update({
    where: { id: raw.id },
    data: { viewCount: { increment: 1 } }
  });
  const tradeModes = await loadListingTradeModes(raw.id, raw.tradeMode);
  const visibleItems = searchParams?.item ?
  raw.items.filter((item) => item.id === searchParams.item) :
  raw.items;
  const detailItems = visibleItems.length ? visibleItems : raw.items;
  const itemMeta = await loadItemMeta(detailItems.map((item) => item.id));

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
    itemCount: visibleItems.length || raw.itemCount,
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
      followingCount: raw.seller._count.following
    },
    genus: raw.genus ?? undefined,
    species: raw.species ?? undefined,
    taxons: raw.taxons.map((item) => ({
      categorySlug: item.categorySlug,
      genusSlug: item.genusSlug,
      speciesSlug: item.speciesSlug,
      label: item.label
    })),
    items: detailItems.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      stock: item.stock,
      soldCount: item.soldCount,
      mainHeadSize: itemMeta[item.id]?.mainHeadSize ?? '',
      overallSize: itemMeta[item.id]?.overallSize ?? '',
      potDiameter: itemMeta[item.id]?.potDiameter ?? '',
      taxons: itemMeta[item.id]?.taxons ?? [],
      tags: itemMeta[item.id]?.tags ?? [],
      cover: item.cover,
      images: parseJsonArray(item.images),
      description: item.description,
      status: item.status
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
        followingCount: comment.author._count.following
      }
    }))
  };

  const others = await prisma.marketListing.findMany({
    where: {
      id: { not: listing.id },
      status: 'on_sale',
      OR: [
      { sellerId: listing.seller.id },
      { category: listing.category },
      ...(raw.genusId ? [{ genusId: raw.genusId }] : [])]

    },
    orderBy: { createdAt: 'desc' },
    take: 4,
    select: { id: true, title: true, cover: true, minPrice: true, maxPrice: true }
  });

  const isMine = me?.id === raw.sellerId;

  return (
    <Shell withSidebar={false}>
      <div className={styles.breadcrumbs}>
        <Link href="/">首页</Link>
        <Icon name="arrow-right" size={12} />
        <Link href="/market">交易中心</Link>
        <Icon name="arrow-right" size={12} />
        <span>{listing.title}</span>
      </div>

      <div className={styles.detailPage}>
        <div className={styles.productStage}>
          <div className={styles.primaryArea}>
          {isMine &&
            <ButtonLink href={`/market/${listing.id}/edit`} variant="outline" size="sm">
              <Icon name="edit" size={13} />
              编辑
            </ButtonLink>
          }
            <ListingDetailClient listing={listing} />
          </div>
          <aside className={styles.sidebarCards}>
          <Card>
            <div className={styles.cardTitle}>卖家信息</div>
            <div className={styles.sellerRow}>
              <UserIdentity user={listing.seller} size="md" variant="list" />
              <div className={styles.sellerText}>
                {listing.seller.bio &&
                <div className={styles.sellerBio}>
                    {listing.seller.bio}
                  </div>
                }
              </div>
            </div>
            <div className={styles.sellerActions}>
              <ButtonLink href={`/user/${listing.seller.id}?tab=products`} variant="outline" size="sm" fullWidth>
                主页
              </ButtonLink>
              <ButtonLink href={`/messages?to=${listing.seller.id}`} variant="outline" size="sm" fullWidth>
                私信
              </ButtonLink>
            </div>
          </Card>

          {others.length > 0 &&
          <Card>
              <div className={styles.cardTitle}>相关交易</div>
              <div className={styles.relatedList}>
                {others.map((item) =>
              <Link key={item.id} href={`/market/${item.id}`} className={styles.relatedItem}>
                    <div className={styles.relatedCover}>
                      <Image src={item.cover} alt="" fill className={styles.relatedImage} unoptimized />
                    </div>
                    <div className={styles.relatedText}>
                      <div className={styles.relatedTitle}>{item.title}</div>
                      <div className={styles.relatedPrice}>
                        {item.maxPrice !== item.minPrice ?
                    `${formatPrice(item.minPrice)} - ${formatPrice(item.maxPrice)}` :
                    formatPrice(item.minPrice)}
                      </div>
                    </div>
                  </Link>
              )}
              </div>
            </Card>
          }

          <Card className={styles.tradeNotice}>
            <div>交易须知</div>
            <ul>
              <li>平台担保和在线支付会生成站内订单。</li>
              <li>在线支付收取 1% 手续费，买家支付金额不变。</li>
              <li>自行联系/三方平台交易不在站内付款，请自行确认风险。</li>
            </ul>
          </Card>
          </aside>
        </div>

        <div className={styles.commentsArea}>
          <MarketListingComments listing={listing} />
        </div>
      </div>
    </Shell>);

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
    const rows = await prisma.$queryRaw<Array<{tradeModes: string | null;}>>`
      SELECT tradeModes FROM market_listings WHERE id = ${id}
    `;
    const modes = parseJsonArray(rows[0]?.tradeModes).filter(
      (mode): mode is MarketListingDetail['tradeMode'] =>
      mode === 'platform_escrow' || mode === 'online_payment' || mode === 'external'
    );
    return modes.length ? modes : [fallback];
  } catch {
    return [fallback];
  }
}

type ItemTaxon = {
  categorySlug: string;
  genusSlug: string;
  speciesSlug: string;
  label?: string;
};

type ItemMeta = {
  mainHeadSize: string;
  overallSize: string;
  potDiameter: string;
  taxons?: ItemTaxon[];
  tags?: string[];
};

async function loadItemMeta(itemIds: string[]) {
  if (!itemIds.length) return {} as Record<string, ItemMeta>;
  try {
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      mainHeadSize: string | null;
      overallSize: string | null;
      potDiameter: string | null;
      taxons: string | null;
      tags: string | null;
    }>>`
      SELECT id, mainHeadSize, overallSize, potDiameter, taxons, tags
      FROM market_listing_items
      WHERE id IN (${Prisma.join(itemIds)})
    `;
    return rows.reduce<Record<string, ItemMeta>>((map, row) => {
      map[row.id] = {
        mainHeadSize: row.mainHeadSize ?? '',
        overallSize: row.overallSize ?? '',
        potDiameter: row.potDiameter ?? '',
        taxons: row.taxons === null ? undefined : parseItemTaxons(row.taxons),
        tags: row.tags === null ? undefined : parseJsonArray(row.tags)
      };
      return map;
    }, {});
  } catch {
    return {};
  }
}

function parseItemTaxons(raw: string | null | undefined): ItemTaxon[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.
    map((item) => ({
      categorySlug: typeof item?.categorySlug === 'string' ? item.categorySlug : '',
      genusSlug: typeof item?.genusSlug === 'string' ? item.genusSlug : '',
      speciesSlug: typeof item?.speciesSlug === 'string' ? item.speciesSlug : '',
      label: typeof item?.label === 'string' ? item.label : undefined
    })).
    filter((item) => item.categorySlug);
  } catch {
    return [];
  }
}
