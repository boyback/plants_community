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
import { Prisma } from '@prisma/client';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



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
      <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e, styles.r_359090c2, styles.r_69335b95)}>
        <Link href="/" className={styles.r_9825203a}>首页</Link>
        <Icon name="arrow-right" size={12} />
        <Link href="/market" className={styles.r_9825203a}>交易中心</Link>
        <Icon name="arrow-right" size={12} />
        <span className={cx(styles.r_f283ea9b, styles.r_eb6abb1f)}>{listing.title}</span>
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_0d304f90, styles.r_e7849c79)}>
        <main className={styles.r_3e7ce58d}>
          <section className={styles.r_c07e54fd}>
            <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_60541e1e, styles.r_8ef2268e, styles.r_1004c0c3)}>
              <h1 className={cx(styles.r_d5c9b000, styles.r_69450ef1, styles.r_399e11a5, styles.r_115ab7fe)}>{listing.title}</h1>
              {isMine &&
              <Link href={`/market/${listing.id}/edit`} className={cx(styles.r_23b4e5ed, styles.r_900c2a51, styles.r_dd702538)}>
                  <Icon name="edit" size={13} />
                  编辑
                </Link>
              }
            </div>

            <div className={cx(styles.r_0ab86672, styles.r_6ed543e2, styles.r_fc7473ca)}>
              <InfoRow label="板块品种">
                {listing.taxons.length > 0 ?
                <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_58284b4e)}>
                    {listing.taxons.map((taxon) =>
                  <span
                    key={`${taxon.categorySlug}:${taxon.genusSlug ?? ''}:${taxon.speciesSlug ?? ''}`}
                    className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_5f6a59f1)}>

                        {taxon.label}
                      </span>
                  )}
                  </div> :

                <span className={styles.r_7b89cd85}>未设置</span>
                }
              </InfoRow>
              <InfoRow label="发货地">
                <span className={styles.r_399e11a5}>{listing.shipFrom}</span>
              </InfoRow>
              <InfoRow label="说明">
                <div className={cx(styles.r_a2edcb1a, styles.r_7eff2faf, styles.r_eb6abb1f)}>
                  {listing.description || '无'}
                </div>
              </InfoRow>
              <InfoRow label="交易方式">
                <span className={cx(styles.r_ac204c10, styles.r_f2b23104, styles.r_d5eab218, styles.r_465609a2, styles.r_359090c2, styles.r_2689f395, styles.r_5f6a59f1)}>
                  {listing.tradeModes.map(tradeModeLabel).join(' / ')}
                </span>
              </InfoRow>
            </div>
          </section>

          <section className={styles.r_c07e54fd}>
            <h2 className={cx(styles.r_da019856, styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>商品信息</h2>
            <ListingDetailClient listing={listing} />
          </section>
        </main>

        <aside className={styles.r_3e7ce58d}>
          <section className={styles.r_8e63407b}>
            <div className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}>卖家信息</div>
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3)}>
              <Avatar src={listing.seller.avatar} alt={listing.seller.name} size={40} />
              <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                <UserName user={listing.seller} size="sm" />
                {listing.seller.bio &&
                <div className={cx(styles.r_15e1b1f4, styles.r_f50e2015, styles.r_d058ca6d, styles.r_69335b95)}>
                    {listing.seller.bio}
                  </div>
                }
              </div>
            </div>
            <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_77a2a20e)}>
              <Link href={`/user/${listing.seller.id}`} className={cx(styles.r_36e579c0, styles.r_86843cf1, styles.r_dd702538)}>
                主页
              </Link>
              <Link href={`/messages?to=${listing.seller.id}`} className={cx(styles.r_36e579c0, styles.r_86843cf1, styles.r_dd702538)}>
                私信
              </Link>
            </div>
          </section>

          {others.length > 0 &&
          <section className={styles.r_8e63407b}>
              <div className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}>相关交易</div>
              <div className={styles.r_6ed543e2}>
                {others.map((item) =>
              <Link key={item.id} href={`/market/${item.id}`} className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_5f22e64f, styles.r_7660b450, styles.r_5756b7b4)}>
                    <div className={cx(styles.r_d89972fe, styles.r_73a13409, styles.r_7e74e5fe, styles.r_012fbd12, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_7ebecbb6)}>
                      <Image src={item.cover} alt="" fill className={styles.r_7d85d0c2} unoptimized />
                    </div>
                    <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                      <div className={cx(styles.r_f50e2015, styles.r_359090c2, styles.r_2689f395)}>{item.title}</div>
                      <div className={cx(styles.r_15e1b1f4, styles.r_359090c2, styles.r_69450ef1, styles.r_595fceba)}>
                        {item.maxPrice !== item.minPrice ?
                    `${formatPrice(item.minPrice)} - ${formatPrice(item.maxPrice)}` :
                    formatPrice(item.minPrice)}
                      </div>
                    </div>
                  </Link>
              )}
              </div>
            </section>
          }

          <section className={cx(styles.r_8e63407b, styles.r_d058ca6d, styles.r_7054e276, styles.r_69335b95)}>
            <div className={cx(styles.r_65281709, styles.r_2689f395, styles.r_5f6a59f1)}>交易须知</div>
            <ul className={cx(styles.r_f242aff2, styles.r_1f33b438, styles.r_e2eedc57)}>
              <li>平台担保和在线支付会生成站内订单。</li>
              <li>在线支付收取 1% 手续费，买家支付金额不变。</li>
              <li>自行联系/三方平台交易不在站内付款，请自行确认风险。</li>
            </ul>
          </section>
        </aside>
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

function tradeModeLabel(mode: MarketListingDetail['tradeMode']) {
  if (mode === 'platform_escrow') return '平台担保';
  if (mode === 'online_payment') return '在线支付';
  return '自行联系';
}

function InfoRow({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div className={cx(styles.r_f3c543ad, styles.r_77a2a20e, styles.r_65fdbade, styles.r_88b684d2, styles.r_7fcf9124, styles.r_c2db4490, styles.r_dcd339c6, styles.r_2282296f)}>
      <div className={cx(styles.r_359090c2, styles.r_69335b95)}>{label}</div>
      <div className={styles.r_7e0b7cdf}>{children}</div>
    </div>);

}