import { THEME_REGISTRY, activeThemesAt } from '@/lib/themes';

export const dynamic = 'force-dynamic';

export default async function AdminThemesPage() {
  const now = new Date();
  const activeNow = activeThemesAt(now);
  const activeSet = new Set(activeNow.map((t) => t.slug));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🎨 主题调度</h1>
        <p className="mt-1 text-xs text-ink-600">
          当前时间 {now.toLocaleString('zh-CN')} · 共 {THEME_REGISTRY.length} 个主题,{activeNow.length} 个活跃
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-800">
        💡 主题目前基于代码里的日期窗口与农历表查询自动启用;此页仅为查看,如需立即启用某个节日主题,
        请编辑 <code className="rounded bg-white px-1 py-0.5">src/lib/themes.ts</code> 的窗口配置。
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {THEME_REGISTRY.map((t) => {
          const active = activeSet.has(t.slug);
          return (
            <div
              key={t.slug}
              className={
                'rounded-xl border p-4 text-xs ' +
                (active
                  ? 'border-leaf-500 bg-leaf-50 shadow'
                  : 'border-ink-100 bg-white')
              }
              style={
                active
                  ? {
                      background: `linear-gradient(135deg, ${t.decoration.accentFrom}15, ${t.decoration.accentTo}15)`,
                    }
                  : undefined
              }
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-2xl">{t.decoration.logoBadge}</span>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-[10px] text-ink-500 font-mono">{t.slug}</div>
                </div>
                {active && (
                  <span className="ml-auto rounded-full bg-leaf-500 px-2 py-0.5 text-[10px] font-medium text-white">
                    活跃
                  </span>
                )}
              </div>
              <div className="text-[10px] text-ink-500 uppercase tracking-wider">
                {t.board}
              </div>
              <div className="mt-2 space-y-1">
                {t.windows.map((w, i) => (
                  <div
                    key={i}
                    className="rounded bg-white/80 px-2 py-1 font-mono text-[10px] text-ink-600"
                  >
                    {String(w.startMonth).padStart(2, '0')}.{String(w.startDay).padStart(2, '0')}
                    {' → '}
                    {String(w.endMonth).padStart(2, '0')}.{String(w.endDay).padStart(2, '0')}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1 text-[14px]">
                <span title="Logo badge">{t.decoration.logoBadge}</span>
                <span title="Avatar badge">{t.decoration.avatarBadge}</span>
                <span title="Particle">{t.decoration.particleEmoji}</span>
                <span className="ml-auto text-[10px] text-ink-400">
                  particles={t.decoration.particleCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
