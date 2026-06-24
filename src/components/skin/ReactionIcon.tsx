'use client';

import type { SkinItem } from '@/lib/types';
import { Icon, type IconName } from '@/components/ui/Icon';
import styles from './ReactionIcon.module.scss';

const ICON_NAMES = new Set<string>(['thumbs-up', 'heart']);

function metaForSkin(skin?: SkinItem | null) {
  return (skin?.meta ?? {}) as Record<string, unknown>;
}

function isIconName(value: string): value is IconName {
  return ICON_NAMES.has(value);
}

export function reactionBeforeValue(skin?: SkinItem | null) {
  const meta = metaForSkin(skin);
  return typeof meta.beforeIcon === 'string' && meta.beforeIcon.trim()
    ? meta.beforeIcon.trim()
    : 'thumbs-up';
}

export function reactionAfterValue(skin?: SkinItem | null) {
  const meta = metaForSkin(skin);
  if (typeof meta.emoji === 'string' && meta.emoji.trim()) return meta.emoji.trim();
  return skin?.preview?.trim() || '👍';
}

export function ReactionIcon({
  skin,
  active,
  size = 16,
}: {
  skin?: SkinItem | null;
  active?: boolean;
  size?: number;
}) {
  const value = active ? reactionAfterValue(skin) : reactionBeforeValue(skin);
  if (!active && isIconName(value)) {
    return <Icon name={value} size={size} fill="none" />;
  }
  return (
    <span className={styles.glyph} style={{ width: size, height: size, fontSize: size }}>
      {value}
    </span>
  );
}
