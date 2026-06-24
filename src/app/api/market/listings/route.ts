import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, stringifyJson, jsonWithUserPendants } from '@/lib/api';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { hasUserPermission } from '@/lib/permissions';
import { Prisma, type AuctionStatus, type MarketListingStatus, type MarketTradeMode } from '@prisma/client';

export const dynamic = 'force-dynamic';

const OTHER_KEYWORDS: Record<string, string[]> = {
  tools: ['工具', '剪刀', '镊子', '喷壶'],
  pot: ['盆', '盆器', '陶盆', '塑料盆'],
  soil: ['土', '颗粒', '泥炭', '配土'],
  fertilizer: ['肥料', '肥', '缓释'],
  kit: ['套装', '入门', '礼盒'],
};

const CreateItemBody = z.object({
  title: z.string().min(2, '商品名称至少 2 个字').max(50, '商品名称不能超过 50 个字'),
  price: z.number().int().min(1, '价格必须大于 0'),
  stock: z.number().int().min(1).max(9999).default(1),
  mainHeadSize: z.string().max(40).optional(),
  overallSize: z.string().max(40).optional(),
  potDiameter: z.string().max(40).optional(),
  taxons: z.array(z.object({
    categorySlug: z.string().min(1),
    genusSlug: z.string().optional().default(''),
    speciesSlug: z.string().optional().default(''),
    label: z.string().optional(),
  })).min(1).max(12).optional(),
  tags: z.array(z.string().min(1).max(20)).max(8).optional(),
  images: z.array(z.string().url()).min(1, '每个商品至少上传一张图').max(9, '每个商品最多上传 9 张图'),
  description: z.string().min(2, '商品描述不能为空').max(2000),
});

const CreateTaxonBody = z.object({
  categorySlug: z.string().min(1),
  genusSlug: z.string().optional().default(''),
  speciesSlug: z.string().optional().default(''),
  label: z.string().optional(),
});

const CreateListingBody = z.object({
  title: z.string().min(2, '交易帖标题至少 2 个字').max(60, '交易帖标题不能超过 60 个字'),
  category: z.string().min(1, '请选择板块'),
  genus: z.string().optional(),
  species: z.string().optional(),
  taxons: z.array(CreateTaxonBody).min(1).max(12).optional(),
  shipFrom: z.string().min(1, '请输入发货地').max(40),
  tags: z.array(z.string().min(1).max(20)).max(8).optional(),
  description: z.string().max(2000).optional(),
  tradeMode: z.enum(['platform_escrow', 'online_payment', 'external']).default('online_payment'),
  tradeModes: z.array(z.enum(['platform_escrow', 'online_payment', 'external'])).min(1).max(3).optional(),
  externalUrl: z.string().max(500).optional().or(z.literal('')),
  contactNote: z.string().max(500).optional(),
  items: z.array(CreateItemBody).min(1).max(20),
});

