'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BannerItem } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  defaultIntervalMs = DEFAULT_INTERVAL_MS,
}: {
  items: BannerItem[];
  defaultIntervalMs?: number;
}) {
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
    const ms = items[realIdx]?.durationMs && items[realIdx].durationMs! > 0
      ? items[realIdx].durationMs!
      : defaultIntervalMs;
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
      <div className="overflow-hidden rounded-none border border-leaf-100 bg-white">
        <BannerSlide item={it} />
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-none border border-leaf-100 bg-white group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 1500)}
    >
      <div
        ref={trackRef}
        className="flex"
        style={{
          width: `${slides.length * 100}%`,
          transform: `translate3d(${(-idx * 100) / slides.length}%, 0, 0)`,
          transition: trans ? `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none',
        }}
      >
        {slides.map((it, i) => (
          <div key={`${it.id}-${i}`} style={{ width: `${100 / slides.length}%` }} className="shrink-0">
            <BannerSlide item={it} priority={i === 1} />
          </div>
        ))}
      </div>

      {/* 左右切换箭头(hover 时显示)*/}
      <button
        type="button"
        onClick={goPrev}
        aria-label="上一张"
        className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/50 group-hover:opacity-100"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={goNext}
        aria-label="下一张"
        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur transition-opacity hover:bg-black/50 group-hover:opacity-100"
      >
        ›
      </button>

      {/* 圆点指示器 */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === realIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/60'
            )}
            aria-label={`切换到第 ${i + 1} 张`}
          />
        ))}
      </div>
    </div>
  );
}

function BannerSlide({ item, priority }: { item: BannerItem; priority?: boolean }) {
  return (
    <Link href={item.link} className="relative block aspect-[21/8] md:aspect-[21/7]">
      <Image
        src={item.image}
        alt={item.title}
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, 800px"
        className="object-cover"
        unoptimized
      />
      <div className={cn('absolute inset-0 bg-gradient-to-r to-transparent', item.tint)} />
      <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-10 text-white">
        <span className="mb-2 inline-flex w-fit items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] backdrop-blur">
          精选活动
        </span>
        <h2 className="text-xl font-bold md:text-3xl">{item.title}</h2>
        <p className="mt-1.5 max-w-md text-xs opacity-90 md:text-sm">{item.subtitle}</p>
      </div>
    </Link>
  );
}
