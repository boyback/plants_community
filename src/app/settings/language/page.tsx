'use client';

import { useI18n } from '@/i18n/I18nContext';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';
import { Button } from '@/components/ui/Button';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import styles from './page.module.scss';

export default function LanguageSettingsPage() {
  const { locale, setLocale } = useI18n();

  return (
    <SettingsPanel icon="globe" title="语言" description="你的语言偏好会保存在账户和本地 cookie。">
      <div className={styles.languages}>
        {locales.map((l) => (
          <Button
            key={l}
            type="button"
            onClick={() => setLocale(l as Locale)}
            variant={locale === l ? 'primary' : 'outline'}
          >
            <span className={styles.flag}>{localeFlags[l]}</span>
            <span>{localeNames[l]}</span>
          </Button>
        ))}
      </div>
    </SettingsPanel>
  );
}
