'use client';

import { cn } from '@/lib/utils';
import type { SkinItem } from '@/lib/types';
import { useI18n } from '@/i18n/I18nContext';

const RARITY_RING: Record<SkinItem['rarity'], string> = {
  normal: 'border-leaf-100',
  rare: 'border-blue-200 ring-1 ring-blue-100',
  epic: 'border-violet-200 ring-1 ring-violet-100',
  legendary: 'border-amber-200 ring-2 ring-amber-200',
};

const RARITY_COLOR: Record<SkinItem['rarity'], string> = {
  normal: 'text-leaf-700/70 bg-leaf-50',
  rare: 'text-blue-700 bg-blue-50',
  epic: 'text-violet-700 bg-violet-50',
  legendary: 'text-amber-700 bg-amber-50',
};

/** 渲染单个皮肤的卡片(预览各类型差异) */
export function SkinCard({
  skin,
  owned,
  equipped,
  onExchange,
  onEquip,
  onUnequip,
  busy,
}: {
  skin: SkinItem;
  owned?: boolean;
  equipped?: boolean;
  onExchange?: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
  busy?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={cn('card flex flex-col overflow-hidden p-3', RARITY_RING[skin.rarity])}>
      <div
        className={cn(
          'relative grid h-32 w-full place-items-center overflow-hidden rounded-xl',
          'bg-gradient-to-br from-leaf-50 to-white'
        )}
      >
        <SkinPreview skin={skin} />
        <span
          className={cn(
            'absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px]',
            RARITY_COLOR[skin.rarity]
          )}
        >
          {t(`points.skin.rarity.${skin.rarity}`)}
        </span>
        {skin.vipOnly && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            {t('points.skin.vipLimit')}
          </span>
        )}
        {equipped && (
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-leaf-500 px-2 py-0.5 text-[10px] font-medium text-white">
            {t('points.skin.equippedBadge')}
          </span>
        )}
      </div>

      <div className="mt-2 min-h-[48px]">
        <div className="text-sm font-medium text-ink-800">{skin.name}</div>
        <div className="line-clamp-2 text-[10px] text-leaf-700/70">{skin.description}</div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-1">
        {skin.vipOnly && skin.pricePoints === 0 ? (
          <span className="text-xs text-amber-700 font-medium">{t('points.skin.vipOnly')}</span>
        ) : skin.pricePoints === 0 ? (
          <span className="text-xs text-leaf-700">{t('points.skin.free')}</span>
        ) : (
          <span className="text-xs font-medium text-rose-600">
            💎 {skin.pricePoints}
          </span>
        )}

        {owned ? (
          equipped ? (
            <button
              type="button"
              onClick={onUnequip}
              disabled={busy}
              className="btn-outline !px-2 !py-1 !text-[11px]"
            >
              {t('points.skin.unequip')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onEquip}
              disabled={busy}
              className="btn-primary !px-2 !py-1 !text-[11px]"
            >
              {t('points.skin.equip')}
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={onExchange}
            disabled={busy}
            className="btn-primary !px-2 !py-1 !text-[11px]"
          >
            {t('points.skin.exchange')}
          </button>
        )}
      </div>
    </div>
  );
}

/** 各类型的预览渲染 */
export function SkinPreview({ skin, size = 'md' }: { skin: SkinItem; size?: 'sm' | 'md' }) {
  const { t } = useI18n();
  const meta = (skin.meta ?? {}) as Record<string, unknown>;
  const sizeCls = size === 'sm' ? 'text-xs' : 'text-sm';

  if (skin.kind === 'bubble') {
    const bg = (meta.bg as string) ?? '#fff';
    const color = (meta.color as string) ?? '#1f2a24';
    return (
      <div
        className="rounded-2xl px-4 py-2 shadow-sm"
        style={{ background: bg, color }}
      >
        <span className={cn('font-medium', sizeCls)}>
          {t('points.skin.preview.bubbleText', { name: skin.name })}
        </span>
      </div>
    );
  }

  if (skin.kind === 'reaction') {
    const emoji = (meta.emoji as string) ?? skin.preview;
    return (
      <div className="flex items-center gap-2">
        <span className="text-3xl">{emoji}</span>
        <span className="text-xs text-leaf-700/70">{skin.name}</span>
      </div>
    );
  }

  if (skin.kind === 'sticker') {
    const stickers = (meta.stickers as string[]) ?? [skin.preview];
    return (
      <div className="grid grid-cols-3 gap-1">
        {stickers.slice(0, 6).map((s, i) => (
          <span key={i} className="text-2xl">
            {s}
          </span>
        ))}
      </div>
    );
  }

  if (skin.kind === 'pendant') {
    const ringColor = (meta.color as string) ?? '#66b985';
    const gradient = meta.gradient as string | undefined;
    return (
      <div
        className="grid h-16 w-16 place-items-center rounded-full"
        style={{
          background: gradient ?? ringColor,
          padding: 4,
        }}
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-white text-2xl">
          {skin.preview}
        </div>
      </div>
    );
  }

  return <span className="text-2xl">{skin.preview}</span>;
}
