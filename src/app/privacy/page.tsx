'use client';

import { Shell } from '@/components/layout/Shell';
import { useI18n } from '@/i18n/I18nContext';
import { PrivacyZh } from './PrivacyZh';
import { PrivacyTw } from './PrivacyTw';
import { PrivacyEn } from './PrivacyEn';
import { PrivacyJa } from './PrivacyJa';
import { PrivacyKo } from './PrivacyKo';

export default function PrivacyPage() {
  const { locale } = useI18n();
  const Body =
    locale === 'zh-CN' ? PrivacyZh
    : locale === 'zh-TW' ? PrivacyTw
    : locale === 'en'    ? PrivacyEn
    : locale === 'ja'    ? PrivacyJa
    : locale === 'ko'    ? PrivacyKo
    : PrivacyZh;

  return (
    <Shell>
      <article className="card p-6 prose prose-sm sm:prose-base max-w-none text-leaf-800">
        <Body />
      </article>
    </Shell>
  );
}
