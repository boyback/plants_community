/**
 * 属页面拼图墙 Banner
 *
 * 把属下品种封面拼成 8 格(2 行 × 4 列)背景,中间叠属名/拉丁名/统计/CTA。
 * 不到 8 个品种时:用属本身的封面 / 父科封面填充。
 *
 * 视觉:
 *  - 整体高度由 aspect-[21/7] 控制,跟原 banner 一致
 *  - 拼图轻微暗化(70% 不透明度 + 黑渐变),避免文字看不清
 *  - 鼠标 hover 单格亮起,提示「可以点品种过去」
 */
import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

export interface MosaicCell {
  id: string;
  name: string;
  cover: string;
  href?: string; // 没 href 就是装饰填充格,不可点
}

export function GenusBannerMosaic({
  cells,
  fallbackCover,
  children,
}: {
  cells: MosaicCell[];
  /** 不够 8 格时的兜底图(用属/科封面) */
  fallbackCover: string;
  /** 中央叠加内容(标题/统计/按钮) */
  children: ReactNode;
}) {
  // 凑齐 8 格(响应式:m=4 格 1 行,md=8 格 2 行)
  const filled: MosaicCell[] = [];
  for (let i = 0; i < 8; i++) {
    filled.push(
      cells[i] ?? {
        id: `pad-${i}`,
        name: '',
        cover: fallbackCover,
      },
    );
  }
  // m 端只显示 4 格,md+ 显示 8 格
  const top = filled.slice(0, 4);
  const bottom = filled.slice(4, 8);

  return (
    <div className="relative aspect-[21/9] overflow-hidden md:aspect-[21/7]">
      {/* 拼图层 */}
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-1 gap-px bg-leaf-900/30 md:grid-cols-4 md:grid-rows-2">
        {top.map((c, i) => (
          <Cell key={`t-${c.id}-${i}`} cell={c} />
        ))}
        {/* m 端隐藏第二行 */}
        <div className="contents max-md:hidden">
          {bottom.map((c, i) => (
            <Cell key={`b-${c.id}-${i}`} cell={c} />
          ))}
        </div>
      </div>

      {/* 暗化层 */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/45 to-ink-900/30" />

      {/* 中央内容 */}
      <div className="relative flex h-full flex-col justify-end p-5 text-white md:p-6">
        {children}
      </div>
    </div>
  );
}

function Cell({ cell }: { cell: MosaicCell }) {
  const inner = (
    <div className="relative h-full w-full bg-leaf-50">
      {cell.cover && (
        <Image
          src={cell.cover}
          alt={cell.name}
          fill
          sizes="(max-width: 768px) 25vw, 12.5vw"
          className="object-cover"
          unoptimized
        />
      )}
    </div>
  );
  if (!cell.href) return inner;
  return (
    <Link
      href={cell.href}
      title={cell.name}
      className="group relative block overflow-hidden transition-transform hover:z-10 hover:scale-105"
    >
      {inner}
      {/* hover 时浮现品种名 */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink-900/90 to-transparent px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
        {cell.name}
      </span>
    </Link>
  );
}
