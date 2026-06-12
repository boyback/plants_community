/**
 * 属页面拼图墙 Banner
 *
 * 把属下品种封面拼成 8 格(2 行 × 4 列)背景,中间叠属名/拉丁名/统计/CTA。
 * 不到 8 个品种时:用属本身的封面 / 父科封面填充。
 *
 * 视觉:
 *  - 整体高度按 21:7 比例控制,跟原 banner 一致
 *  - 拼图轻微暗化(70% 不透明度 + 黑渐变),避免文字看不清
 *  - 鼠标 hover 单格亮起,提示「可以点品种过去」
 */
import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import styles from './GenusBannerMosaic.module.scss';
import { cx } from '@/lib/style-utils';



export interface MosaicCell {
  id: string;
  name: string;
  cover: string;
  href?: string; // 没 href 就是装饰填充格,不可点
}

export function GenusBannerMosaic({
  cells,
  fallbackCover,
  children






}: {cells: MosaicCell[]; /** 不够 8 格时的兜底图(用属/科封面) */fallbackCover: string; /** 中央叠加内容(标题/统计/按钮) */children: ReactNode;}) {
  // 凑齐 8 格(响应式:m=4 格 1 行,md=8 格 2 行)
  const filled: MosaicCell[] = [];
  for (let i = 0; i < 8; i++) {
    filled.push(
      cells[i] ?? {
        id: `pad-${i}`,
        name: '',
        cover: fallbackCover
      }
    );
  }
  // m 端只显示 4 格,md+ 显示 8 格
  const top = filled.slice(0, 4);
  const bottom = filled.slice(4, 8);

  return (
    <div className={cx(styles.r_d89972fe, styles.r_9d19e6bb, styles.r_2cd02d11, styles.r_d65e7392)}>
      {/* 拼图层 */}
      <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_f3c543ad, styles.r_32aac21b, styles.r_480b4a0f, styles.r_ceb7ac66, styles.r_7cd18734, styles.r_d59f314f, styles.r_c23882bf)}>
        {top.map((c, i) =>
        <Cell key={`t-${c.id}-${i}`} cell={c} />
        )}
        {/* m 端隐藏第二行 */}
        <div className={cx(styles.r_4a756ca0, styles.r_10bad0e0)}>
          {bottom.map((c, i) =>
          <Cell key={`b-${c.id}-${i}`} cell={c} />
          )}
        </div>
      </div>

      {/* 暗化层 */}
      <div className={cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_7b7df044, styles.r_79257b8c, styles.r_0bb032b9, styles.r_de71ed4a, styles.r_6c0a2adc)} />

      {/* 中央内容 */}
      <div className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_668b21aa, styles.r_8dddea07, styles.r_77c08e01, styles.r_c07e54fd, styles.r_72a4c7cd, styles.r_97effa3f)}>
        {children}
      </div>
    </div>);

}

function Cell({ cell }: {cell: MosaicCell;}) {
  const inner =
  <div className={cx(styles.r_d89972fe, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7ebecbb6)}>
      {cell.cover &&
    <Image
      src={cell.cover}
      alt={cell.name}
      fill
      sizes="(max-width: 768px) 25vw, 12.5vw"
      className={styles.r_7d85d0c2}
      unoptimized />

    }
    </div>;

  if (!cell.href) return inner;
  return (
    <Link
      href={cell.href}
      title={cell.name}
      className={cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_0214b4b3, styles.r_2cd02d11, styles.r_eadef238, styles.r_d5254d26, styles.r_d6983992)}>

      {inner}
      {/* hover 时浮现品种名 */}
      <span className={cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_3f6397bf, styles.r_189f036c, styles.r_f283ea9b, styles.r_79257b8c, styles.r_8690fca4, styles.r_0fe2b3da, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_72a4c7cd, styles.r_7065497e, styles.r_67d6184a, styles.r_181f3d6c)}>
        {cell.name}
      </span>
    </Link>);

}