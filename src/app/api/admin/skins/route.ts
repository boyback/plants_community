import { revalidatePath } from 'next/cache';
import { handler } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type AdminSkinKind = 'bubble' | 'reaction' | 'sticker';
type OperationKind = 'create' | 'save' | 'delete' | 'grant';

const RARITIES = ['normal', 'rare', 'epic', 'legendary'] as const;

const EQUIP_FIELD: Record<AdminSkinKind, 'equipBubbleId' | 'equipReactionId' | 'equipStickerId'> = {
  bubble: 'equipBubbleId',
  reaction: 'equipReactionId',
  sticker: 'equipStickerId',
};

function parseMeta(meta?: string | null) {
  if (!meta) return {};
  try {
    const parsed = JSON.parse(meta) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function textValue(formData: FormData, key: string, fallback = '') {
  const value = String(formData.get(key) ?? '').trim();
  return value || fallback;
}

function intValue(formData: FormData, key: string, fallback: number) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
}

function orderValue(formData: FormData, fallback: number) {
  const value = Number(formData.get('orderIdx'));
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

function enabledValue(formData: FormData, fallback = true) {
  const value = textValue(formData, 'enabled', fallback ? '1' : '0');
  return value === '1';
}

function normalizedKind(value: string): AdminSkinKind | null {
  return value === 'bubble' || value === 'reaction' || value === 'sticker' ? value : null;
}

function normalizedOperation(value: string): OperationKind | null {
  return value === 'create' || value === 'save' || value === 'delete' || value === 'grant' ? value : null;
}

function normalizedRarity(value: string) {
  return RARITIES.includes(value as (typeof RARITIES)[number]) ? value : 'normal';
}

function bubbleSlugFromBg(formData: FormData) {
  const bg = textValue(formData, 'bg', '#ffffff');
  const seed = `${bg}-${Date.now().toString(36)}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `bubble-${hash.toString(36)}`;
}

function formSlug(kind: AdminSkinKind, formData: FormData, fallback = '') {
  if (kind === 'bubble') return fallback || bubbleSlugFromBg(formData);
  return textValue(formData, 'slug', fallback);
}

function formName(kind: AdminSkinKind, formData: FormData, fallback = '') {
  if (kind === 'bubble') return fallback || '评论气泡';
  return textValue(formData, 'name', fallback);
}

function stickerListFromForm(formData: FormData, existingMeta?: string | null) {
  const raw = textValue(formData, 'stickers');
  if (raw) {
    return raw
      .split(/[\s,\n，]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  const existing = parseMeta(existingMeta).stickers;
  return Array.isArray(existing) ? existing.filter((item): item is string => typeof item === 'string') : [];
}

function previewForForm(kind: AdminSkinKind, formData: FormData, existing?: { preview: string; meta?: string | null }) {
  const meta = parseMeta(existing?.meta);
  if (kind === 'bubble') {
    return textValue(formData, 'bg', typeof meta.bg === 'string' ? meta.bg : existing?.preview ?? '#ffffff');
  }
  if (kind === 'reaction') {
    return textValue(formData, 'emoji', typeof meta.emoji === 'string' ? meta.emoji : existing?.preview ?? '👍');
  }
  const stickers = stickerListFromForm(formData, existing?.meta);
  return textValue(formData, 'preview', existing?.preview ?? stickers[0] ?? '');
}

function metaForForm(kind: AdminSkinKind, formData: FormData, existingMeta?: string | null) {
  const meta: Record<string, unknown> = { ...parseMeta(existingMeta) };
  if (kind === 'bubble') {
    meta.bg = textValue(formData, 'bg', typeof meta.bg === 'string' ? meta.bg : '#ffffff');
    const bgMode = textValue(formData, 'bgMode', typeof meta.bgMode === 'string' ? meta.bgMode : '');
    meta.bgMode = bgMode === 'gradient' ? 'gradient' : 'solid';
    delete meta.color;
  }
  if (kind === 'reaction') {
    meta.beforeIcon = textValue(
      formData,
      'beforeIcon',
      typeof meta.beforeIcon === 'string' ? meta.beforeIcon : 'thumbs-up'
    );
    meta.emoji = textValue(formData, 'emoji', typeof meta.emoji === 'string' ? meta.emoji : '');
  }
  if (kind === 'sticker') {
    meta.stickers = stickerListFromForm(formData, existingMeta);
  }
  return JSON.stringify(meta);
}

async function createSkinItem(formData: FormData, kind: AdminSkinKind) {
  const slug = formSlug(kind, formData);
  const name = formName(kind, formData, slug);
  if (!slug || !name) throw new Error('请填写必要信息');

  const existing = await prisma.skinItem.findUnique({ where: { slug } });
  const preview = previewForForm(kind, formData, existing ?? undefined);
  const meta = metaForForm(kind, formData, existing?.meta);

  await prisma.skinItem.upsert({
    where: { slug },
    create: {
      slug,
      kind,
      name,
      preview,
      description: kind === 'bubble' ? '' : textValue(formData, 'description'),
      pricePoints: intValue(formData, 'pricePoints', 0),
      rarity: kind === 'bubble' ? 'normal' : normalizedRarity(textValue(formData, 'rarity', 'normal')),
      enabled: enabledValue(formData),
      orderIdx: orderValue(formData, 0),
      meta,
    },
    update: {
      kind,
      name: kind === 'bubble' ? existing?.name ?? name : name,
      preview,
      description: kind === 'bubble' ? existing?.description ?? '' : textValue(formData, 'description', existing?.description ?? ''),
      pricePoints: intValue(formData, 'pricePoints', existing?.pricePoints ?? 0),
      rarity: kind === 'bubble' ? existing?.rarity ?? 'normal' : normalizedRarity(textValue(formData, 'rarity', existing?.rarity ?? 'normal')),
      enabled: enabledValue(formData, existing?.enabled ?? true),
      orderIdx: orderValue(formData, existing?.orderIdx ?? 0),
      meta,
    },
  });
}

async function saveSkinItem(formData: FormData, kind: AdminSkinKind) {
  const id = textValue(formData, 'id');
  if (!id) throw new Error('参数无效');

  const existing = await prisma.skinItem.findUnique({ where: { id } });
  if (!existing || existing.kind !== kind) throw new Error('配置不存在');

  const preview = previewForForm(kind, formData, existing);
  const meta = metaForForm(kind, formData, existing.meta);

  await prisma.skinItem.update({
    where: { id },
    data: {
      slug: kind === 'bubble' ? existing.slug : textValue(formData, 'slug', existing.slug),
      name: formName(kind, formData, existing.name),
      preview,
      description: kind === 'bubble' ? existing.description : textValue(formData, 'description', existing.description),
      pricePoints: intValue(formData, 'pricePoints', existing.pricePoints),
      rarity: kind === 'bubble' ? existing.rarity : normalizedRarity(textValue(formData, 'rarity', existing.rarity)),
      enabled: enabledValue(formData, existing.enabled),
      orderIdx: orderValue(formData, existing.orderIdx),
      meta,
    },
  });
}

async function deleteSkinItem(formData: FormData, kind: AdminSkinKind) {
  const id = textValue(formData, 'id');
  if (!id) throw new Error('参数无效');

  await prisma.user.updateMany({
    where: { [EQUIP_FIELD[kind]]: id },
    data: { [EQUIP_FIELD[kind]]: null },
  });
  await prisma.skinItem.deleteMany({
    where: { id, kind },
  });
}

async function grantSkinItem(formData: FormData, kind: AdminSkinKind) {
  const id = textValue(formData, 'id');
  const userId = textValue(formData, 'grantUserId');
  if (!id || !userId) throw new Error('请输入用户 ID');

  const skin = await prisma.skinItem.findUnique({ where: { id } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!skin || skin.kind !== kind) throw new Error('配置不存在');
  if (!user) throw new Error('用户不存在');

  await prisma.userSkin.upsert({
    where: { userId_skinId: { userId, skinId: id } },
    create: { userId, skinId: id, obtainedFrom: 'admin' },
    update: { obtainedFrom: 'admin' },
  });
}

export const POST = handler(async (req) => {
  await requireAdmin();
  const formData = await req.formData();
  const kind = normalizedKind(textValue(formData, 'kind'));
  const operation = normalizedOperation(textValue(formData, 'operation'));
  if (!kind) throw new Error('装扮类型无效');
  if (!operation) throw new Error('操作类型无效');

  if (operation === 'create') await createSkinItem(formData, kind);
  if (operation === 'save') await saveSkinItem(formData, kind);
  if (operation === 'delete') await deleteSkinItem(formData, kind);
  if (operation === 'grant') await grantSkinItem(formData, kind);

  revalidatePath(`/admin/skins/${kind}`);
  revalidatePath('/points');

  return { ok: true };
});
