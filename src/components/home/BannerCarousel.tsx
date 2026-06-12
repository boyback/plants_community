'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BannerItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import styles from './BannerCarousel.module.scss';
import { cx } from '@/lib/style-utils';



const DEFAULT_INTERVAL_MS = 3000;
const TRANSITION_MS = 500;

/**
 * 无缝循环 Banner。
 *
 * 实现思路:
 *   渲染 [last, ...items, first] 一共 N+2 张,初始 idx=1。
 *   - 自动 / 点击下一张:idx++,超过 N 时 jump 到 1(无 transition)
 *   - 点击上一张:idx--,小于 0 时 jump 到 N(无 transition)
 *   每张可以单独配置 durationMs(0 → 全站默认 3000ms)
 *
 * 鼠标 hover / 触摸时暂停。
 */
export function BannerCarousel({
  items,
  defaultIntervalMs = DEFAULT_INTERVAL_MS



}: {items: BannerItem[];defaultIntervalMs?: number;}) {
  const [idx, setIdx] = useState(1); // 初始指向真实第一张(items[0])
  const [trans, setTrans] = useState(true);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const N = items.length;

  // 真实索引(用户视觉看到的当前是第几张):0 ~ N-1
  const realIdx = ((idx - 1) % N + N) % N;

  // 渲染序列:[items[N-1], items[0], items[1], ..., items[N-1], items[0]]
  const slides: BannerItem[] = N === 0 ? [] : [items[N - 1], ...items, items[0]];

  const goNext = useCallback(() => {
    setTrans(true);
    setIdx((i) => i + 1);
  }, []);

  const goPrev = useCallback(() => {
    setTrans(true);
    setIdx((i) => i - 1);
  }, []);

  const goTo = useCallback((target: number) => {
    setTrans(true);
    setIdx(target + 1);
  }, []);

  // 自动播放
  useEffect(() => {
    if (paused || N <= 1) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const ms = items[realIdx]?.durationMs && items[realIdx].durationMs! > 0 ?
    items[realIdx].durationMs! :
    defaultIntervalMs;
    timerRef.current = setTimeout(goNext, ms);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idx, paused, N, items, realIdx, defaultIntervalMs, goNext]);

  // 边界 jump:transition 结束后,如果 idx 在克隆图,瞬移到对应真实图
  useEffect(() => {
    if (N === 0) return;
    if (idx === 0 || idx === N + 1) {
      const t = setTimeout(() => {
        setTrans(false);
        // 0(克隆的最后一张)→ N
        // N+1(克隆的第一张)→ 1
        setIdx(idx === 0 ? N : 1);
      }, TRANSITION_MS);
      return () => clearTimeout(t);
    }
  }, [idx, N]);

  if (N === 0) return null;
  if (N === 1) {
    // 单张直接渲染,不做轮播
    const it = items[0];
    return (
      <div className={cx(styles.r_2cd02d11, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8)}>
        <BannerSlide item={it} />
      </div>);

  }

  return (
    <div
      className={cx(styles.r_d89972fe, styles.r_2cd02d11, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_64292b1c)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 1500)}>

      <div
        ref={trackRef}
        className={styles.r_60fbb771}
        style={{
          width: `${slides.length * 100}%`,
          transform: `translate3d(${-idx * 100 / slides.length}%, 0, 0)`,
          transition: trans ? `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none'
        }}>

        {slides.map((it, i) =>
        <div key={`${it.id}-${i}`} style={{ width: `${100 / slides.length}%` }} className={styles.r_012fbd12}>
            <BannerSlide item={it} priority={i === 1} />
          </div>
        )}
      </div>

      {/* 左右切换箭头(hover 时显示)*/}
      <button
        type="button"
        onClick={goPrev}
        aria-label="上一张"
        className={cx(styles.r_da4dbfbc, styles.r_d83be576, styles.r_d694ba66, styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_36b381be, styles.r_67d66567, styles.r_ac204c10, styles.r_b0d7388d, styles.r_72a4c7cd, styles.r_7065497e, styles.r_0b2e8c28, styles.r_67d6184a, styles.r_c9960c01, styles.r_181f3d6c)}>

        ‹
      </button>
      <button
        type="button"
        onClick={goNext}
        aria-label="下一张"
        className={cx(styles.r_da4dbfbc, styles.r_7b2d6393, styles.r_d694ba66, styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_36b381be, styles.r_67d66567, styles.r_ac204c10, styles.r_b0d7388d, styles.r_72a4c7cd, styles.r_7065497e, styles.r_0b2e8c28, styles.r_67d6184a, styles.r_c9960c01, styles.r_181f3d6c)}>

        ›
      </button>

      {/* 圆点指示器 */}
      <div className={cx(styles.r_da4dbfbc, styles.r_49af11eb, styles.r_e632769a, styles.r_60fbb771, styles.r_efaa0701, styles.r_58284b4e)}>
        {items.map((_, i) =>
        <button
          key={i}
          type="button"
          onClick={() => goTo(i)}
          className={cn(cx(styles.r_095acb27, styles.r_ac204c10, styles.r_0fe7d7d8),

          i === realIdx ? cx(styles.r_7ec10f86, styles.r_5e10cdb8) : cx(styles.r_c696a089, styles.r_d2fa6cb5)
          )}
          aria-label={`切换到第 ${i + 1} 张`} />

        )}
      </div>
    </div>);

}

function BannerSlide({ item, priority }: {item: BannerItem;priority?: boolean;}) {
  return (
    <Link href={item.link} className={cx(styles.r_d89972fe, styles.r_0214b4b3, styles.r_188a6e22, styles.r_d65e7392)}>
      <Image
        src={item.image}
        alt={item.title}
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, 800px"
        className={styles.r_7d85d0c2}
        unoptimized />

      <div className={cn(cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_6ae7db2c, styles.r_0fe2b3da), item.tint)} />
      <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_60fbb771, styles.r_8dddea07, styles.r_86843cf1, styles.r_0478c89a, styles.r_4221753f, styles.r_72a4c7cd)}>
        <span className={cx(styles.r_a77ed4d9, styles.r_52083e7d, styles.r_92e7450a, styles.r_3960ffc2, styles.r_ac204c10, styles.r_2cf6fd42, styles.r_0b91436d, styles.r_465609a2, styles.r_d058ca6d, styles.r_0b2e8c28)}>
          精选活动
        </span>
        <h2 className={cx(styles.r_d5c9b000, styles.r_69450ef1, styles.r_c58992ca)}>{item.title}</h2>
      </div>
    </Link>);

}