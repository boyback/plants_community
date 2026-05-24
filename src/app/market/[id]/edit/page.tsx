import { notFound, redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { MarketListingForm, type MarketListingFormValue } from '@/components/market/MarketListingForm';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function MarketListingEditPage({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect(`/login?redirect=/market/${params.id}/edit`);

  const listing = await prisma.marketListing.findUnique({
    where: { id: params.id },
    include: {
      taxons: { orderBy: { id: 'asc' } },
      items: {
        where: { status: { not: 'off_shelf' } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!listing) notFound();
  const tradeModes = await loadListingTradeModes(listing.id, listing.tradeMode);

  if (listing.sellerId !== me.id) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-lg font-semibold">无权编辑</div>
          <p className="mt-1 text-sm text-leaf-700/70">只能编辑自己发布的交易帖。</p>
        </div>
      </Shell>
    );
  }

  const initialValue: MarketListingFormValue = {
    id: listing.id,
    title: listing.title,
    taxons: listing.taxons.map((item) => ({
      categorySlug: item.categorySlug,
      genusSlug: item.genusSlug ?? '',
      speciesSlug: item.speciesSlug ?? '',
      label: item.label,
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
      images: parseJsonArray(item.images),
      description: item.description,
    })),
  };

  return (
    <Shell>
      <MarketListingForm mode="edit" initialValue={initialValue} />
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

async function loadListingTradeModes(
  id: string,
  fallback: MarketListingFormValue['tradeMode'],
): Promise<MarketListingFormValue['tradeModes']> {
  try {
    const rows = await prisma.$queryRaw<Array<{ tradeModes: string | null }>>`
      SELECT tradeModes FROM market_listings WHERE id = ${id}
    `;
    const modes = parseJsonArray(rows[0]?.tradeModes).filter(
      (mode): mode is MarketListingFormValue['tradeMode'] =>
        mode === 'platform_escrow' || mode === 'online_payment' || mode === 'external',
    );
    return modes.length ? modes : [fallback];
  } catch {
    return [fallback];
  }
}
