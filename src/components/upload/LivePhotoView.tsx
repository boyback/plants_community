'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './LivePhotoView.module.scss';
import { cx } from '@/lib/style-utils';



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
  imgClassName
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
      className={cn(cx(styles.r_d89972fe, styles.r_bb0c4bfc, styles.r_7f691228), className)}
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
      onTouchCancel={stop}>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        className={cn(cx(styles.r_0214b4b3, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2, styles.r_67d6184a, styles.r_df41c6f1),

        playing ? styles.r_7065497e : styles.r_3972e98d,
        imgClassName
        )} />

      <video
        ref={videoRef}
        src={videoUrl}
        muted
        playsInline
        preload="metadata"
        className={cn(cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2, styles.r_67d6184a, styles.r_df41c6f1),

        playing ? styles.r_3972e98d : cx(styles.r_7065497e, styles.r_a4326536)
        )} />

      {/* LIVE 角标 */}
      <span
        aria-hidden
        className={cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_d83be576, styles.r_9a2db8f9, styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_db1c7bcb, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_ed9d3d83)}>

        <span
          className={cn(cx(styles.r_095acb27, styles.r_c696a089, styles.r_ac204c10, styles.r_5e10cdb8),

          playing && styles.r_d59b9794
          )} />

        LIVE
      </span>
    </div>);

}