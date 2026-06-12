'use client';

import type { PostType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nContext';
import styles from './TypePicker.module.scss';
import { cx } from '@/lib/style-utils';



interface Item {
  type: PostType;
  emoji: string;
  pcOnly?: boolean;
}

const items: Item[] = [
{ type: 'image', emoji: '🖼️' },
{ type: 'rich', emoji: '📝' },
{ type: 'journal', emoji: '📖' },
{ type: 'vote', emoji: '🗳️' },
// { type: 'video', emoji: '🎬' },
// { type: 'event', emoji: '🎉' }, // 暂时隐藏，未来再完善
{ type: 'help', emoji: '❓' }];


export function TypePicker({
  value,
  onChange



}: {value: PostType;onChange: (t: PostType) => void;}) {
  const { t } = useI18n();
  return (
    <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_9a638cfe, styles.r_76125f2c)}>
      {items.map((it) =>
      <button
        key={it.type}
        type="button"
        onClick={() => onChange(it.type)}
        className={cn(cx(styles.r_d89972fe, styles.r_0c5e9137, styles.r_65935df5, styles.r_eb6e8b88, styles.r_2eba0d65, styles.r_0fe7d7d8),

        value === it.type ? cx(styles.r_d3b27cd9, styles.r_a8a62ca4) : cx(styles.r_88b684d2, styles.r_5e10cdb8, styles.r_a5c39c39)


        )}>

          <div className={cx(styles.r_65281709, styles.r_d5c9b000)}>{it.emoji}</div>
          <div className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>
            {t(`post.typeBadge.${it.type}`)}
          </div>
          <div className={cx(styles.r_15e1b1f4, styles.r_1dc571a3, styles.r_e9fadafb, styles.r_69335b95)}>
            {t(`post.typeDesc.${it.type}`)}
          </div>
          {value === it.type &&
        <span className={cx(styles.r_da4dbfbc, styles.r_7b2d6393, styles.r_9a2db8f9, styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_45499621, styles.r_359090c2, styles.r_72a4c7cd)}>
              ✓
            </span>
        }
        </button>
      )}
    </div>);

}