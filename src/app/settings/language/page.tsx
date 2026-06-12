'use client';

import { useI18n } from '@/i18n/I18nContext';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export default function LanguageSettingsPage() {
  const { locale, setLocale } = useI18n();

  return (
    <div className={styles.r_0478c89a}>
      <h1 className={cx(styles.r_d5c9b000, styles.r_e83a7042, styles.r_da019856)}>
        🌐 语言
      </h1>
      <p className={cx(styles.r_fc7473ca, styles.r_b17d6a13, styles.r_da019856)}>
        你的语言偏好会保存到账户(已登录)和本地 cookie。
      </p>
      <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_77a2a20e, styles.r_ab1b20c2)}>
        {locales.map((l) =>
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l as Locale)}
          className={[cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_86843cf1),

          locale === l ? cx(styles.r_d3b27cd9, styles.r_7ebecbb6, styles.r_e7eab4cb, styles.r_2689f395) : cx(styles.r_88b684d2, styles.r_5f6a59f1, styles.r_5756b7b4)].


          join(' ')}>

            <span className={styles.r_4ee73492}>{localeFlags[l]}</span>
            <span>{localeNames[l]}</span>
          </button>
        )}
      </div>
    </div>);

}