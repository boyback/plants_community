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

export default function TermsPage() {
  const { locale } = useI18n();
  const Body =
    locale === 'zh-CN' ? TermsZh
    : locale === 'zh-TW' ? TermsTw
    : locale === 'en'    ? TermsEn
    : locale === 'ja'    ? TermsJa
    : locale === 'ko'    ? TermsKo
    : TermsZh;

  return (
    <Shell>
      <article className="card p-6 prose prose-sm sm:prose-base max-w-none text-leaf-800">
        <Body />
      </article>
    </Shell>
  );
}
