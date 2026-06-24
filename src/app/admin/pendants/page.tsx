import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { grantAvatarPendantToUser } from '@/lib/avatar-pendant-unlocks';
import { AvatarPendantManager, type PendantAdminRow } from './AvatarPendantManager';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

const RARITIES = ['normal', 'rare', 'epic', 'legendary'] as const;
const UNLOCK_TYPES = ['achievement', 'event', 'trade', 'admin', 'points'] as const;

async function requireAdmin() {
  const me = await getCurrentUser();
  const adminUser = me as { role?: string; isSuperAdmin?: boolean } | null;
  if (adminUser?.role !== 'admin' && !adminUser?.isSuperAdmin) redirect('/');
  return me;
}

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

function assetUrlForSkin(skin: { preview: string; meta?: string | null }) {
  const meta = parseMeta(skin.meta);
  if (typeof meta.assetUrl === 'string' && meta.assetUrl.trim()) return meta.assetUrl.trim();
  return skin.preview.startsWith('/') ? skin.preview : '';
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

function normalizedRarity(value: string) {
  return RARITIES.includes(value as (typeof RARITIES)[number]) ? value : 'normal';
}

function normalizedUnlockType(value: string) {
  return UNLOCK_TYPES.includes(value as (typeof UNLOCK_TYPES)[number]) ? value : 'achievement';
}

function metaForForm(formData: FormData, existingMeta?: string | null, assetUrl?: string) {
  const unlockDescription = textValue(formData, 'unlockDescription', '');
  const meta: Record<string, unknown> = {
    ...parseMeta(existingMeta),
    assetUrl,
    unlockType: normalizedUnlockType(textValue(formData, 'unlockType', 'achievement')),
    unlockLabel: textValue(formData, 'unlockLabel', '通过社区玩法解锁'),
  };
  if (unlockDescription) meta.unlockDescription = unlockDescription;
  return JSON.stringify(meta);
}

async function createAvatarPendant(formData: FormData) {
  'use server';
  await requireAdmin();

  const slug = textValue(formData, 'slug');
  const assetUrl = textValue(formData, 'assetUrl');
  const name = textValue(formData, 'name', slug);
  if (!slug || !assetUrl || !name) return;

  const existing = await prisma.skinItem.findUnique({ where: { slug } });
  const meta = metaForForm(formData, existing?.meta, assetUrl);

  await prisma.skinItem.upsert({
    where: { slug },
    create: {
      slug,
      kind: 'pendant',
      name,
      preview: assetUrl,
      description: textValue(formData, 'description'),
      pricePoints: intValue(formData, 'pricePoints', 0),
      rarity: normalizedRarity(textValue(formData, 'rarity', 'normal')),
      enabled: enabledValue(formData),
      orderIdx: orderValue(formData, 0),
      meta,
    },
    update: {
      kind: 'pendant',
      name,
      preview: assetUrl,
      description: textValue(formData, 'description', existing?.description ?? ''),
      pricePoints: intValue(formData, 'pricePoints', existing?.pricePoints ?? 0),
      rarity: normalizedRarity(textValue(formData, 'rarity', existing?.rarity ?? 'normal')),
      enabled: enabledValue(formData, existing?.enabled ?? true),
      orderIdx: orderValue(formData, existing?.orderIdx ?? 0),
      meta,
    },
  });

  revalidatePath('/admin/pendants');
  revalidatePath('/points');
}

async function saveAvatarPendant(formData: FormData) {
  'use server';
  await requireAdmin();

  const id = textValue(formData, 'id');
  if (!id) return;

  const existing = await prisma.skinItem.findUnique({ where: { id } });
  if (!existing || existing.kind !== 'pendant') return;

  const assetUrl = textValue(formData, 'assetUrl', assetUrlForSkin(existing));
  const meta = metaForForm(formData, existing.meta, assetUrl);

  await prisma.skinItem.update({
    where: { id },
    data: {
      slug: textValue(formData, 'slug', existing.slug),
      kind: 'pendant',
      name: textValue(formData, 'name', existing.name),
      preview: assetUrl,
      description: textValue(formData, 'description', existing.description),
      pricePoints: intValue(formData, 'pricePoints', existing.pricePoints),
      rarity: normalizedRarity(textValue(formData, 'rarity', existing.rarity)),
      enabled: enabledValue(formData, existing.enabled),
      orderIdx: orderValue(formData, existing.orderIdx),
      meta,
    },
  });

  revalidatePath('/admin/pendants');
  revalidatePath('/points');
}

async function deleteAvatarPendant(formData: FormData) {
  'use server';
  await requireAdmin();

  const id = textValue(formData, 'id');
  if (!id) return;

  await prisma.skinItem.deleteMany({
    where: {
      id,
      kind: 'pendant',
    },
  });

  revalidatePath('/admin/pendants');
  revalidatePath('/points');
}

async function grantAvatarPendant(formData: FormData) {
  'use server';
  await requireAdmin();

  const id = textValue(formData, 'id');
  const userId = textValue(formData, 'grantUserId');
  if (!id || !userId) return;

  await grantAvatarPendantToUser(userId, id);
  revalidatePath('/admin/pendants');
  revalidatePath('/points');
}

async function loadPendantRows(): Promise<PendantAdminRow[]> {
  const rows = await prisma.skinItem.findMany({
    where: { kind: 'pendant' },
    include: {
      _count: { select: { owners: true } },
    },
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    preview: row.preview,
    description: row.description,
    pricePoints: row.pricePoints,
    rarity: row.rarity as PendantAdminRow['rarity'],
    enabled: row.enabled,
    orderIdx: row.orderIdx,
    meta: row.meta,
    ownerCount: row._count.owners,
  }));
}

export default async function AdminPendantsPage() {
  await requireAdmin();
  const rows = await loadPendantRows();

  return (
    <div className={styles.page}>
      <AvatarPendantManager
        rows={rows}
        createAction={createAvatarPendant}
        saveAction={saveAvatarPendant}
        deleteAction={deleteAvatarPendant}
        grantAction={grantAvatarPendant}
      />
    </div>
  );
}
