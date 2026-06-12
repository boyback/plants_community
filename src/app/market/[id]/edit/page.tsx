import { notFound, redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { MarketListingForm, type MarketListingFormValue } from '@/components/market/MarketListingForm';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

export default async function MarketListingEditPage({ params }: {params: {id: string;};}) {
  const me = await getCurrentUser();
  if (!me) redirect(`/login?redirect=/market/${params.id}/edit`);

  const listing = await prisma.marketListing.findUnique({
    where: { id: params.id },
    include: {
      taxons: { orderBy: { id: 'asc' } },
      items: {
        where: { status: { not: 'off_shelf' } },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!listing) notFound();
  const tradeModes = await loadListingTradeModes(listing.id, listing.tradeMode);

  if (listing.sellerId !== me.id) {
    return (
      <Shell withSidebar={false}>
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={cx(styles.r_42536e69, styles.r_e83a7042)}>无权编辑</div>
          <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_69335b95)}>只能编辑自己发布的交易帖。</p>
        </div>
      </Shell>);

  }
  const itemMeta = await loadItemMeta(listing.items.map((item) => item.id));

  const initialValue: MarketListingFormValue = {
    id: listing.id,
    title: listing.title,
    taxons: listing.taxons.map((item) => ({
      categorySlug: item.categorySlug,
      genusSlug: item.genusSlug ?? '',
      speciesSlug: item.speciesSlug ?? '',
      label: item.label
    })),
    shipFrom: listing.shipFrom,
    description: listing.description ?? '',
    tradeMode: listing.tradeMode,
    tradeModes,
    externalUrl: listing.externalUrl ?? '',
    contactNote: listing.contactNote ?? '',
    tags: parseJsonArray(listing.tags),
    items: listing.items.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      stock: item.stock,
      mainHeadSize: itemMeta[item.id]?.mainHeadSize ?? '',
      overallSize: itemMeta[item.id]?.overallSize ?? '',
      potDiameter: itemMeta[item.id]?.potDiameter ?? '',
      taxons: itemMeta[item.id]?.taxons,
      tags: itemMeta[item.id]?.tags,
      images: parseJsonArray(item.images),
      description: item.description
    }))
  };

  return (
    <Shell withSidebar={false}>
      <MarketListingForm mode="edit" initialValue={initialValue} />
    </Shell>);

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

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function loadListingTradeModes(
id: string,
fallback: MarketListingFormValue['tradeMode'])
: Promise<MarketListingFormValue['tradeModes']> {
  try {
    const rows = await prisma.$queryRaw<Array<{tradeModes: string | null;}>>`
      SELECT tradeModes FROM market_listings WHERE id = ${id}
    `;
    const modes = parseJsonArray(rows[0]?.tradeModes).filter(
      (mode): mode is MarketListingFormValue['tradeMode'] =>
      mode === 'platform_escrow' || mode === 'online_payment' || mode === 'external'
    );
    return modes.length ? modes : [fallback];
  } catch {
    return [fallback];
  }
}