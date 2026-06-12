'use client';

import { Shell } from '@/components/layout/Shell';
import { useI18n } from '@/i18n/I18nContext';
import { CookiesZh } from './CookiesZh';
import { CookiesTw } from './CookiesTw';
import { CookiesEn } from './CookiesEn';
import { CookiesJa } from './CookiesJa';
import { CookiesKo } from './CookiesKo';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export default function CookiesPage() {
  const { locale } = useI18n();
  const Body =
  locale === "zh-CN" ? CookiesZh :
  locale === "zh-TW" ? CookiesTw :
  locale === 'en' ? CookiesEn :
  locale === 'ja' ? CookiesJa :
  locale === 'ko' ? CookiesKo :
  CookiesZh;

  return (
    <Shell>
      <article className={cx(styles.r_0478c89a, styles.r_1bf5f8e9, styles.r_86e3700d, styles.r_2191c145, styles.r_e7eab4cb)}>
        <Body />
      </article>
    </Shell>);

}