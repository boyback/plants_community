'use client';

import { useEffect, useRef, useState } from 'react';
import { useColorTheme } from '@/context/ColorThemeContext';
import { cn } from '@/lib/utils';

/**
 * 配色主题切换器(头部用)
 * - 点击展开下拉:12 主题色板 + 明/暗模式切换
 * - 选中后立即生效,保存 localStorage
 */
export function ColorThemeSwitcher({ className }: { className?: string }) {
  const { theme, mode, meta, setTheme, toggleMode, themes } = useColorTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭(用 click + setTimeout 跳过开门那一击)
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const tid = setTimeout(() => {
      document.addEventListener('click', onDoc);
    }, 0);
    return () => {
      clearTimeout(tid);
      document.removeEventListener('click', onDoc);
    };
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`主题:${meta.name} · ${mode === 'dark' ? '暗黑' : '明亮'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-full text-base hover:bg-leaf-50"
      >
        {meta.logoEmoji}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-2xl border border-leaf-100 bg-white p-3 shadow-card dark:bg-leaf-50">
          {/* 头部:标题 + 明/暗 toggle */}
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-ink-800">🎨 配色主题</div>
            <button
              type="button"
              onClick={toggleMode}
              className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2.5 py-1 text-[11px] text-leaf-700 transition-colors hover:bg-leaf-100"
              title={mode === 'dark' ? '切换到明亮' : '切换到暗黑'}
            >
              <span>{mode === 'dark' ? '🌙' : '☀️'}</span>
              <span>{mode === 'dark' ? '暗黑' : '明亮'}</span>
            </button>
          </div>

          {/* 主题色板网格 */}
          <div className="grid max-h-[420px] grid-cols-2 gap-1.5 overflow-y-auto pr-0.5">
            {themes.map((t) => {
              const active = t.key === theme;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setTheme(t.key);
                    setOpen(false);
                  }}
                  className={cn(
                    'group flex flex-col items-start gap-1 rounded-xl border-2 p-2 text-left transition-all',
                    active
                      ? 'border-leaf-500 bg-leaf-50/60'
                      : 'border-leaf-100 hover:border-leaf-300'
                  )}
                >
                  <div
                    className="flex h-5 w-full items-center overflow-hidden rounded-md ring-1 ring-black/5"
                    style={{ background: t.swatch.bg }}
                  >
                    <span
                      className="block h-full w-1/2"
                      style={{ background: t.swatch.primary }}
                    />
                  </div>
                  <div className="flex w-full items-center justify-between">
                    <span className="truncate text-xs font-medium text-ink-800">
                      {t.logoEmoji} {t.name}
                    </span>
                    {active && (
                      <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-leaf-500 text-[9px] text-white">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="flex w-full items-center justify-between text-[10px] text-leaf-700/70">
                    <span className="truncate">{t.desc}</span>
                    <span className="ml-1 shrink-0 rounded bg-leaf-50/80 px-1 text-[9px] text-leaf-700/60">
                      {t.vibe}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
