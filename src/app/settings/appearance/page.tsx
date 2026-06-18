'use client';

import { useI18n } from '@/i18n/I18nContext';
import { useTheme } from '@/theme/ThemeContext';
import { THEME_REGISTRY } from '@/lib/themes';
import { Switch } from '@/components/ui/Switch';
import { SettingsPanel, SettingsRow, SettingsRows } from '@/components/settings/SettingsPanel';
import styles from './page.module.scss';

export default function AppearanceSettingsPage() {
  const { t } = useI18n();
  const { prefs, updatePrefs, activeThemes } = useTheme();

  const toggleGlobal = () => updatePrefs({ globalDisabled: !prefs.globalDisabled });

  const toggleSlug = (slug: string) => {
    const next = prefs.disabledSlugs.includes(slug)
      ? prefs.disabledSlugs.filter((s) => s !== slug)
      : [...prefs.disabledSlugs, slug];
    updatePrefs({ disabledSlugs: next });
  };

  return (
    <SettingsPanel
      icon="palette"
      title="外观"
      description={t('settings.appearance.festivalDesc') || '控制社区节日主题和装饰效果。'}
    >
      <SettingsRows>
        <SettingsRow
          icon="palette"
          tone="blue"
          title={t('settings.appearance.festivalGlobal') || '开启节日主题'}
          description={t('settings.appearance.festivalGlobalDesc') || '关闭后所有节日装饰将不再显示'}
          action={<Switch checked={!prefs.globalDisabled} onChange={toggleGlobal} />}
        />
        {THEME_REGISTRY.map((th) => {
          const isActive = activeThemes.some((a) => a.slug === th.slug);
          const disabled = prefs.disabledSlugs.includes(th.slug);
          return (
            <SettingsRow
              key={th.slug}
              icon="star"
              tone={isActive ? 'green' : 'teal'}
              title={
                <span className={styles.themeTitle}>
                  <span>{th.decoration.logoBadge}</span>
                  <span>{th.name}</span>
                  {isActive && <span className={styles.activeTag}>{t('settings.appearance.active') || '进行中'}</span>}
                </span>
              }
              description={t('settings.appearance.festivalList') || '单个节日开关'}
              action={
                <Switch checked={!disabled} disabled={prefs.globalDisabled} onChange={() => toggleSlug(th.slug)} />
              }
            />
          );
        })}
      </SettingsRows>
    </SettingsPanel>
  );
}
