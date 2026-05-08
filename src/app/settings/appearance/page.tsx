'use client';

import { Shell } from '@/components/layout/Shell';
import { useI18n } from '@/i18n/I18nContext';
import { useTheme } from '@/theme/ThemeContext';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';
import { THEME_REGISTRY } from '@/lib/themes';

export default function AppearanceSettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { prefs, updatePrefs, activeThemes } = useTheme();

  const toggleGlobal = () => updatePrefs({ globalDisabled: !prefs.globalDisabled });

  const toggleSlug = (slug: string) => {
    const next = prefs.disabledSlugs.includes(slug)
      ? prefs.disabledSlugs.filter((s) => s !== slug)
      : [...prefs.disabledSlugs, slug];
    updatePrefs({ disabledSlugs: next });
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="card p-6">
          <h1 className="text-xl font-semibold mb-4">
            🌐 {t('settings.appearance.language') || '语言'}
          </h1>
          <p className="text-sm text-leaf-600 mb-4">
            {t('settings.appearance.languageDesc') ||
              '你的语言偏好会保存到账户(已登录)和本地 cookie。'}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">
            🎉 {t('settings.appearance.festival') || '节日主题'}
          </h2>
          <p className="text-sm text-leaf-600 mb-4">
            {t('settings.appearance.festivalDesc') ||
              '我们在春节、中秋、圣诞等节日会给社区换上应景的装饰。不喜欢也可以关掉。'}
          </p>

          {/* 全局开关 */}
          <label className="flex items-center justify-between rounded-lg border border-leaf-100 p-4 mb-4 cursor-pointer">
            <div>
              <div className="font-medium">
                {t('settings.appearance.festivalGlobal') || '开启节日主题'}
              </div>
              <div className="text-xs text-leaf-500">
                {t('settings.appearance.festivalGlobalDesc') ||
                  '关闭后所有节日装饰将不再显示'}
              </div>
            </div>
            <input
              type="checkbox"
              className="h-5 w-9 appearance-none rounded-full bg-leaf-200 checked:bg-leaf-500 relative transition before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition checked:before:translate-x-4"
              checked={!prefs.globalDisabled}
              onChange={toggleGlobal}
            />
          </label>

          {/* 单个节日开关 */}
          <div className="text-sm font-medium mb-2">
            {t('settings.appearance.festivalList') || '逐个节日开关'}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {THEME_REGISTRY.map((th) => {
              const isActive = activeThemes.some((a) => a.slug === th.slug);
              const disabled = prefs.disabledSlugs.includes(th.slug);
              return (
                <label
                  key={th.slug}
                  className={[
                    'flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition',
                    disabled || prefs.globalDisabled
                      ? 'border-leaf-100 bg-leaf-50/50 text-leaf-500'
                      : 'border-leaf-100 hover:bg-leaf-50',
                    isActive ? 'ring-1 ring-leaf-300' : '',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{th.decoration.logoBadge}</span>
                    <span className="font-medium">{th.name}</span>
                    {isActive && (
                      <span className="rounded-full bg-leaf-100 text-leaf-700 text-[10px] px-1.5 py-0.5">
                        {t('settings.appearance.active') || '进行中'}
                      </span>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!disabled}
                    disabled={prefs.globalDisabled}
                    onChange={() => toggleSlug(th.slug)}
                  />
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}