export async function GET(req: Request) {
  try {
    const me = await getCurrentUser().catch(() => null);
    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim() || '';
    const family = url.searchParams.get('family')?.trim() || '';
    const genus = url.searchParams.get('genus')?.trim() || '';
    const species = url.searchParams.get('species')?.trim() || '';
    const other = url.searchParams.get('other')?.trim() || '';
    const priceMin = Number(url.searchParams.get('priceMin') || 0);
    const priceMax = Number(url.searchParams.get('priceMax') || 0);
    const type = url.searchParams.get('type') || 'all';
    const sort = url.searchParams.get('sort') || 'latest';
    const limit = Math.min(60, Math.max(10, Number(url.searchParams.get('limit') || 30)));

    const qFilters = q
      ? [
          { title: { contains: q } },
          { description: { contains: q } },
          { tags: { contains: q } },
          { shipFrom: { contains: q } },
          { items: { some: { title: { contains: q } } } },
          { items: { some: { description: { contains: q } } } },
        ]
      : [];

    const taxonNeedles = [family, genus, species].filter(Boolean);
    let taxonNames: string[] = [];
    if (taxonNeedles.length) {
      const [fams, gens, sps] = await Promise.all([
        family ? prisma.board.findMany({ where: { slug: family }, select: { name: true } }) : [],
        genus ? prisma.genus.findMany({ where: { slug: genus }, select: { name: true } }) : [],
        species ? prisma.species.findMany({ where: { slug: species }, select: { name: true, latinName: true } }) : [],
      ]);
      taxonNames = [
        ...fams.map((x) => x.name),
        ...gens.map((x) => x.name),
        ...sps.flatMap((x) => [x.name, x.latinName].filter(Boolean) as string[]),
      ];
    }

    const taxonAll = [...taxonNeedles, ...taxonNames];
    const andFilters: unknown[] = [];
    if (qFilters.length) andFilters.push({ OR: qFilters });
    if (family) {
      andFilters.push({
        OR: [
          { category: family },
          { taxons: { some: { categorySlug: family } } },
        ],
      });
    }
    if (genus) {
      andFilters.push({
        OR: [
          { genus: { slug: genus } },
          { taxons: { some: { genusSlug: genus } } },
        ],
      });
    }
    if (species) {
      andFilters.push({
        OR: [
          { species: { slug: species } },
          { taxons: { some: { speciesSlug: species } } },
        ],
      });
    }
    if (taxonAll.length) {
      andFilters.push({
        OR: taxonAll.flatMap((value) => [
          { title: { contains: value } },
          { description: { contains: value } },
          { tags: { contains: value } },
        ]),
      });
    }
    if (other && OTHER_KEYWORDS[other]) {
      andFilters.push({
        OR: OTHER_KEYWORDS[other].flatMap((value) => [
          { title: { contains: value } },
          { description: { contains: value } },
          { tags: { contains: value } },
          { items: { some: { title: { contains: value } } } },
        ]),
      });
    }

    let products: ListingItem[] = [];
    if (type === 'all' || type === 'product') {
      const where: Record<string, unknown> = {
        status: { in: ['on_sale', 'trading', 'sold_out'] as MarketListingStatus[] },
      };
      if (priceMin) where.maxPrice = { ...(where.maxPrice as object), gte: priceMin };
      if (priceMax) where.minPrice = { ...(where.minPrice as object), lte: priceMax };
      if (andFilters.length) where.AND = andFilters;

      const list = await prisma.marketListing.findMany({
        where,
        orderBy:
          sort === 'price_asc' ? [{ minPrice: 'asc' }] :
          sort === 'price_desc' ? [{ minPrice: 'desc' }] :
          sort === 'oldest' ? [{ createdAt: 'asc' }] :
          [{ createdAt: 'desc' }],
        take: limit,
        select: {
          id: true,
          status: true,
          title: true,
          description: true,
          cover: true,
          minPrice: true,
          maxPrice: true,
          itemCount: true,
          viewCount: true,
          commentCount: true,
          tradeMode: true,
          createdAt: true,
          shipFrom: true,
          tags: true,
          seller: { select: { id: true, name: true, avatar: true, equipPendantId: true } },
          genus: { select: { slug: true, name: true, cover: true } },
          items: {
            where: { status: { not: 'off_shelf' } },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              status: true,
              title: true,
              description: true,
              price: true,
              stock: true,
              cover: true,
              images: true,
              createdAt: true,
            },
          },
          taxons: {
            orderBy: { id: 'asc' },
            select: { categorySlug: true, genusSlug: true, speciesSlug: true, label: true },
          },
        },
      });

      const tradeModesMap = await loadListingTradeModes(list.map((item) => item.id));
      const itemMetaMap = await loadItemMeta(list.flatMap((item) => item.items.map((product) => product.id)));
      products = list.flatMap((p) => {
        const listingTags = parseJsonArray(p.tags);
        return p.items
          .map((item) => {
            const meta = itemMetaMap[item.id];
            const itemTaxons = meta?.taxons;
            const itemTags = meta?.tags;
            const images = parseJsonArray(item.images);
            return {
              type: 'product' as const,
              id: item.id,
              listingId: p.id,
              itemId: item.id,
              title: item.title,
              description: item.description || p.description || undefined,
              cover: item.cover,
              images: images.length ? images : [item.cover],
              price: item.price,
              itemCount: 1,
              status: item.status,
              listingStatus: p.status,
              views: p.viewCount,
              comments: p.commentCount,
              tradeMode: p.tradeMode,
              tradeModes: tradeModesMap[p.id] ?? [p.tradeMode],
              createdAt: item.createdAt.toISOString(),
              url: `/market/${p.id}?item=${item.id}`,
              shipFrom: p.shipFrom,
              seller: p.seller,
              tags: itemTags ?? listingTags,
              genus: p.genus || undefined,
              taxons: itemTaxons ?? p.taxons,
              stock: item.stock,
              collected: false,
            };
          })
          .filter((item) => {
            if (priceMin && item.price < priceMin) return false;
            if (priceMax && item.price > priceMax) return false;
            if (!matchesItemTaxon(item.taxons, family, genus, species)) return false;
            return true;
          });
      });
    }

    let auctions: ListingItem[] = [];
    if (type === 'all' || type === 'auction') {
      const where: Record<string, unknown> = {
        status: { in: ['live', 'scheduled'] as AuctionStatus[] },
      };
      if (priceMin) where.currentPrice = { ...(where.currentPrice as object), gte: priceMin };
      if (priceMax) where.currentPrice = { ...(where.currentPrice as object), lte: priceMax };

      const auctionAndFilters: unknown[] = [];
      if (q) auctionAndFilters.push({ OR: [{ title: { contains: q } }, { tags: { contains: q } }] });
      if (genus) auctionAndFilters.push({ genus: { slug: genus } });
      if (taxonAll.length) {
        auctionAndFilters.push({
          OR: taxonAll.flatMap((value) => [
            { title: { contains: value } },
            { tags: { contains: value } },
          ]),
        });
      }
      if (auctionAndFilters.length) where.AND = auctionAndFilters;

      const list = await prisma.auction.findMany({
        where,
        orderBy:
          sort === 'price_asc' ? [{ currentPrice: 'asc' }] :
          sort === 'price_desc' ? [{ currentPrice: 'desc' }] :
          sort === 'oldest' ? [{ createdAt: 'asc' }] :
          [{ createdAt: 'desc' }],
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          cover: true,
          images: true,
          tags: true,
          currentPrice: true,
          createdAt: true,
          endAt: true,
          seller: { select: { id: true, name: true, avatar: true, equipPendantId: true } },
          bidCount: true,
          genus: { select: { slug: true, name: true, cover: true } },
        },
      });

      auctions = list.map((a) => ({
        type: 'auction',
        id: a.id,
        title: a.title,
        description: a.description || undefined,
        cover: a.cover,
        images: parseJsonArray(a.images),
        price: a.currentPrice,
        createdAt: a.createdAt.toISOString(),
        endAt: a.endAt.toISOString(),
        url: `/auction/${a.id}`,
        seller: a.seller,
        tags: parseJsonArray(a.tags),
        comments: a.bidCount,
        genus: a.genus || undefined,
      }));
    }

    const merged = [...products, ...auctions];
    if (me) {
      const productIds = merged.flatMap((item) => item.type === 'product' && item.itemId ? [item.itemId] : []);
      if (productIds.length) {
        const rows = await prisma.$queryRaw<Array<{ itemId: string }>>`
          SELECT itemId FROM market_listing_item_collects
          WHERE userId = ${me.id} AND itemId IN (${Prisma.join(productIds)})
        `;
        const collectedIds = new Set(rows.map((row) => row.itemId));
        for (const item of merged) {
          if (item.type === 'product' && item.itemId) {
            item.collected = collectedIds.has(item.itemId);
          }
        }
      }
      const sellerIds = Array.from(new Set(
        merged
          .map((item) => item.seller?.id)
          .filter((id): id is string => !!id && id !== me.id),
      ));
      if (sellerIds.length) {
        const follows = await prisma.follow.findMany({
          where: { followerId: me.id, followeeId: { in: sellerIds } },
          select: { followeeId: true },
        });
        const followedSellerIds = new Set(follows.map((item) => item.followeeId));
        for (const item of merged) {
          if (item.seller) {
            item.seller = { ...item.seller, followed: followedSellerIds.has(item.seller.id) };
          }
        }
      }
    }
    merged.sort((x, y) => {
      if (sort === 'price_asc') return x.price - y.price;
      if (sort === 'price_desc') return y.price - x.price;
      if (sort === 'oldest') return new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime();
      return new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime();
    });

    return jsonWithUserPendants({ ok: true, data: { items: merged.slice(0, limit) } });
  } catch (error) {
    console.error('Error in /api/market/listings:', error);
    return Response.json(
      { ok: false, error: { message: error instanceof Error ? error.message : 'Internal server error' } },
      { status: 500 },
    );
  }
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  if (!(await hasUserPermission(me, 'market:sell'))) {
    return fail(403, '当前等级不允许在交易区出售，升到 Lv.8 后可解锁');
  }

  const body = CreateListingBody.parse(await req.json());
  const tradeModes = normalizeTradeModes(body.tradeModes, body.tradeMode);
  const cover = body.items[0]?.images[0];
  if (!cover) return fail(400, '请至少上传一张商品图');
  const taxons = normalizeTaxons(body);

  const board = await prisma.board.findFirst({
    where: {
      slug: taxons[0].categorySlug,
      kind: 'family',
      enabled: true,
    },
    select: { id: true },
  });
  if (!board) return fail(400, '请选择有效的植物板块');

  const boardCount = await prisma.board.count({
    where: {
      slug: { in: Array.from(new Set(taxons.map((item) => item.categorySlug))) },
      kind: 'family',
      enabled: true,
    },
  });
  if (boardCount !== new Set(taxons.map((item) => item.categorySlug)).size) {
    return fail(400, '请选择有效的植物板块');
  }

  const listingIds: string[] = [];

  for (const item of body.items) {
    const itemTaxons = normalizeTaxonList(item.taxons?.length ? item.taxons : taxons);
    const [genus, species] = await Promise.all([
      itemTaxons[0].genusSlug
        ? prisma.genus.findFirst({ where: { slug: itemTaxons[0].genusSlug }, select: { id: true } })
        : null,
      itemTaxons[0].speciesSlug
        ? prisma.species.findFirst({ where: { slug: itemTaxons[0].speciesSlug }, select: { id: true } })
        : null,
    ]);
    const listingTags = item.tags ?? body.tags ?? [];

    const listing = await prisma.marketListing.create({
      data: {
        sellerId: me.id,
        title: item.title.trim(),
        category: itemTaxons[0].categorySlug,
        genusId: genus?.id ?? null,
        speciesId: species?.id ?? null,
        shipFrom: body.shipFrom.trim(),
        tags: stringifyJson(listingTags),
        description: item.description.trim() || body.description?.trim() || null,
        tradeMode: tradeModes[0],
        externalUrl: tradeModes.includes('external') ? body.externalUrl || null : null,
        contactNote: body.contactNote?.trim() || null,
        cover: item.images[0],
        minPrice: item.price,
        maxPrice: item.price,
        itemCount: 1,
        status: 'on_sale',
        items: {
          create: [{
            title: item.title.trim(),
            price: item.price,
            stock: item.stock,
            cover: item.images[0],
            images: stringifyJson(item.images),
            description: item.description.trim(),
            status: 'on_sale',
          }],
        },
        taxons: {
          create: itemTaxons.map((taxon) => ({
            categorySlug: taxon.categorySlug,
            genusSlug: taxon.genusSlug || null,
            speciesSlug: taxon.speciesSlug || null,
            label: taxon.label || formatTaxonLabel(taxon),
          })),
        },
      },
      select: { id: true },
    });

    await prisma.$executeRaw`
      UPDATE market_listings
      SET tradeModes = ${stringifyJson(tradeModes)}
      WHERE id = ${listing.id}
    `;

    await saveItemMeasurements(listing.id, [{ ...item, taxons: itemTaxons, tags: listingTags }]);
    listingIds.push(listing.id);
  }

  return { id: listingIds[0], ids: listingIds };
});

