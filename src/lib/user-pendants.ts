import { prisma } from '@/lib/db';
import { serializeSkin } from '@/lib/serializers';
import type { SkinItem } from '@/lib/types';

type PendantRefMap = Map<string, string>;
type PendantMap = Map<string, SkinItem>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function collectPendantRefs(source: unknown, refs: PendantRefMap) {
  if (!isRecord(source)) return;
  if (Array.isArray(source)) {
    source.forEach((item) => collectPendantRefs(item, refs));
    return;
  }

  const userId = typeof source.id === 'string' ? source.id : null;
  const pendantId = typeof source.equipPendantId === 'string' ? source.equipPendantId : null;
  if (userId && pendantId) refs.set(userId, pendantId);

  Object.values(source).forEach((value) => collectPendantRefs(value, refs));
}

function attachPendants(target: unknown, pendantsByUserId: PendantMap) {
  if (!isRecord(target)) return;
  if (Array.isArray(target)) {
    target.forEach((item) => attachPendants(item, pendantsByUserId));
    return;
  }

  const userId = typeof target.id === 'string' ? target.id : null;
  const looksLikeUser =
    userId &&
    typeof target.name === 'string' &&
    typeof target.avatar === 'string';
  const pendant = userId ? pendantsByUserId.get(userId) : null;

  if (looksLikeUser && pendant) {
    const existingEquip = isRecord(target.equip) ? target.equip : {};
    target.equip = {
      ...existingEquip,
      pendant,
    };
  }
  if (looksLikeUser && 'equipPendantId' in target) {
    delete target.equipPendantId;
  }

  Object.values(target).forEach((value) => attachPendants(value, pendantsByUserId));
}

export async function withUserPendants<T>(serialized: T, rawSource: unknown): Promise<T> {
  const refs = new Map<string, string>();
  collectPendantRefs(rawSource, refs);
  if (refs.size === 0) {
    attachPendants(serialized, new Map());
    return serialized;
  }

  const skinIds = [...new Set(refs.values())];
  const skins = await prisma.skinItem.findMany({
    where: {
      id: { in: skinIds },
      kind: 'pendant',
    },
  });
  const skinById = new Map(skins.map((skin) => [skin.id, serializeSkin(skin)]));
  const pendantsByUserId = new Map<string, SkinItem>();
  refs.forEach((skinId, userId) => {
    const pendant = skinById.get(skinId);
    if (pendant) pendantsByUserId.set(userId, pendant);
  });

  attachPendants(serialized, pendantsByUserId);
  return serialized;
}
