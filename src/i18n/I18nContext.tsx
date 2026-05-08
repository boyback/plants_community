'use client';

/**
 * 轻量 i18n Context。
 *
 * API:
 *   const { t, locale, setLocale } = useI18n();
 *   t('nav.home')
 *   t('post.postCountPlural', { count: 3 })
 *
 * 设计要点(v0.15 重写,修死循环 + 语言切换卡死):
 *   - 翻译数据放 useRef 而不是 useState,避免 useEffect 依赖导致无限重入
 *   - setLocale 先加载完 messages 再切 state,确保切换后立刻有文案
 *   - 同一个 locale 的 fetch 做去重,防止重复请求
 *   - 翻译命中不到回退到默认 locale 再查一次,否则显示 key
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Locale, COOKIE_LOCALE, defaultLocale, locales } from './config';

type Messages = Record<string, unknown>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => Promise<void>;
  t: (key: string, vars?: Record<string, string | number>) => string;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** 从嵌套对象按 a.b.c 取值 */
function resolveKey(msgs: Messages | undefined, key: string): string | undefined {
  if (!msgs) return undefined;
  const segs = key.split('.');
  let cur: unknown = msgs;
  for (const s of segs) {
    if (cur && typeof cur === 'object' && s in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[s];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** 插值 {name} → value */
function interpolate(tpl: string, vars?: Record<string, string | number>): string {
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

/** 共享的 fetch — 对同一 locale 复用同一个 Promise,避免重复请求 */
const inflight = new Map<Locale, Promise<Messages>>();

async function loadLocale(locale: Locale): Promise<Messages> {
  const cached = inflight.get(locale);
  if (cached) return cached;
  const p = (async () => {
    try {
      const res = await fetch(`/api/i18n/${locale}`, { cache: 'force-cache' });
      if (!res.ok) return {};
      const body = (await res.json()) as { ok: boolean; data?: Messages };
      return body.data ?? {};
    } catch {
      return {};
    }
  })();
  inflight.set(locale, p);
  return p;
}

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
  initialMessages,
}: {
  children: ReactNode;
  initialLocale?: Locale;
  /** SSR 时从服务器磁盘直读的翻译,避免 hydration 阶段裸露 key */
  initialMessages?: Partial<Record<Locale, Messages>>;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  // 翻译数据存 ref,避免死循环 + 避免 render-time 读取 stale state
  // SSR 时用 initialMessages 初始化,保证 server render 立即出文案
  const cacheRef = useRef<Partial<Record<Locale, Messages>>>(initialMessages ?? {});
  // 只用一个数字 tick 触发 re-render
  const [tick, setTick] = useState(0);
  // 有 initialMessages 且当前 locale 已就绪,视为 ready
  const [ready, setReady] = useState(
    !!initialMessages && (!!initialMessages[initialLocale] || !!initialMessages[defaultLocale]),
  );

  // 启动时:确保默认 locale 和当前 locale 都在缓存里
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const needs: Locale[] = [];
      if (!cacheRef.current[defaultLocale]) needs.push(defaultLocale);
      if (initialLocale !== defaultLocale && !cacheRef.current[initialLocale]) {
        needs.push(initialLocale);
      }
      if (needs.length === 0) {
        if (!cancelled) setReady(true);
        return;
      }
      const results = await Promise.all(needs.map((l) => loadLocale(l)));
      if (cancelled) return;
      needs.forEach((l, i) => {
        cacheRef.current[l] = results[i];
      });
      setReady(true);
      setTick((x) => x + 1);
    })();
    return () => {
      cancelled = true;
    };
    // 只在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    // 先把目标 locale 的文案拿到,再切 state — 避免渲染时闪 key 名
    if (!cacheRef.current[l]) {
      const msgs = await loadLocale(l);
      cacheRef.current[l] = msgs;
    }

    // 写 cookie
    document.cookie = `${COOKIE_LOCALE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;

    // 同步后端(不阻塞 UI)
    fetch('/api/users/me/locale', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: l }),
    }).catch(() => {
      /* 未登录也不影响 */
    });

    setLocaleState(l);
    setTick((x) => x + 1);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      void tick;
      const hit = resolveKey(cacheRef.current[locale], key);
      if (hit !== undefined) return interpolate(hit, vars);
      const fallback = resolveKey(cacheRef.current[defaultLocale], key);
      if (fallback !== undefined) return interpolate(fallback, vars);
      return key;
    },
    [locale, tick],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, ready }),
    [locale, setLocale, t, ready],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // 非 Provider 下调用给一个降级实现(直接显示 key)
    return {
      locale: defaultLocale,
      setLocale: async () => {},
      t: (k) => k,
      ready: false,
    };
  }
  return ctx;
}

export { locales };
