'use client';

/**
 * APP 引流卡
 * 布局:
 *   ┌──────────┬───────────────────────────────┐
 *   │          │  社区 APP 标题                │
 *   │  二维码   ├───────────────────────────────┤
 *   │ (含 logo)│  描述文案                     │
 *   └──────────┴───────────────────────────────┘
 *   [App Store]  [华为应用市场]  [Google Play]
 *
 * 注:
 *   - 二维码图片放 public/qrcode-app.svg(目前是占位 SVG)
 *   - 各应用市场链接占位,以后真上线后替换
 */

const STORES: { label: string; href: string; emoji: string }[] = [
  // 链接占位:替换为你各家上架后的真实地址
  { label: 'App Store', href: '#', emoji: '🍎' },
  { label: '华为应用市场', href: '#', emoji: '📱' },
  { label: 'Google Play', href: '#', emoji: '🤖' },
];

export function AppDownloadCard() {
  return (
    <div className="card p-4">
      <div className="flex gap-3">
        {/* 左:二维码(64x64,带社区 logo 中心叠加) */}
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-leaf-50/60 p-1.5">
          <div className="relative h-full w-full">
            {/* 占位 QR 图,实际部署时替换 public/qrcode-app.svg */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/qrcode-app.svg"
              alt="APP 下载二维码"
              className="h-full w-full object-contain"
              onError={(e) => {
                // 兜底显示绿底 emoji
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* 右:标题 + 描述 */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-sm font-semibold text-ink-800">
            🌱 肉友社 APP
          </div>
          <div className="text-[11px] leading-5 text-leaf-700/70">
            扫码下载,随时随地记录你的多肉时光 · 离线相册 · 浇水提醒 · 比网页更顺手
          </div>
        </div>
      </div>

      {/* 应用市场按钮 */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {STORES.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="grid place-items-center rounded-lg border border-leaf-100 bg-white px-1 py-1.5 text-[10px] text-leaf-700 transition-colors hover:border-leaf-300 hover:bg-leaf-50/60"
            title={s.label}
          >
            <span className="mb-0.5 text-base leading-none">{s.emoji}</span>
            <span className="truncate">{s.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