interface ListingItem {
  type: 'product' | 'auction';
  id: string;
  title: string;
  description?: string;
  cover: string;
  images?: string[];
  price: number;
  maxPrice?: number;
  itemCount?: number;
  listingId?: string;
  itemId?: string;
  tradeMode?: MarketTradeMode;
  tradeModes?: MarketTradeMode[];
  originalPrice?: number | null;
  createdAt: string;
  endAt?: string;
  url: string;
  shipFrom?: string | null;
  seller?: {
    id: string;
    name: string;
    avatar: string;
    followed?: boolean;
  } | null;
  tags?: string[];
  taxons?: {
    categorySlug: string;
    genusSlug: string | null;
    speciesSlug: string | null;
    label: string;
  }[];
  products?: {
    id: string;
    title: string;
    description: string;
    price: number;
    stock: number;
    collectCount?: number;
    collected?: boolean;
    cover: string;
    images: string[];
  }[];
  stock?: number;
  collected?: boolean;
  genus?: {
    slug: string;
    name: string;
    cover?: string | null;
  } | null;
  views?: number;
  comments?: number;
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

function normalizeTradeModes(modes: MarketTradeMode[] | undefined, fallback: MarketTradeMode): MarketTradeMode[] {
  const allowed: MarketTradeMode[] = ['online_payment', 'external'];
  const selected = modes?.length ? modes : [fallback];
  const normalized = selected.map((mode) => mode === 'platform_escrow' ? 'online_payment' : mode);
  const result = Array.from(new Set(normalized.filter((mode) => allowed.includes(mode))));
  return Array.from(new Set(['online_payment' as MarketTradeMode, ...result]));
}

async function loadListingTradeModes(ids: string[]) {
  if (!ids.length) return {} as Record<string, MarketTradeMode[]>;
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; tradeMode: MarketTradeMode; tradeModes: string | null }>>`
      SELECT id, tradeMode, tradeModes FROM market_listings WHERE id IN (${Prisma.join(ids)})
    `;
    return rows.reduce<Record<string, MarketTradeMode[]>>((map, row) => {
      map[row.id] = normalizeTradeModes(parseJsonArray(row.tradeModes) as MarketTradeMode[], row.tradeMode);
      return map;
    }, {});
  } catch {
    return {};
  }
}

