'use client';

import { cn } from '@/lib/utils';
import type { SkinItem } from '@/lib/types';
import { useI18n } from '@/i18n/I18nContext';
import { ReactionIcon } from '@/components/skin/ReactionIcon';
import styles from './SkinCard.module.scss';
import { cx } from '@/lib/style-utils';



const RARITY_RING: Record<SkinItem['rarity'], string> = {
  normal: styles.r_88b684d2,
  rare: cx(styles.r_cf740793, styles.r_3daca9af, styles.r_355a3d3a),
  epic: cx(styles.r_8a82c94b, styles.r_3daca9af, styles.r_7cd23189),
  legendary: cx(styles.r_97f24a4b, styles.r_16b1efa5, styles.r_2e15338e)
};

const RARITY_COLOR: Record<SkinItem['rarity'], string> = {
  normal: cx(styles.r_69335b95, styles.r_7ebecbb6),
  rare: cx(styles.r_65b7dd19, styles.r_3cc00fe7),
  epic: cx(styles.r_06fd2bc1, styles.r_3b5cf6c0),
  legendary: cx(styles.r_85d79ebf, styles.r_67d2289d)
};

/** 渲染单个皮肤的卡片(预览各类型差异) */
export function SkinCard({
  skin,
  owned,
  equipped,
  onExchange,
  onEquip,
  onUnequip,
  busy








}: {skin: SkinItem;owned?: boolean;equipped?: boolean;onExchange?: () => void;onEquip?: () => void;onUnequip?: () => void;busy?: boolean;}) {
  const { t } = useI18n();
  const meta = (skin.meta ?? {}) as Record<string, unknown>;
  const isLockedPendant = skin.kind === 'pendant' && !owned;
  const unlockLabel = typeof meta.unlockLabel === 'string' ? meta.unlockLabel : '通过社区玩法解锁';
  const unlockDescription = typeof meta.unlockDescription === 'string' ? meta.unlockDescription : unlockLabel;

  return (
    <div className={cn(cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_2cd02d11, styles.r_eb6e8b88), RARITY_RING[skin.rarity])}>
      <div
        className={cn(cx(styles.r_d89972fe, styles.r_f3c543ad, styles.r_b5f3ff77, styles.r_6da6a3c3, styles.r_67d66567, styles.r_2cd02d11, styles.r_a217b4ea), cx(styles.r_39b2e003, styles.r_49a47a82, styles.r_0d13093a)


        )}>

        <SkinPreview skin={skin} />
        {isLockedPendant &&
        <div className={styles.lockedOverlay} aria-hidden>
            <span>未解锁</span>
          </div>
        }
        <span
          className={cn(cx(styles.r_da4dbfbc, styles.r_7b2d6393, styles.r_9a2db8f9, styles.r_ac204c10, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3),

          RARITY_COLOR[skin.rarity]
          )}>

          {t(`points.skin.rarity.${skin.rarity}`)}
        </span>
        {equipped &&
        <span className={cx(styles.r_da4dbfbc, styles.r_f6babb33, styles.r_e632769a, styles.r_efaa0701, styles.r_ac204c10, styles.r_45499621, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395, styles.r_72a4c7cd)}>
            {t('points.skin.equippedBadge')}
          </span>
        }
      </div>

      <div className={cx(styles.r_50d0d216, styles.r_c98cc80a)}>
        <div className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{skin.name}</div>
        <div className={cx(styles.r_054cb4e3, styles.r_1dc571a3, styles.r_69335b95)}>{skin.description}</div>
      </div>

      <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_44ee8ba0)}>
        {isLockedPendant ?
        <span className={styles.unlockText} title={unlockDescription}>{unlockLabel}</span> :
        skin.pricePoints === 0 ?
        <span className={cx(styles.r_359090c2, styles.r_5f6a59f1)}>{t('points.skin.free')}</span> :

        <span className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_595fceba)}>
            💎 {skin.pricePoints}
          </span>
        }

        {isLockedPendant ?
        <button
          type="button"
          disabled
          className={cn(styles.actionButton, styles.lockedButton, cx(styles.r_92172c7d, styles.r_ebb407e8, styles.r_3330f90a))}>

            未解锁
          </button> :
        owned ?
        equipped ?
        <button
          type="button"
          onClick={onUnequip}
          disabled={busy}
          className={cn(styles.actionButton, styles.unequipButton, cx(styles.r_92172c7d, styles.r_ebb407e8, styles.r_3330f90a))}>

              {t('points.skin.unequip')}
            </button> :

        <button
          type="button"
          onClick={onEquip}
          disabled={busy}
          className={cn(styles.actionButton, styles.equipButton, cx(styles.r_92172c7d, styles.r_ebb407e8, styles.r_3330f90a))}>

              {t('points.skin.equip')}
            </button> :


        <button
          type="button"
          onClick={onExchange}
          disabled={busy}
          className={cn(styles.actionButton, styles.exchangeButton, cx(styles.r_92172c7d, styles.r_ebb407e8, styles.r_3330f90a))}>

            {t('points.skin.exchange')}
          </button>
        }
      </div>
    </div>);

}

/** 各类型的预览渲染 */
export function SkinPreview({ skin, size = 'md' }: {skin: SkinItem;size?: 'sm' | 'md';}) {
  const { t } = useI18n();
  const meta = (skin.meta ?? {}) as Record<string, unknown>;
  const sizeCls = size === 'sm' ? styles.r_359090c2 : styles.r_fc7473ca;

  if (skin.kind === 'bubble') {
    const bg = meta.bg as string ?? '#fff';
    const color = meta.color as string ?? '#1f2a24';
    return (
      <div
        className={cx(styles.r_68f2db62, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_438b2237)}
        style={{ background: bg, color }}>

        <span className={cn(styles.r_2689f395, sizeCls)}>
          {t('points.skin.preview.bubbleText', { name: skin.name })}
        </span>
      </div>);

  }

  if (skin.kind === 'reaction') {
    return (
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
        <span className={styles.reactionStatePreview}><ReactionIcon skin={skin} size={28} /></span>
        <span className={styles.r_359090c2}>→</span>
        <span className={styles.reactionStatePreview}><ReactionIcon skin={skin} active size={28} /></span>
        <span className={cx(styles.r_359090c2, styles.r_69335b95)}>{skin.name}</span>
      </div>);

  }

  if (skin.kind === 'sticker') {
    const stickers = meta.stickers as string[] ?? [skin.preview];
    return (
      <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_44ee8ba0)}>
        {stickers.slice(0, 6).map((s, i) =>
        <span key={i} className={styles.r_3febee09}>
            {s}
          </span>
        )}
      </div>);

  }

  if (skin.kind === 'pendant') {
    const assetUrl =
    typeof meta.assetUrl === 'string' ? meta.assetUrl :
    skin.preview?.startsWith('/') ? skin.preview :
    undefined;
    return assetUrl ? <img src={assetUrl} alt={skin.name} className={styles.pendantAssetPreview} /> : null;

  }

  return <span className={styles.r_3febee09}>{skin.preview}</span>;
}
