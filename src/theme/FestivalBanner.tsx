'use client';

/**
 * 顶部节日横条:
 *   - 从左到右渐变 accentFrom → accentTo
 *   - 居中一句话(走 i18n key,缺失则显示节日名)
 *   - 右侧一个关闭按钮,单次关闭当次 session 的当前主题(不写 DB)
 *
 * 设计要求:高度仅 28px,不遮挡内容;若没有主题,组件空返回。
 */
import { useEffect, useState } from 'react';
import { useTheme } from './ThemeContext';
import { useI18n } from '@/i18n/I18nContext';

const SESSION_KEY_PREFIX = 'rouyou.festivalDismissed.';

export function FestivalBanner() {
  const { primary } = useTheme();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!primary) {
      setDismissed(false);
      return;
    }
    const d = sessionStorage.getItem(SESSION_KEY_PREFIX + primary.slug);
    setDismissed(d === '1');
  }, [primary]);

  if (!primary || dismissed) return null;

  const bannerText = t(primary.decoration.bannerTextKey) || primary.name;

  return (
    <div
      className="relative h-7 overflow-hidden text-white text-xs flex items-center justify-center select-none"
      style={{
        background: `linear-gradient(90deg, ${primary.decoration.accentFrom}, ${primary.decoration.accentTo})`,
      }}
      role="status"
    >
      <span className="px-3 truncate" title={bannerText}>
        <span className="mr-1" aria-hidden>{primary.decoration.logoBadge}</span>
        {bannerText}
      </span>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem(SESSION_KEY_PREFIX + primary.slug, '1');
          setDismissed(true);
        }}
        aria-label="关闭节日横幅"
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100 text-[11px]"
      >
        ✕
      </button>
    </div>
  );
}
