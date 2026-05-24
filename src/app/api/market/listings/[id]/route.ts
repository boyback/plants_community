import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, stringifyJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { type MarketTradeMode } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ItemBody = z.object({
  id: z.string().optional(),
  title: z.string().min(2, '商品名称至少 2 个字').max(50, '商品名称不能超过 50 个字'),
  price: z.number().int().min(1, '价格必须大于 0'),
  stock: z.number().int().min(1).max(9999).default(1),
  images: z.array(z.string().url()).min(1, '每个商品至少上传一张图').max(9, '每个商品最多上传 9 张图'),
  description: z.string().min(2, '商品描述不能为空').max(2000),
});

const TaxonBody = z.object({
  categorySlug: z.string().min(1),
  genusSlug: z.string().optional().default(''),
  speciesSlug: z.string().optional().default(''),
  label: z.string().optional(),
});

const UpdateBody = z.object({
  title: z.string().min(2, '交易帖标题至少 2 个字').max(60, '交易帖标题不能超过 60 个字'),
  category: z.string().min(1, '请选择板块'),
  genus: z.string().optional(),
  species: z.string().optional(),
  taxons: z.array(TaxonBody).min(1).max(12),
  shipFrom: z.string().min(1, '请输入发货地').max(40),
  tags: z.array(z.string().min(1).max(20)).max(8).optional(),
  description: z.string().max(2000).optional(),
  tradeMode: z.enum(['platform_escrow', 'online_payment', 'external']).default('platform_escrow'),
  tradeModes: z.array(z.enum(['platform_escrow', 'online_payment', 'external'])).min(1).max(3).optional(),
  externalUrl: z.string().url().optional().or(z.literal('')),
  contactNote: z.string().max(500).optional(),
  items: z.array(ItemBody).min(1).max(20),
});

export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const id = pickListingId(req);
  const body = UpdateBody.parse(await req.json());
  const tradeModes = normalizeTradeModes(body.tradeModes, body.tradeMode);
  const taxons = normalizeTaxons(body);
  if (taxons.length === 0) return fail(400, '请选择至少一个板块或品种');

  const listing = await prisma.marketListing.findUnique({
    where: { id },
    select: { id: true, sellerId: true },
  });
  if (!listing) return fail(404, '交易帖不存在');
  if (listing.sellerId !== me.id) return fail(403, '只能编辑自己的交易帖');

  const boardSlugs = Array.from(new Set(taxons.map((item) => item.categorySlug)));
  const boardCount = await prisma.board.count({
    where: {
      slug: { in: boardSlugs },
      kind: 'family',
      enabled: true,
    },
  });
  if (boardCount !== boardSlugs.length) return fail(400, '请选择有效的植物板块');

  const [genus, species] = await Promise.all([
    taxons[0].genusSlug
      ? prisma.genus.findFirst({ where: { slug: taxons[0].genusSlug }, select: { id: true } })
      : null,
    taxons[0].speciesSlug
      ? prisma.species.findFirst({ where: { slug: taxons[0].speciesSlug }, select: { id: true } })
      : null,
  ]);

  const itemPrices = body.items.map((item) => item.price);
  const cover = body.items[0]?.images[0];
  if (!cover) return fail(400, '请至少上传一张商品图');

  await prisma.$transaction(async (tx) => {
    await tx.marketListing.update({
      where: { id },
      data: {
        title: body.title.trim(),
        category: taxons[0].categorySlug,
        genusId: genus?.id ?? null,
        speciesId: species?.id ?? null,
        shipFrom: body.shipFrom.trim(),
        tags: stringifyJson(body.tags ?? []),
        description: body.description?.trim() || null,
        tradeMode: tradeModes[0],
        externalUrl: tradeModes.includes('external') ? body.externalUrl || null : null,
        contactNote: body.contactNote?.trim() || null,
        cover,
        minPrice: Math.min(...itemPrices),
        maxPrice: Math.max(...itemPrices),
        itemCount: body.items.length,
      },
    });
    await tx.$executeRaw`
      UPDATE market_listings
      SET tradeModes = ${stringifyJson(tradeModes)}
      WHERE id = ${id}
    `;

    await tx.marketListingTaxon.deleteMany({ where: { listingId: id } });
    await tx.marketListingTaxon.createMany({
      data: taxons.map((item) => ({
        listingId: id,
        categorySlug: item.categorySlug,
        genusSlug: item.genusSlug || null,
        speciesSlug: item.speciesSlug || null,
        label: item.label || formatTaxonLabel(item),
      })),
    });

    const existingItems = await tx.marketListingItem.findMany({
      where: { listingId: id },
      select: { id: true },
    });
    const existingIds = new Set(existingItems.map((item) => item.id));
    const incomingIds = new Set(body.items.map((item) => item.id).filter((item): item is string => Boolean(item)));

    for (const item of body.items) {
      const data = {
        title: item.title.trim(),
        price: item.price,
        stock: item.stock,
        cover: item.images[0],
        images: stringifyJson(item.images),
        description: item.description.trim(),
        status: 'on_sale' as const,
      };

      if (item.id && existingIds.has(item.id)) {
        await tx.marketListingItem.update({
          where: { id: item.id },
          data,
        });
      } else {
        await tx.marketListingItem.create({
          data: {
            listingId: id,
            ...data,
          },
        });
      }
    }

    const removedIds = [...existingIds].filter((itemId) => !incomingIds.has(itemId));
    if (removedIds.length > 0) {
      await tx.marketListingItem.updateMany({
        where: { id: { in: removedIds }, listingId: id },
        data: { status: 'off_shelf' },
      });
    }
  });

  return { id };
});

function pickListingId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

function normalizeTradeModes(modes: MarketTradeMode[] | undefined, fallback: MarketTradeMode): MarketTradeMode[] {
  const allowed: MarketTradeMode[] = ['platform_escrow', 'online_payment', 'external'];
  const result = Array.from(new Set((modes?.length ? modes : [fallback]).filter((mode) => allowed.includes(mode))));
  return result.length ? result : [fallback];
}

function normalizeTaxons(body: z.infer<typeof UpdateBody>) {
  const seen = new Set<string>();
  return body.taxons
    .map((item) => ({
      categorySlug: item.categorySlug.trim(),
      genusSlug: item.genusSlug?.trim() || '',
      speciesSlug: item.speciesSlug?.trim() || '',
      label: item.label?.trim() || '',
    }))
    .filter((item) => {
      if (!item.categorySlug) return false;
      const key = `${item.categorySlug}:${item.genusSlug}:${item.speciesSlug}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function formatTaxonLabel(item: { categorySlug: string; genusSlug?: string; speciesSlug?: string }) {
  return [item.categorySlug, item.genusSlug, item.speciesSlug].filter(Boolean).join(' / ');
}
