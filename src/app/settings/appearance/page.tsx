'use client';

import { useI18n } from '@/i18n/I18nContext';
import { useTheme } from '@/theme/ThemeContext';
import { THEME_REGISTRY } from '@/lib/themes';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export default function AppearanceSettingsPage() {
  const { t } = useI18n();
  const { prefs, updatePrefs, activeThemes } = useTheme();

  const toggleGlobal = () => updatePrefs({ globalDisabled: !prefs.globalDisabled });

  const toggleSlug = (slug: string) => {
    const next = prefs.disabledSlugs.includes(slug) ?
    prefs.disabledSlugs.filter((s) => s !== slug) :
    [...prefs.disabledSlugs, slug];
    updatePrefs({ disabledSlugs: next });
  };

  return (
    <div className={styles.r_b3542e05}>
      <div className={styles.r_0478c89a}>
        <h1 className={cx(styles.r_d5c9b000, styles.r_e83a7042, styles.r_da019856)}>
          🎨 外观
        </h1>

        <div className={styles.r_3e7ce58d}>
          {/* 节日主题 */}
          <div>
            <h2 className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_a77ed4d9)}>
              {t('settings.appearance.festival') || '节日主题'}
            </h2>
            <p className={cx(styles.r_359090c2, styles.r_b17d6a13, styles.r_1bb88326)}>
              {t('settings.appearance.festivalDesc') ||
              '我们在春节、中秋、圣诞等节日会给社区换上应景的装饰。不喜欢也可以关掉。'}
            </p>

            {/* 全局开关 */}
            <label className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_8e63407b, styles.r_da019856, styles.r_34516836)}>
              <div>
                <div className={styles.r_2689f395}>
                  {t('settings.appearance.festivalGlobal') || '开启节日主题'}
                </div>
                <div className={cx(styles.r_359090c2, styles.r_eb16169c)}>
                  {t('settings.appearance.festivalGlobalDesc') ||
                  '关闭后所有节日装饰将不再显示'}
                </div>
              </div>
              <input
                type="checkbox"
                className={cx(styles.r_cd0d9c51, styles.r_ae2181c7, styles.r_eeea4367, styles.r_ac204c10, styles.r_ae525718, styles.r_af0bb5cc, styles.r_d89972fe, styles.r_56bf8ae8, styles.r_884dada4, styles.r_4fb45010, styles.r_806c31d4, styles.r_c793a0eb, styles.r_f2ef5b09, styles.r_5ccc21df, styles.r_8c9e59d4, styles.r_e00af0a7, styles.r_59ea0850)}
                checked={!prefs.globalDisabled}
                onChange={toggleGlobal} />

            </label>

            {/* 单个节日开关 */}
            <div className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_a77ed4d9)}>
              {t('settings.appearance.festivalList') || '逐个节日开关'}
            </div>
            <div className={cx(styles.r_f3c543ad, styles.r_77a2a20e, styles.r_e00ad816)}>
              {THEME_REGISTRY.map((th) => {
                const isActive = activeThemes.some((a) => a.slug === th.slug);
                const disabled = prefs.disabledSlugs.includes(th.slug);
                return (
                  <label
                    key={th.slug}
                    className={[cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_34516836, styles.r_56bf8ae8, styles.r_fc7473ca),

                    disabled || prefs.globalDisabled ? cx(styles.r_88b684d2, styles.r_9ac94195, styles.r_eb16169c) : cx(styles.r_88b684d2, styles.r_5756b7b4),


                    isActive ? cx(styles.r_3daca9af, styles.r_9b87abcd) : ''].
                    join(' ')}>

                    <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                      <span className={styles.r_42536e69}>{th.decoration.logoBadge}</span>
                      <span className={styles.r_2689f395}>{th.name}</span>
                      {isActive &&
                      <span className={cx(styles.r_ac204c10, styles.r_f2b23104, styles.r_5f6a59f1, styles.r_1dc571a3, styles.r_45d82811, styles.r_465609a2)}>
                          {t('settings.appearance.active') || '进行中'}
                        </span>
                      }
                    </span>
                    <input
                      type="checkbox"
                      className={cx(styles.r_11e59c6d, styles.r_dc7972eb)}
                      checked={!disabled}
                      disabled={prefs.globalDisabled}
                      onChange={() => toggleSlug(th.slug)} />

                  </label>);

              })}
            </div>
          </div>
        </div>
      </div>
    </div>);

}