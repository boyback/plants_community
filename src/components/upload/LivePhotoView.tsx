'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  imageUrl: string;
  videoUrl: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
}

/**
 * iOS 风格的 Live Photo 查看器
 * - 默认显示静图,右上角小标签 "LIVE"
 * - PC:鼠标 hover 进入则播放视频(无声),离开停止
 * - 移动端:长按(touchstart 250ms)开始播放,touchend 停止
 * - 视频播放完循环回静图
 *
 * 视频静音 + 不带 controls,只是为了「联动效果」
 */
export function LivePhotoView({
  imageUrl,
  videoUrl,
  alt = '',
  className,
  imgClassName,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    setPlaying(true);
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => null);
    }
  };
  const stop = () => {
    setPlaying(false);
    videoRef.current?.pause();
  };

  // 视频自动播完后回到静图
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnded = () => setPlaying(false);
    v.addEventListener('ended', onEnded);
    return () => v.removeEventListener('ended', onEnded);
  }, []);

  return (
    <div
      className={cn('relative inline-block select-none', className)}
      onMouseEnter={start}
      onMouseLeave={stop}
      onTouchStart={() => {
        longPressTimer.current = setTimeout(start, 250);
      }}
      onTouchEnd={() => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        stop();
      }}
      onTouchCancel={stop}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        className={cn(
          'block h-full w-full object-cover transition-opacity duration-100',
          playing ? 'opacity-0' : 'opacity-100',
          imgClassName
        )}
      />
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        playsInline
        preload="metadata"
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-100',
          playing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />
      {/* LIVE 角标 */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white shadow"
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full bg-white',
            playing && 'animate-pulse'
          )}
        />
        LIVE
      </span>
    </div>
  );
}
