'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'rouyou.welcomeBanner.dismissed';

/**
 * 顶部欢迎条
 * - 仅未登录用户可见
 * - 文案鼓动性,展示社区规模/养肉氛围,引导注册
 * - 关闭后 localStorage 持久化,不再出现
 */

/** 顶部 banner 文案 */
const HOOKS = [
  '🌿 注册送 100 积分 · 登录每天 +5 · 连续 7 天送徽章 · 更多功能等你解锁 · 这里是多肉爱好者的聚集地',
];

export function WelcomeBanner() {
  const { user, loading } = useAuth();
  const [dismissed, setDismissed] = useState(true); // SSR 默认隐藏,避免闪烁
  const [hook, setHook] = useState<string>(HOOKS[0]!);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      setDismissed(v === '1');
    } catch {
      setDismissed(false);
    }
    // 随机一句
    setHook(HOOKS[Math.floor(Math.random() * HOOKS.length)]!);
  }, []);

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
        <div className="min-w-0 flex-1 truncate text-[12px] leading-5 font-medium">
          {hook}
        </div>
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
