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

/** 6 句轮播文案 — 每次刷新随机一句,避免视觉疲劳 */
const HOOKS = [
  '🌱 5 万肉友的多肉日记 · 加入第一棵你养的多肉记录在这里',
  '🌵 「今天我家红宝石爆崽了」点开看看肉友们的故事',
  '🌸 免费养肉助手:浇水提醒 / 度夏防腐 / 拍照记录',
  '☀️ 北方度夏 38℃ 怎么救?这里有 1000+ 真实案例',
  '🍃 多肉品种太多记不住?图鉴+难度评分一键对比',
  '🌿 注册送 100 积分 · 登录每天 +5 · 连续 7 天送徽章',
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
