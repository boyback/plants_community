'use client';

import { useEffect, useRef, useState } from 'react';
import { useColorTheme } from '@/context/ColorThemeContext';
import { cn } from '@/lib/utils';

/**
 * 配色主题切换按钮(头部用)
 * - 点击展开下拉,显示 4 个主题色板
 * - 选中后立即生效,保存 localStorage
 */
export function ColorThemeSwitcher({ className }: { className?: string }) {
  const { theme, meta, setTheme, themes } = useColorTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`主题:${meta.name}`}
        className="grid h-9 w-9 place-items-center rounded-full text-base hover:bg-leaf-50"
      >
        {meta.logoEmoji}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-leaf-100 bg-white p-2 shadow-card">
          <div className="mb-1 px-2 pt-1 text-[11px] font-medium text-leaf-700/70">
            🎨 配色主题
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1">
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
                  {/* 色板预览 */}
                  <div
                    className="flex h-5 w-full items-center overflow-hidden rounded-md ring-1 ring-black/5"
                    style={{ background: t.swatch.bg }}
                  >
                    <span className="block h-full w-1/2" style={{ background: t.swatch.primary }} />
                  </div>
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-medium text-ink-800">
                      {t.logoEmoji} {t.name}
                    </span>
                    {active && (
                      <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-leaf-500 text-[9px] text-white">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-leaf-700/70">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
