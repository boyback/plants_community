'use client';

import { Shell } from '@/components/layout/Shell';
import { useI18n } from '@/i18n/I18nContext';
import { CookiesZh } from './CookiesZh';
import { CookiesTw } from './CookiesTw';
import { CookiesEn } from './CookiesEn';
import { CookiesJa } from './CookiesJa';
import { CookiesKo } from './CookiesKo';

export default function CookiesPage() {
  const { locale } = useI18n();
  const Body =
    locale === 'zh-CN' ? CookiesZh
    : locale === 'zh-TW' ? CookiesTw
    : locale === 'en'    ? CookiesEn
    : locale === 'ja'    ? CookiesJa
    : locale === 'ko'    ? CookiesKo
    : CookiesZh;

  return (
    <Shell>
      <article className="card p-6 prose prose-sm sm:prose-base max-w-none text-leaf-800">
        <Body />
      </article>
    </Shell>
  );
}
