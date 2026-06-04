export type SpeciesGalleryItem = {
  url: string;
  category?: string;
  note?: string;
  contributorId?: string;
  approvedAt?: string;
  orderIdx?: number;
};

export type SpeciesGalleryData = {
  items: SpeciesGalleryItem[];
  coverPosition?: string;
};

export const SPECIES_GALLERY_CATEGORIES = [
  '变异种',
  '幼苗期',
  '生长期',
  '群生状态',
  '缀化锦化',
  '开花状态',
  '玩家实拍',
  '环境参考',
] as const;

export const COVER_POSITIONS = [
  { value: 'center center', label: '居中' },
  { value: 'center top', label: '偏上' },
  { value: 'center bottom', label: '偏下' },
  { value: 'left center', label: '偏左' },
  { value: 'right center', label: '偏右' },
] as const;

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  形态特征: '变异种',
  爆盆状态: '群生状态',
  缀化状态: '缀化锦化',
};

export function normalizeSpeciesGalleryCategory(category?: string) {
  if (!category) return undefined;
  return LEGACY_CATEGORY_MAP[category] ?? category;
}

export function parseSpeciesGallery(raw?: string | null): SpeciesGalleryData {
  if (!raw) return { items: [] };

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return {
        items: parsed
          .map((item, index) => normalizeGalleryItem(item, index))
          .filter(Boolean) as SpeciesGalleryItem[],
      };
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as { items?: unknown; coverPosition?: unknown };
      const items = Array.isArray(obj.items)
        ? obj.items.map((item, index) => normalizeGalleryItem(item, index)).filter(Boolean)
        : [];
      return {
        items: items as SpeciesGalleryItem[],
        coverPosition: typeof obj.coverPosition === 'string' ? obj.coverPosition : undefined,
      };
    }
  } catch {
    return {
      items: parseJsonArrayFallback(raw).map((url, index) => ({ url, orderIdx: index })),
    };
  }

  return { items: [] };
}

export function getSpeciesGalleryUrls(raw?: string | null) {
  return parseSpeciesGallery(raw).items.map((item) => item.url);
}

export function stringifySpeciesGallery(data: SpeciesGalleryData) {
  const seen = new Set<string>();
  const items = data.items
    .map((item, index) => ({
      url: item.url.trim(),
      category: item.category?.trim() || undefined,
      note: item.note?.trim() || undefined,
      contributorId: item.contributorId?.trim() || undefined,
      approvedAt: item.approvedAt,
      orderIdx: Number.isFinite(item.orderIdx) ? item.orderIdx : index,
    }))
    .filter((item) => {
      if (!item.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

  return JSON.stringify({
    items,
    ...(data.coverPosition ? { coverPosition: data.coverPosition } : {}),
  });
}

export function removeCoverFromGallery(items: SpeciesGalleryItem[], cover?: string | null) {
  if (!cover) return items;
  return items.filter((item) => item.url !== cover);
}

export function stringifySpeciesGalleryForCover(
  data: SpeciesGalleryData,
  cover?: string | null,
  coverPosition?: string
) {
  return stringifySpeciesGallery({
    ...data,
    ...(coverPosition ? { coverPosition } : {}),
    items: removeCoverFromGallery(data.items, cover).slice(0, 9),
  });
}

function normalizeGalleryItem(item: unknown, index: number): SpeciesGalleryItem | null {
  if (typeof item === 'string') {
    const url = item.trim();
    return url ? { url, orderIdx: index } : null;
  }
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  const url = typeof obj.url === 'string' ? obj.url.trim() : '';
  if (!url) return null;
  return {
    url,
    category: typeof obj.category === 'string' ? normalizeSpeciesGalleryCategory(obj.category) : undefined,
    note: typeof obj.note === 'string' ? obj.note : undefined,
    contributorId: typeof obj.contributorId === 'string' ? obj.contributorId : undefined,
    approvedAt: typeof obj.approvedAt === 'string' ? obj.approvedAt : undefined,
    orderIdx: typeof obj.orderIdx === 'number' ? obj.orderIdx : index,
  };
}

function parseJsonArrayFallback(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
