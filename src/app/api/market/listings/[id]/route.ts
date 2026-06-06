import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, parseJsonArray, stringifyJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { Prisma, type MarketTradeMode } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ItemBody = z.object({
  id: z.string().optional(),
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

export const GET = handler(async (req) => {
  const id = pickListingId(req);
  const raw = await prisma.marketListing.findUnique({
    where: { id },
    include: {
      seller: {
        include: {
          _count: { select: { posts: true, followers: true, following: true } },
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

  if (!raw) return fail(404, '交易帖不存在');

  await prisma.marketListing.update({
    where: { id: raw.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => null);

  const tradeModes = await loadListingTradeModes(raw.id, raw.tradeMode);
  const itemMeta = await loadItemMeta(raw.items.map((item) => item.id));

  return {
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
      mainHeadSize: itemMeta[item.id]?.mainHeadSize ?? '',
      overallSize: itemMeta[item.id]?.overallSize ?? '',
      potDiameter: itemMeta[item.id]?.potDiameter ?? '',
      taxons: itemMeta[item.id]?.taxons ?? [],
      tags: itemMeta[item.id]?.tags ?? [],
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
        postsCount: comment.author._count.posts,
        followersCount: comment.author._count.followers,
        followingCount: comment.author._count.following,
      },
    })),
  };
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
        const savedItem = await tx.marketListingItem.update({
          where: { id: item.id },
          data,
          select: { id: true },
        });
        await saveItemMeasurements(tx, savedItem.id, item);
      } else {
        const savedItem = await tx.marketListingItem.create({
          data: {
            listingId: id,
            ...data,
          },
          select: { id: true },
        });
        await saveItemMeasurements(tx, savedItem.id, item);
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

async function loadListingTradeModes(id: string, fallback: MarketTradeMode): Promise<MarketTradeMode[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ tradeModes: string | null }>>`
      SELECT tradeModes FROM market_listings WHERE id = ${id}
    `;
    return normalizeTradeModes(parseJsonArray(rows[0]?.tradeModes) as MarketTradeMode[], fallback);
  } catch {
    return [fallback];
  }
}

async function saveItemMeasurements(
  db: { $executeRaw: typeof prisma.$executeRaw },
  itemId: string,
  item: {
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
  },
) {
  try {
    await db.$executeRaw`
      UPDATE market_listing_items
      SET mainHeadSize = ${item.mainHeadSize?.trim() || null},
          overallSize = ${item.overallSize?.trim() || null},
          potDiameter = ${item.potDiameter?.trim() || null},
          taxons = ${item.taxons?.length ? stringifyJson(item.taxons) : null},
          tags = ${stringifyJson(item.tags ?? [])}
      WHERE id = ${itemId}
    `;
  } catch {
    // Columns may not exist before the next Prisma db push; do not block editing.
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
        tags: row.tags === null ? undefined : parseStringArray(row.tags),
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
        genusSlug: typeof item?.genusSlug === 'string' ? item.genusSlug : '',
        speciesSlug: typeof item?.speciesSlug === 'string' ? item.speciesSlug : '',
        label: typeof item?.label === 'string' ? item.label : undefined,
      }))
      .filter((item) => item.categorySlug);
  } catch {
    return [];
  }
}

function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
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
