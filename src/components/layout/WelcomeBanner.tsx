'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';

const STORAGE_KEY = 'rouyou.welcomeBanner.dismissed';

/**
 * 顶部欢迎条
 * - 仅未登录用户可见
 * - 用户点关闭后写 localStorage,以后不再展示
 * - 跨整个 viewport,放在 Header 上方
 */
export function WelcomeBanner() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(true); // SSR 默认隐藏,避免闪烁

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      setDismissed(v === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  // 已登录或已关闭或还在 loading → 不显示
  if (loading || user || dismissed) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative z-30 bg-gradient-to-r from-leaf-500 via-leaf-400 to-leaf-500 text-white shadow-sm">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-2 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[12px] leading-5">
          <span className="shrink-0 text-base">🌱</span>
          <span className="truncate">
            <b className="font-semibold">{t('home.signIn.welcomeTitle')}</b>
            <span className="ml-2 hidden opacity-90 sm:inline">
              {t('home.signIn.welcomeSub')}
            </span>
          </span>
        </div>
        <Link
          href="/login?redirect=/"
          className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-leaf-700 transition-colors hover:bg-leaf-50"
        >
          登录 / 注册
        </Link>
        <button
          type="button"
          onClick={close}
          aria-label="关闭"
          className="shrink-0 grid h-6 w-6 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}
