'use client';

/**
 * 用户协议 /terms — 5 语种版本
 *
 * 映射策略:
 *   zh-CN / zh-TW / en 保留原文;ja / ko 新增全文
 *   任何未翻译的语种会回退到 zh-CN(视用户地区)或 en
 */

import { Shell } from '@/components/layout/Shell';
import { useI18n } from '@/i18n/I18nContext';
import { TermsZh } from './TermsZh';
import { TermsTw } from './TermsTw';
import { TermsEn } from './TermsEn';
import { TermsJa } from './TermsJa';
import { TermsKo } from './TermsKo';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export default function TermsPage() {
  const { locale } = useI18n();
  const Body =
  locale === "zh-CN" ? TermsZh :
  locale === "zh-TW" ? TermsTw :
  locale === 'en' ? TermsEn :
  locale === 'ja' ? TermsJa :
  locale === 'ko' ? TermsKo :
  TermsZh;

  return (
    <Shell>
      <article className={cx(styles.r_0478c89a, styles.r_1bf5f8e9, styles.r_86e3700d, styles.r_2191c145, styles.r_e7eab4cb)}>
        <Body />
      </article>
    </Shell>);

}