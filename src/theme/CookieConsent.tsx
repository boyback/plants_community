'use client';

/**
 * Cookie 同意框
 *
 * 设计:
 *   - 首次访问底部弹出一条浮层,提供三按钮:全部接受 / 仅必需 / 自定义
 *   - 自定义面板里列出四大类 Cookie,「必要类」禁用勾选(强制 true)
 *   - 选择后写 localStorage,键名 rouyou.cookieConsent.v1,有效期 6 个月
 *   - 内容字段提供给其他组件查询:useCookieConsent()
 *
 * 注:本项目当前只有必要类 cookie 实际在用(JWT + locale),但我们保留完整的
 *     同意机制以便未来引入分析/广告类 cookie 时已合规。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode } from
'react';
import { useI18n } from '@/i18n/I18nContext';
import styles from './CookieConsent.module.scss';
import { cx } from '@/lib/style-utils';



export type ConsentCategory =
'necessary' // 必要类 — 不可关闭
| 'preferences' // 功能类
| 'analytics' // 分析类
| 'advertising'; // 广告类

export interface Consent {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  advertising: boolean;
  version: number;
  decidedAt: string; // ISO
}

const STORAGE_KEY = 'rouyou.cookieConsent.v1';
const VERSION = 1;
const VALIDITY_MS = 180 * 24 * 60 * 60 * 1000; // 6 个月

function defaultConsent(): Consent {
  return {
    necessary: true,
    preferences: false,
    analytics: false,
    advertising: false,
    version: VERSION,
    decidedAt: new Date().toISOString()
  };
}

function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: Consent = JSON.parse(raw);
    if (parsed.version !== VERSION) return null;
    const ageMs = Date.now() - new Date(parsed.decidedAt).getTime();
    if (ageMs > VALIDITY_MS) return null; // 过期重新询问
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(c: Consent) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

// -------------------- Context 与 Hook --------------------

interface CookieContextValue {
  consent: Consent | null;
  decided: boolean;
  setConsent: (c: Partial<Consent>) => void;
  reopen: () => void; // 从设置页手动重新打开
}

const CookieCtx = createContext<CookieContextValue | null>(null);

export function CookieConsentProvider({ children }: {children: ReactNode;}) {
  const [consent, setC] = useState<Consent | null>(null);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    const c = readConsent();
    setC(c);
    setDecided(c !== null);
  }, []);

  const setConsent = useCallback((patch: Partial<Consent>) => {
    const merged: Consent = {
      ...defaultConsent(),
      ...(consent ?? {}),
      ...patch,
      necessary: true, // 永远为 true
      version: VERSION,
      decidedAt: new Date().toISOString()
    };
    writeConsent(merged);
    setC(merged);
    setDecided(true);
  }, [consent]);

  const reopen = useCallback(() => {
    setDecided(false);
  }, []);

  const value = useMemo(() => ({ consent, decided, setConsent, reopen }), [consent, decided, setConsent, reopen]);

  return (
    <CookieCtx.Provider value={value}>
      {children}
      <CookieConsentBanner />
    </CookieCtx.Provider>);

}

export function useCookieConsent(): CookieContextValue {
  const ctx = useContext(CookieCtx);
  if (!ctx) {
    return {
      consent: null,
      decided: true,
      setConsent: () => {},
      reopen: () => {}
    };
  }
  return ctx;
}

// -------------------- Banner UI --------------------

function CookieConsentBanner() {
  const { decided, setConsent } = useCookieConsent();
  const { t } = useI18n();
  const [showCustomise, setShowCustomise] = useState(false);
  const [choices, setChoices] = useState<Omit<Consent, 'necessary' | 'version' | 'decidedAt'> & {necessary: true;}>({
    necessary: true,
    preferences: true,
    analytics: false,
    advertising: false
  });

  if (decided) return null;

  const acceptAll = () => setConsent({ preferences: true, analytics: true, advertising: true });
  const onlyNecessary = () => setConsent({ preferences: false, analytics: false, advertising: false });
  const savePreferences = () =>
  setConsent({
    preferences: choices.preferences,
    analytics: choices.analytics,
    advertising: choices.advertising
  });

  return (
    <div
      className={cx(styles.r_7bc55599, styles.r_3f6397bf, styles.r_189f036c, styles.r_181b2866, styles.r_f5ebd4d0, styles.r_0b2e8c28, styles.r_b950dda2, styles.r_88b684d2, styles.r_1ca9e4dc)}
      role="dialog"
      aria-label={t('cookie.title') || 'Cookie 选项'}>

      <div className={cx(styles.r_0e12dc7d, styles.r_60fbb771, styles.r_da310242, styles.r_8dddea07, styles.r_1004c0c3, styles.r_f0faeb26, styles.r_cb11fec3, styles.r_2499ab8d, styles.r_2adea12c, styles.r_cef36121)}>
        {!showCustomise ?
        <>
            <div className={cx(styles.r_36e579c0, styles.r_fc7473ca, styles.r_5f6a59f1)}>
              <p className={styles.r_65281709}>
                🍪 <strong>{t('cookie.title') || '我们尊重你的 Cookie 偏好'}</strong>
              </p>
              <p className={cx(styles.r_b17d6a13, styles.r_359090c2, styles.r_6b189c6e)}>
                {t('cookie.desc') ||
              '我们使用 Cookie 让肉友社正常运行并不断改进。必要类 Cookie 无法关闭;其他类别你可以自由选择。'}
                {' '}
                <a href="/cookies" className={cx(styles.r_c82b67c8, styles.r_81be6435)}>
                  {t('cookie.readPolicy') || '阅读完整 Cookie 政策'}
                </a>
              </p>
            </div>
            <div className={cx(styles.r_60fbb771, styles.r_012fbd12, styles.r_1eb5c6df, styles.r_77a2a20e)}>
              <button
              type="button"
              className={cx(styles.r_e7a768f9, styles.r_359090c2)}
              onClick={() => setShowCustomise(true)}>

                {t('cookie.customize') || '自定义'}
              </button>
              <button
              type="button"
              className={cx(styles.r_e7a768f9, styles.r_359090c2)}
              onClick={onlyNecessary}>

                {t('cookie.onlyNecessary') || '仅必需'}
              </button>
              <button
              type="button"
              className={cx(styles.r_e7a768f9, styles.r_359090c2)}
              onClick={acceptAll}>

                {t('cookie.acceptAll') || '全部接受'}
              </button>
            </div>
          </> :

        <div className={styles.r_6da6a3c3}>
            <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
              <div className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_e7eab4cb)}>
                {t('cookie.customizeTitle') || '选择 Cookie 类别'}
              </div>
              <button
              type="button"
              onClick={() => setShowCustomise(false)}
              className={cx(styles.r_359090c2, styles.r_eb16169c, styles.r_9825203a)}
              aria-label="back">

                ← {t('common.back') || '返回'}
              </button>
            </div>
            <div className={cx(styles.r_f3c543ad, styles.r_77a2a20e, styles.r_e00ad816)}>
              <CategoryRow
              title={t('cookie.necessary') || '必要类'}
              desc={t('cookie.necessaryDesc') || '登录、安全、支付等必备功能,无法关闭'}
              checked
              disabled />

              <CategoryRow
              title={t('cookie.preferences') || '功能类'}
              desc={t('cookie.preferencesDesc') || '记住语言、主题、发帖草稿等偏好'}
              checked={choices.preferences}
              onChange={(v) => setChoices((s) => ({ ...s, preferences: v }))} />

              <CategoryRow
              title={t('cookie.analytics') || '分析类'}
              desc={t('cookie.analyticsDesc') || '匿名统计用于改进产品质量'}
              checked={choices.analytics}
              onChange={(v) => setChoices((s) => ({ ...s, analytics: v }))} />

              <CategoryRow
              title={t('cookie.advertising') || '广告类'}
              desc={t('cookie.advertisingDesc') || '本服务当前不投放广告,保留占位'}
              checked={choices.advertising}
              onChange={(v) => setChoices((s) => ({ ...s, advertising: v }))} />

            </div>
            <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
              <button
              type="button"
              className={cx(styles.r_e7a768f9, styles.r_359090c2)}
              onClick={onlyNecessary}>

                {t('cookie.onlyNecessary') || '仅必需'}
              </button>
              <button
              type="button"
              className={cx(styles.r_e7a768f9, styles.r_359090c2)}
              onClick={savePreferences}>

                {t('cookie.saveChoice') || '保存选择'}
              </button>
            </div>
          </div>
        }
      </div>
    </div>);

}

function CategoryRow({
  title,
  desc,
  checked,
  disabled,
  onChange






}: {title: string;desc: string;checked: boolean;disabled?: boolean;onChange?: (v: boolean) => void;}) {
  return (
    <label
      className={[cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_1004c0c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_eb6e8b88),

      disabled ? cx(styles.r_88b684d2, styles.r_9ac94195, styles.r_eb16169c, styles.r_29b733e4) : cx(styles.r_88b684d2, styles.r_80751c7f, styles.r_34516836)].


      join(' ')}>

      <input
        type="checkbox"
        className={cx(styles.r_15e1b1f4, styles.r_11e59c6d, styles.r_dc7972eb)}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)} />

      <span className={styles.r_36e579c0}>
        <span className={cx(styles.r_0214b4b3, styles.r_fc7473ca, styles.r_2689f395)}>{title}</span>
        <span className={cx(styles.r_0214b4b3, styles.r_359090c2, styles.r_eb16169c, styles.r_15e1b1f4)}>{desc}</span>
      </span>
    </label>);

}