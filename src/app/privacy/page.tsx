'use client';

import { Shell } from '@/components/layout/Shell';
import { useI18n } from '@/i18n/I18nContext';
import { PrivacyZh } from './PrivacyZh';
import { PrivacyTw } from './PrivacyTw';
import { PrivacyEn } from './PrivacyEn';
import { PrivacyJa } from './PrivacyJa';
import { PrivacyKo } from './PrivacyKo';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export default function PrivacyPage() {
  const { locale } = useI18n();
  const Body =
  locale === "zh-CN" ? PrivacyZh :
  locale === "zh-TW" ? PrivacyTw :
  locale === 'en' ? PrivacyEn :
  locale === 'ja' ? PrivacyJa :
  locale === 'ko' ? PrivacyKo :
  PrivacyZh;

  return (
    <Shell>
      <article className={cx(styles.r_0478c89a, styles.r_1bf5f8e9, styles.r_86e3700d, styles.r_2191c145, styles.r_e7eab4cb)}>
        <Body />
      </article>
    </Shell>);

}