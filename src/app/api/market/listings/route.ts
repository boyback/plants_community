import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, stringifyJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { hasUserPermission } from '@/lib/permissions';
import type { AuctionStatus, MarketListingStatus, MarketTradeMode } from '@prisma/client';

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
  tradeMode: z.enum(['platform_escrow', 'online_payment', 'external']).default('platform_escrow'),
  externalUrl: z.string().url().optional().or(z.literal('')),
  contactNote: z.string().max(500).optional(),
  items: z.array(CreateItemBody).min(1).max(20),
});

export async function GET(req: Request) {
  try {
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
        status: { in: ['on_sale', 'sold_out'] as MarketListingStatus[] },
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
          title: true,
          description: true,
          cover: true,
          minPrice: true,
          maxPrice: true,
          itemCount: true,
          tradeMode: true,
          createdAt: true,
          shipFrom: true,
          tags: true,
          seller: { select: { id: true, name: true, avatar: true } },
          genus: { select: { slug: true, name: true, cover: true } },
          items: {
            where: { status: { not: 'off_shelf' } },
            orderBy: { createdAt: 'asc' },
            take: 4,
            select: { cover: true, images: true },
          },
        },
      });

      products = list.map((p) => ({
        type: 'product',
        id: p.id,
        title: p.title,
        description: p.description || undefined,
        cover: p.cover,
        images: collectListingImages(p.items, p.cover),
        price: p.minPrice,
        maxPrice: p.maxPrice,
        itemCount: p.itemCount,
        tradeMode: p.tradeMode,
        createdAt: p.createdAt.toISOString(),
        url: `/market/${p.id}`,
        shipFrom: p.shipFrom,
        seller: p.seller,
        tags: parseJsonArray(p.tags),
        genus: p.genus || undefined,
      }));
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
          seller: { select: { id: true, name: true, avatar: true } },
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
    merged.sort((x, y) => {
      if (sort === 'price_asc') return x.price - y.price;
      if (sort === 'price_desc') return y.price - x.price;
      if (sort === 'oldest') return new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime();
      return new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime();
    });

    return Response.json({ ok: true, data: { items: merged.slice(0, limit) } });
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
    return fail(403, '当前等级不允许在交易区出售，开通会员或升到 Lv.8 后可解锁');
  }

  const body = CreateListingBody.parse(await req.json());
  const itemPrices = body.items.map((item) => item.price);
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

  const [genus, species] = await Promise.all([
    taxons[0].genusSlug
      ? prisma.genus.findFirst({ where: { slug: taxons[0].genusSlug }, select: { id: true } })
      : null,
    taxons[0].speciesSlug
      ? prisma.species.findFirst({ where: { slug: taxons[0].speciesSlug }, select: { id: true } })
      : null,
  ]);

  const listing = await prisma.marketListing.create({
    data: {
      sellerId: me.id,
      title: body.title.trim(),
      category: taxons[0].categorySlug,
      genusId: genus?.id ?? null,
      speciesId: species?.id ?? null,
      shipFrom: body.shipFrom.trim(),
      tags: stringifyJson(body.tags ?? []),
      description: body.description?.trim() || null,
      tradeMode: body.tradeMode,
      externalUrl: body.tradeMode === 'external' ? body.externalUrl || null : null,
      contactNote: body.contactNote?.trim() || null,
      cover,
      minPrice: Math.min(...itemPrices),
      maxPrice: Math.max(...itemPrices),
      itemCount: body.items.length,
      status: 'on_sale',
      items: {
        create: body.items.map((item) => ({
          title: item.title.trim(),
          price: item.price,
          stock: item.stock,
          cover: item.images[0],
          images: stringifyJson(item.images),
          description: item.description.trim(),
          status: 'on_sale',
        })),
      },
      taxons: {
        create: taxons.map((item) => ({
          categorySlug: item.categorySlug,
          genusSlug: item.genusSlug || null,
          speciesSlug: item.speciesSlug || null,
          label: item.label || formatTaxonLabel(item),
        })),
      },
    },
    select: { id: true },
  });

  return { id: listing.id };
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
  tradeMode?: MarketTradeMode;
  originalPrice?: number | null;
  createdAt: string;
  endAt?: string;
  url: string;
  shipFrom?: string | null;
  seller?: {
    id: string;
    name: string;
    avatar: string;
  } | null;
  tags?: string[];
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

function collectListingImages(items: { cover: string; images: string }[], fallback: string) {
  const images = items.flatMap((item) => {
    const parsed = parseJsonArray(item.images);
    return parsed.length ? parsed : [item.cover];
  });
  return Array.from(new Set([fallback, ...images])).slice(0, 4);
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
