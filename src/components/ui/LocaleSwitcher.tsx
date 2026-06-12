'use client';

import { useI18n } from '@/i18n/I18nContext';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';
import { useHoverOpen } from '@/lib/hooks/useHoverOpen';
import { cn } from '@/lib/utils';
import styles from './LocaleSwitcher.module.scss';
import { cx } from '@/lib/style-utils';



/**
 * 语言切换 — **悬浮触发**(hover 进入展开,离开 150ms 关闭)
 */
export function LocaleSwitcher({ className }: {className?: string;}) {
  const { locale, setLocale } = useI18n();
  const { open, bind, close } = useHoverOpen();

  return (
    <div className={cn(styles.r_d89972fe, className)} {...bind}>
      <button
        type="button"
        className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0b91436d, styles.r_660d2eff, styles.r_359090c2, styles.r_5f6a59f1, styles.r_5756b7b4)}
        aria-label="切换语言"
        aria-haspopup="listbox"
        aria-expanded={open}>

        <span>{localeFlags[locale]}</span>
        <span className={cx(styles.r_99d72c7f, styles.r_ee3c1259)}>{localeNames[locale]}</span>
        <span aria-hidden>▾</span>
      </button>
      {open &&
      <div
        className={cx(styles.r_da4dbfbc, styles.r_d8cdcad2, styles.r_145745bf, styles.r_50d0d216, styles.r_84789e8a, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_06bbb431)}
        role="listbox">

          {locales.map((l) =>
        <button
          key={l}
          type="button"
          role="option"
          aria-selected={locale === l}
          className={cn(cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65, styles.r_fc7473ca, styles.r_5756b7b4),

          locale === l ? cx(styles.r_52f53b18, styles.r_2689f395, styles.r_e7eab4cb) : styles.r_5f6a59f1
          )}
          onClick={async () => {
            await setLocale(l as Locale);
            close();
          }}>

              <span className={styles.r_4ee73492}>{localeFlags[l]}</span>
              <span>{localeNames[l]}</span>
              {locale === l && <span className={cx(styles.r_fb56d9cf, styles.r_359090c2)}>✓</span>}
            </button>
        )}
        </div>
      }
    </div>);

}