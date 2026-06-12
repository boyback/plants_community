'use client';

import { useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn, formatNumber } from '@/lib/utils';
import styles from './FloatingActionRail.module.scss';
import { cx } from '@/lib/style-utils';



export type FloatingActionItem = {
  icon: IconName;
  label: string;
  count?: number;
  active?: boolean;
  activeCls?: string;
  disabled?: boolean;
  onClick?: () => void;
};

export function FloatingActionRail({ items, contentMaxWidth = 1280 }: {items: FloatingActionItem[];contentMaxWidth?: number;}) {
  const [open, setOpen] = useState(true);
  const railLeft = `max(16px,calc(50vw - ${contentMaxWidth / 2}px - 76px))`;
  const toggleLeft = `max(16px,calc(50vw - ${contentMaxWidth / 2}px - 72px))`;

  return (
    <div className={cx(styles.r_99d72c7f, styles.r_9d60be3a)}>
      <div
        className={cn(cx(styles.r_7bc55599, styles.r_d694ba66, styles.r_0f2fff0a, styles.r_baceed34, styles.r_36b381be, styles.r_80d1eef6, styles.r_625a4c3f, styles.r_d905a812),

        open ? cx(styles.r_850292e4, styles.r_3972e98d) : cx(styles.r_a4326536, styles.r_21e83b2f, styles.r_7065497e)
        )}
        style={{ left: railLeft }}
        aria-hidden={!open}>

        <div className={cx(styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_f5ebd4d0, styles.r_cd009d7d, styles.r_06bbb431, styles.r_be977c5e, styles.r_0b2e8c28)}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={cx(styles.r_65281709, styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_6da6a3c3, styles.r_67d66567, styles.r_a217b4ea, styles.r_66a36c90, styles.r_ceb69a6b, styles.r_5399e21f, styles.r_3364420b)}
            title="收起操作栏"
            aria-label="收起操作栏">

            <Icon name="close" size={14} />
          </button>
          <div className={styles.r_da7c36cd}>
            {items.map((item) =>
            <ActionButton key={`${item.icon}-${item.label}`} item={item} />
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(cx(styles.r_7bc55599, styles.r_d694ba66, styles.r_0f2fff0a, styles.r_f3c543ad, styles.r_508ebf85, styles.r_2bbcfc3b, styles.r_36b381be, styles.r_67d66567, styles.r_ac204c10, styles.r_febec8f2, styles.r_7b89cd85, styles.r_febc34e4, styles.r_be977c5e, styles.r_5c89ccc9, styles.r_625a4c3f, styles.r_d905a812, styles.r_1e172434, styles.r_90fb1d0a),

        open ? cx(styles.r_a4326536, styles.r_21e83b2f, styles.r_7065497e) : cx(styles.r_850292e4, styles.r_3972e98d)
        )}
        style={{ left: toggleLeft }}
        title="展开操作栏"
        aria-label="展开操作栏"
        aria-expanded={open}>

        <Icon name="menu" size={16} />
      </button>
    </div>);

}

function ActionButton({ item }: {item: FloatingActionItem;}) {
  return (
    <button
      type="button"
      disabled={item.disabled}
      onClick={item.onClick}
      className={cn(cx(styles.r_60fbb771, styles.r_0cfe3fb5, styles.r_6da6a3c3, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_a3899220, styles.r_a217b4ea, styles.r_45d82811, styles.r_03b4dd7f, styles.r_d058ca6d, styles.r_e83a7042, styles.r_e9fadafb, styles.r_02eb621e, styles.r_ceb69a6b, styles.r_5756b7b4, styles.r_81be6435, styles.r_5f533b3a, styles.r_d463b664),

      item.active && (item.activeCls ?? cx(styles.r_7ebecbb6, styles.r_e7eab4cb))
      )}
      title={item.label}
      aria-label={item.label}>

      <Icon name={item.icon} size={16} fill={item.active ? 'currentColor' : 'none'} />
      <span>{item.label}</span>
      {typeof item.count === 'number' &&
      <span className={cn(cx(styles.r_d058ca6d, styles.r_2689f395, styles.r_66a36c90), item.active && styles.r_c324756a)}>
          {formatNumber(item.count)}
        </span>
      }
    </button>);

}