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
import styles from './FestivalBanner.module.scss';
import { cx } from '@/lib/style-utils';



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
      className={cx(styles.r_d89972fe, styles.r_d0a52b31, styles.r_2cd02d11, styles.r_72a4c7cd, styles.r_359090c2, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_7f691228)}
      style={{
        background: `linear-gradient(90deg, ${primary.decoration.accentFrom}, ${primary.decoration.accentTo})`
      }}
      role="status">

      <span className={cx(styles.r_0e17f2bd, styles.r_f283ea9b)} title={bannerText}>
        <span className={styles.r_61816240} aria-hidden>{primary.decoration.logoBadge}</span>
        {bannerText}
      </span>
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem(SESSION_KEY_PREFIX + primary.slug, '1');
          setDismissed(true);
        }}
        aria-label="关闭节日横幅"
        className={cx(styles.r_da4dbfbc, styles.r_7b2d6393, styles.r_d694ba66, styles.r_36b381be, styles.r_714816ef, styles.r_5da1d525, styles.r_d058ca6d)}>

        ✕
      </button>
    </div>);

}