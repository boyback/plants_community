'use client';

import { useColorTheme } from '@/context/ColorThemeContext';
import { useHoverOpen } from '@/lib/hooks/useHoverOpen';
import { cn } from '@/lib/utils';

/**
 * 配色主题切换器(头部用)
 * - **悬浮触发**:鼠标 hover 触发按钮即展开,移开 150ms 后关闭
 * - 12 主题色板 + 明/暗模式切换
 * - 选中后立即生效,保存 localStorage
 */
export function ColorThemeSwitcher({ className }: { className?: string }) {
  const { theme, mode, meta, setTheme, toggleMode, themes } = useColorTheme();
  const { open, bind, close } = useHoverOpen();

  return (
    <div className={cn('relative inline-block', className)} {...bind}>
      <button
        type="button"
        title={`主题:${meta.name} · ${mode === 'dark' ? '暗黑' : '明亮'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-full text-base hover:bg-leaf-50"
      >
        {meta.logoEmoji}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-2xl border border-leaf-100 bg-white p-3 shadow-card dark:bg-leaf-50">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-ink-800">🎨 配色主题</div>
            {/* iOS 风格明暗 toggle:左 ☀️ 明亮,右 🌙 暗黑 */}
            <button
              type="button"
              role="switch"
              aria-checked={mode === 'dark'}
              onClick={toggleMode}
              title={mode === 'dark' ? '切换到明亮' : '切换到暗黑'}
              className={cn(
                'relative inline-flex h-6 w-12 items-center rounded-full transition-colors',
                mode === 'dark' ? 'bg-ink-900' : 'bg-leaf-200'
              )}
            >
              {/* 背景图标:始终显示在两端 */}
              <span className="pointer-events-none absolute left-1 text-[10px] leading-none">
                ☀️
              </span>
              <span className="pointer-events-none absolute right-1 text-[10px] leading-none">
                🌙
              </span>
              {/* 滑块 */}
              <span
                className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow ring-1 ring-black/5 transition-transform',
                  mode === 'dark' ? 'translate-x-[26px]' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          <div className="grid max-h-[420px] grid-cols-2 gap-1.5 overflow-y-auto pr-0.5">
            {themes.map((t) => {
              const active = t.key === theme;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setTheme(t.key);
                    close();
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
