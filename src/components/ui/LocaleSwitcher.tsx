'use client';

import { useI18n } from '@/i18n/I18nContext';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';
import { useHoverOpen } from '@/lib/hooks/useHoverOpen';
import { cn } from '@/lib/utils';

/**
 * 语言切换 — **悬浮触发**(hover 进入展开,离开 150ms 关闭)
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const { open, bind, close } = useHoverOpen();

  return (
    <div className={cn('relative', className)} {...bind}>
      <button
        type="button"
        className="flex items-center gap-1 rounded-full border border-leaf-100 px-2.5 py-1 text-xs text-leaf-700 hover:bg-leaf-50"
        aria-label="切换语言"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{localeFlags[locale]}</span>
        <span className="hidden sm:inline">{localeNames[locale]}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div
          className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-lg border border-leaf-100 bg-white shadow-lg"
          role="listbox"
        >
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              role="option"
              aria-selected={locale === l}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-leaf-50',
                locale === l ? 'bg-leaf-50/70 font-medium text-leaf-800' : 'text-leaf-700',
              )}
              onClick={async () => {
                await setLocale(l as Locale);
                close();
              }}
            >
              <span className="text-base">{localeFlags[l]}</span>
              <span>{localeNames[l]}</span>
              {locale === l && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
