"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import PhotoSwipe from "photoswipe";
import { registerPhotoSwipeGalleryUi } from "@/lib/photoswipe-ui";
import { cn } from "@/lib/utils";
import styles from './ImageGallery.module.scss';
import { cx } from '@/lib/style-utils';



interface ImageGalleryProps {
  images: string[];
  livePhotoMap?: Record<string, string>;
  equalCells?: boolean;
  labels?: Array<{label?: string;note?: string;} | undefined>;
  className?: string;
  imageClassName?: string;
}

interface ImageSize {
  width: number;
  height: number;
}

export function ImageGallery({ images, livePhotoMap, equalCells, labels, className, imageClassName }: ImageGalleryProps) {
  const [imageSizes, setImageSizes] = useState<Record<string, ImageSize>>({});
  const pswpRef = useRef<PhotoSwipe | null>(null);

  const handleImageLoad = useCallback(
    (src: string, event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        setImageSizes((prev) => ({
          ...prev,
          [src]: { width: img.naturalWidth, height: img.naturalHeight }
        }));
      }
    },
    []
  );

  const slides = useMemo(
    () =>
    images.map((src) => {
      const size = imageSizes[src] || { width: 1600, height: 1066 };
      return {
        src,
        msrc: src,
        thumbnail: src,
        width: size.width,
        height: size.height
      };
    }),
    [imageSizes, images]
  );

  const openPhotoSwipe = useCallback(
    (index: number) => {
      pswpRef.current?.destroy();
      pswpRef.current = new PhotoSwipe({
        dataSource: slides,
        index,
        showHideAnimationType: "fade",
        imageClickAction: false,
        tapAction: false,
        doubleTapAction: false,
        zoom: false,
        closeOnVerticalDrag: false
      } as any);
      registerPhotoSwipeGalleryUi(pswpRef.current);
      pswpRef.current.init();
    },
    [slides]
  );

  useEffect(() => {
    return () => {
      pswpRef.current?.destroy();
    };
  }, []);

  const n = images.length;
  let layoutClass = "";
  let cellClass = (_i: number) => styles.r_b59cd297;

  if (equalCells) {
    layoutClass = cx(styles.r_8e75e3db, styles.r_ab1b20c2, styles.r_5ac2a7ed);
    cellClass = () => styles.r_357868ab;
  } else if (n === 1) {
    layoutClass = styles.r_d7c83398;
    cellClass = () => styles.r_e5d2d82a;
  } else if (n === 2) {
    layoutClass = styles.r_8e75e3db;
  } else if (n === 3) {
    layoutClass = cx(styles.r_be2e831b, styles.r_65df3de9);
    cellClass = (i: number) => i === 0 ? cx(styles.r_40efc065, styles.r_67df127a) : "";
  } else {
    layoutClass = styles.r_8e75e3db;
  }

  if (!images.length) return null;

  return (
    <div className={cn(styles.r_d89972fe, className)}>
      <div className={cn(cx(styles.r_f3c543ad, styles.r_77a2a20e, styles.r_2cd02d11, styles.r_0c5e9137), layoutClass)}>
        {images.map((src, index) => {
          const isLive = Boolean(livePhotoMap?.[src]);
          const label = labels?.[index];

          return (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => openPhotoSwipe(index)}
              className={cn(cx(styles.r_d89972fe, styles.r_3bbc8c13, styles.r_2cd02d11, styles.r_7ebecbb6, styles.r_2eba0d65),

              cellClass(index),
              imageClassName
              )}
              aria-label={`预览图片 ${index + 1}`}>

              <Image
                src={src}
                alt={`图片 ${index + 1}`}
                fill
                sizes="(max-width:768px) 50vw, 400px"
                className={styles.r_7d85d0c2}
                unoptimized
                onLoad={(event) => handleImageLoad(src, event)} />

              {isLive &&
              <span className={cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_d83be576, styles.r_9a2db8f9, styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_db1c7bcb, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_ed9d3d83)}>
                  <span className={cx(styles.r_095acb27, styles.r_c696a089, styles.r_ac204c10, styles.r_5e10cdb8)} />
                  LIVE
                </span>
              }
              {(label?.label || label?.note) &&
              <span className={cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_3f6397bf, styles.r_189f036c, styles.r_79257b8c, styles.r_cf68a10c, styles.r_99b2f889, styles.r_0fe2b3da, styles.r_eb6e8b88, styles.r_e193b504)}>
                  {label.label && <span className={cx(styles.r_0214b4b3, styles.r_fc7473ca, styles.r_e83a7042, styles.r_72a4c7cd)}>{label.label}</span>}
                  {label.note && <span className={cx(styles.r_15e1b1f4, styles.r_0214b4b3, styles.r_d058ca6d, styles.r_0bd86ef1)}>{label.note}</span>}
                </span>
              }
            </button>);

        })}
      </div>
    </div>);

}