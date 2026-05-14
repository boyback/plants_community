'use client';

import { useI18n } from '@/i18n/I18nContext';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';

export default function LanguageSettingsPage() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="card p-6">
      <h1 className="text-xl font-semibold mb-4">
        🌐 语言
      </h1>
      <p className="text-sm text-leaf-600 mb-4">
        你的语言偏好会保存到账户(已登录)和本地 cookie。
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l as Locale)}
            className={[
              'rounded-lg border px-3 py-2 text-sm flex items-center gap-2 justify-center',
              locale === l
                ? 'border-leaf-500 bg-leaf-50 text-leaf-800 font-medium'
                : 'border-leaf-100 text-leaf-700 hover:bg-leaf-50',
            ].join(' ')}
          >
            <span className="text-base">{localeFlags[l]}</span>
            <span>{localeNames[l]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
