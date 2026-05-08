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
  type ReactNode,
} from 'react';
import { useI18n } from '@/i18n/I18nContext';

export type ConsentCategory =
  | 'necessary' // 必要类 — 不可关闭
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
    decidedAt: new Date().toISOString(),
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

export function CookieConsentProvider({ children }: { children: ReactNode }) {
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
      decidedAt: new Date().toISOString(),
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
    </CookieCtx.Provider>
  );
}

export function useCookieConsent(): CookieContextValue {
  const ctx = useContext(CookieCtx);
  if (!ctx) {
    return {
      consent: null,
      decided: true,
      setConsent: () => {},
      reopen: () => {},
    };
  }
  return ctx;
}

// -------------------- Banner UI --------------------

function CookieConsentBanner() {
  const { decided, setConsent } = useCookieConsent();
  const { t } = useI18n();
  const [showCustomise, setShowCustomise] = useState(false);
  const [choices, setChoices] = useState<Omit<Consent, 'necessary' | 'version' | 'decidedAt'> & { necessary: true }>({
    necessary: true,
    preferences: true,
    analytics: false,
    advertising: false,
  });

  if (decided) return null;

  const acceptAll = () => setConsent({ preferences: true, analytics: true, advertising: true });
  const onlyNecessary = () => setConsent({ preferences: false, analytics: false, advertising: false });
  const savePreferences = () =>
    setConsent({
      preferences: choices.preferences,
      analytics: choices.analytics,
      advertising: choices.advertising,
    });

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur border-t border-leaf-100 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]"
      role="dialog"
      aria-label={t('cookie.title') || 'Cookie 选项'}
    >
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-4 py-4 lg:px-6 lg:flex-row lg:items-center">
        {!showCustomise ? (
          <>
            <div className="flex-1 text-sm text-leaf-700">
              <p className="mb-1">
                🍪 <strong>{t('cookie.title') || '我们尊重你的 Cookie 偏好'}</strong>
              </p>
              <p className="text-leaf-600 text-xs leading-relaxed">
                {t('cookie.desc') ||
                  '我们使用 Cookie 让肉友社正常运行并不断改进。必要类 Cookie 无法关闭;其他类别你可以自由选择。'}
                {' '}
                <a href="/cookies" className="underline hover:text-leaf-800">
                  {t('cookie.readPolicy') || '阅读完整 Cookie 政策'}
                </a>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost h-9 text-xs"
                onClick={() => setShowCustomise(true)}
              >
                {t('cookie.customize') || '自定义'}
              </button>
              <button
                type="button"
                className="btn-ghost h-9 text-xs"
                onClick={onlyNecessary}
              >
                {t('cookie.onlyNecessary') || '仅必需'}
              </button>
              <button
                type="button"
                className="btn-primary h-9 text-xs"
                onClick={acceptAll}
              >
                {t('cookie.acceptAll') || '全部接受'}
              </button>
            </div>
          </>
        ) : (
          <div className="w-full">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium text-leaf-800">
                {t('cookie.customizeTitle') || '选择 Cookie 类别'}
              </div>
              <button
                type="button"
                onClick={() => setShowCustomise(false)}
                className="text-xs text-leaf-500 hover:text-leaf-700"
                aria-label="back"
              >
                ← {t('common.back') || '返回'}
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <CategoryRow
                title={t('cookie.necessary') || '必要类'}
                desc={t('cookie.necessaryDesc') || '登录、安全、支付等必备功能,无法关闭'}
                checked
                disabled
              />
              <CategoryRow
                title={t('cookie.preferences') || '功能类'}
                desc={t('cookie.preferencesDesc') || '记住语言、主题、发帖草稿等偏好'}
                checked={choices.preferences}
                onChange={(v) => setChoices((s) => ({ ...s, preferences: v }))}
              />
              <CategoryRow
                title={t('cookie.analytics') || '分析类'}
                desc={t('cookie.analyticsDesc') || '匿名统计用于改进产品质量'}
                checked={choices.analytics}
                onChange={(v) => setChoices((s) => ({ ...s, analytics: v }))}
              />
              <CategoryRow
                title={t('cookie.advertising') || '广告类'}
                desc={t('cookie.advertisingDesc') || '本服务当前不投放广告,保留占位'}
                checked={choices.advertising}
                onChange={(v) => setChoices((s) => ({ ...s, advertising: v }))}
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost h-9 text-xs"
                onClick={onlyNecessary}
              >
                {t('cookie.onlyNecessary') || '仅必需'}
              </button>
              <button
                type="button"
                className="btn-primary h-9 text-xs"
                onClick={savePreferences}
              >
                {t('cookie.saveChoice') || '保存选择'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  title,
  desc,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label
      className={[
        'flex items-start gap-3 rounded-lg border p-3',
        disabled
          ? 'border-leaf-100 bg-leaf-50/50 text-leaf-500 cursor-not-allowed'
          : 'border-leaf-100 hover:bg-leaf-50/60 cursor-pointer',
      ].join(' ')}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-leaf-500 mt-0.5">{desc}</span>
      </span>
    </label>
  );
}