function collectListingImages(items: { cover: string; images: string }[], fallback: string) {
  const images = items.flatMap((item) => {
    const parsed = parseJsonArray(item.images);
    return parsed.length ? parsed : [item.cover];
  });
  return Array.from(new Set([fallback, ...images])).slice(0, 4);
}

type ItemTaxon = {
  categorySlug: string;
  genusSlug: string | null;
  speciesSlug: string | null;
  label: string;
};

async function loadItemMeta(itemIds: string[]) {
  if (!itemIds.length) return {} as Record<string, { taxons?: ItemTaxon[]; tags?: string[] }>;
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; taxons: string | null; tags: string | null }>>`
      SELECT id, taxons, tags
      FROM market_listing_items
      WHERE id IN (${Prisma.join(itemIds)})
    `;
    return rows.reduce<Record<string, { taxons?: ItemTaxon[]; tags?: string[] }>>((map, row) => {
      map[row.id] = {
        taxons: row.taxons === null ? undefined : parseItemTaxons(row.taxons),
        tags: row.tags === null ? undefined : parseJsonArray(row.tags),
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
    return value
      .map((item) => ({
        categorySlug: typeof item?.categorySlug === 'string' ? item.categorySlug : '',
        genusSlug: typeof item?.genusSlug === 'string' && item.genusSlug ? item.genusSlug : null,
        speciesSlug: typeof item?.speciesSlug === 'string' && item.speciesSlug ? item.speciesSlug : null,
        label: typeof item?.label === 'string' ? item.label : formatTaxonLabel({
          categorySlug: typeof item?.categorySlug === 'string' ? item.categorySlug : '',
          genusSlug: typeof item?.genusSlug === 'string' ? item.genusSlug : '',
          speciesSlug: typeof item?.speciesSlug === 'string' ? item.speciesSlug : '',
        }),
      }))
      .filter((item) => item.categorySlug);
  } catch {
    return [];
  }
}

function matchesItemTaxon(
  taxons: ItemTaxon[] | undefined,
  family: string,
  genus: string,
  species: string,
) {
  if (!family && !genus && !species) return true;
  const list = taxons ?? [];
  if (list.length === 0) return true;
  return list.some((item) => {
    if (family && item.categorySlug !== family) return false;
    if (genus && item.genusSlug !== genus) return false;
    if (species && item.speciesSlug !== species) return false;
    return true;
  });
}

async function saveItemMeasurements(
  listingId: string,
  items: Array<{
    mainHeadSize?: string;
    overallSize?: string;
    potDiameter?: string;
    taxons?: Array<{
      categorySlug: string;
      genusSlug?: string;
      speciesSlug?: string;
      label?: string;
    }>;
    tags?: string[];
  }>,
) {
  try {
    const rows = await prisma.marketListingItem.findMany({
      where: { listingId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    for (let index = 0; index < rows.length && index < items.length; index += 1) {
      const item = items[index];
      await prisma.$executeRaw`
        UPDATE market_listing_items
        SET mainHeadSize = ${item.mainHeadSize?.trim() || null},
            overallSize = ${item.overallSize?.trim() || null},
            potDiameter = ${item.potDiameter?.trim() || null},
            taxons = ${item.taxons?.length ? stringifyJson(item.taxons) : null},
            tags = ${stringifyJson(item.tags ?? [])}
        WHERE id = ${rows[index].id}
      `;
    }
  } catch {
    // Columns may not exist before the next Prisma db push; do not block publishing.
  }
}

function normalizeTaxons(body: z.infer<typeof CreateListingBody>) {
  const source = body.taxons?.length
    ? body.taxons
    : [{
        categorySlug: body.category,
        genusSlug: body.genus || '',
        speciesSlug: body.species || '',
        label: undefined,
      }];

  return normalizeTaxonList(source);
}

function normalizeTaxonList(source: Array<{
  categorySlug: string;
  genusSlug?: string;
  speciesSlug?: string;
  label?: string;
}>) {
  const seen = new Set<string>();
  return source
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
