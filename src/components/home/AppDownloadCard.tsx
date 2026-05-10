'use client';

/**
 * APP 引流卡
 *
 * 布局:
 *   ┌──────────┬───────────────────────────────┐
 *   │          │  社区 APP 标题                │
 *   │  二维码   ├───────────────────────────────┤
 *   │          │  描述文案                     │
 *   └──────────┴───────────────────────────────┘
 *   [用户协议]   [隐私政策]
 *
 * 二维码:
 *   - 用 SVG 模拟真实二维码外观(3 个定位方块 + 伪随机模块矩阵 + 中心 logo)
 *   - 这只是视觉占位,真上线后用 qrcode 库生成对应下载链接
 */

import Link from 'next/link';

/**
 * 生成稳定的 25x25 模块矩阵(确定性,SSR/CSR 一致)
 * - 3 个定位方块(左上、右上、左下,各 7x7)
 * - 中心留 7x7 空白给 logo
 * - 其余位置用 hash 决定填不填
 */
function buildModules(size = 25): boolean[][] {
  const m: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // 3 个定位方块(7x7 标准 finder)
  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const onRing = r === 0 || r === 6 || c === 0 || c === 6;
        const onCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[r0 + r][c0 + c] = onRing || onCenter;
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 中心 logo 区域(5x5 留白)
  const cx = Math.floor(size / 2);
  const logoR = 2;

  // 伪随机填充其它位置
  const rand = (r: number, c: number) => {
    let h = (r * 73856093) ^ (c * 19349663) ^ 0xa3e1;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) % 100;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // 跳过 finder 区(含 1 模块边距 = 8x8)
      if (r < 8 && c < 8) continue;
      if (r < 8 && c >= size - 8) continue;
      if (r >= size - 8 && c < 8) continue;
      // 跳过 logo 区
      if (Math.abs(r - cx) <= logoR && Math.abs(c - cx) <= logoR) continue;
      // 边缘留 1 模块白边
      if (r === 0 || r === size - 1 || c === 0 || c === size - 1) continue;

      m[r][c] = rand(r, c) < 48; // ~48% 黑色覆盖,接近真实 QR 的视觉密度
    }
  }
  return m;
}

const MODULES = buildModules(25);
const MODULE_PX = 5; // 每模块 5px → 整体 125x125
const QR_SIZE = MODULES.length * MODULE_PX;

export function AppDownloadCard() {
  return (
    <div className="card p-4">
      <div className="flex gap-3">
        {/* 左:二维码 */}
        <div className="grid h-[120px] w-[120px] shrink-0 place-items-center rounded-lg bg-white p-1 ring-1 ring-leaf-100/60">
          <svg
            viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
            className="h-full w-full"
            shapeRendering="crispEdges"
            aria-label="肉友社 APP 下载二维码"
          >
            {/* 白底 */}
            <rect width={QR_SIZE} height={QR_SIZE} fill="#ffffff" />

            {/* 模块 */}
            {MODULES.flatMap((row, r) =>
              row.map((on, c) =>
                on ? (
                  <rect
                    key={`${r}-${c}`}
                    x={c * MODULE_PX}
                    y={r * MODULE_PX}
                    width={MODULE_PX}
                    height={MODULE_PX}
                    fill="#0f172a"
                  />
                ) : null,
              ),
            )}

            {/* 中心 logo 圆底 + 叶子 emoji 替身 */}
            <g transform={`translate(${QR_SIZE / 2}, ${QR_SIZE / 2})`}>
              <rect
                x={-14}
                y={-14}
                width={28}
                height={28}
                rx={6}
                fill="#ffffff"
                stroke="#16a34a"
                strokeWidth={1.5}
              />
              {/* 简化叶子图标 */}
              <path
                d="M -7 4 C -7 -6, 3 -10, 8 -7 C 8 3, -2 9, -7 4 Z"
                fill="#16a34a"
              />
              <path
                d="M -7 4 L 6 -8"
                stroke="#0f5132"
                strokeWidth={0.8}
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        {/* 右:标题 + 描述 */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-sm font-semibold text-ink-800">🌱 肉友社 APP</div>
          <div className="text-[11px] leading-5 text-leaf-700/70">
            扫码下载,随时记录你的多肉时光
            <br />
            离线相册 · 浇水提醒 · 比网页更顺手
          </div>
        </div>
      </div>

      {/* 底部:用户协议 / 隐私政策(纯文字链) */}
      <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-leaf-700/70">
        <Link href="/terms" className="hover:text-leaf-700 hover:underline">
          用户协议
        </Link>
        <span className="text-leaf-700/30">·</span>
        <Link href="/privacy" className="hover:text-leaf-700 hover:underline">
          隐私政策
        </Link>
      </div>
    </div>
  );
}
