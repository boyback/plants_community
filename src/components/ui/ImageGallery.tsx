"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import PhotoSwipe from "photoswipe";
import "photoswipe/style.css";
import { registerPhotoSwipeGalleryUi } from "@/lib/photoswipe-ui";
import { cn } from "@/lib/utils";

interface ImageGalleryProps {
  images: string[];
  livePhotoMap?: Record<string, string>;
}

interface ImageSize {
  width: number;
  height: number;
}

export function ImageGallery({ images, livePhotoMap }: ImageGalleryProps) {
  const [imageSizes, setImageSizes] = useState<Record<string, ImageSize>>({});
  const pswpRef = useRef<PhotoSwipe | null>(null);

  const handleImageLoad = useCallback(
    (src: string, event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        setImageSizes((prev) => ({
          ...prev,
          [src]: { width: img.naturalWidth, height: img.naturalHeight },
        }));
      }
    },
    [],
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
          height: size.height,
        };
      }),
    [imageSizes, images],
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
        closeOnVerticalDrag: false,
      } as any);
      registerPhotoSwipeGalleryUi(pswpRef.current);
      pswpRef.current.init();
    },
    [slides],
  );

  useEffect(() => {
    return () => {
      pswpRef.current?.destroy();
    };
  }, []);

  const n = images.length;
  let layoutClass = "";
  let cellClass = (_i: number) => "aspect-square";

  if (n === 1) {
    layoutClass = "grid-cols-1";
    cellClass = () => "aspect-[16/10]";
  } else if (n === 2) {
    layoutClass = "grid-cols-2";
  } else if (n === 3) {
    layoutClass = "grid-cols-3 grid-rows-2";
    cellClass = (i: number) => (i === 0 ? "col-span-2 row-span-2" : "");
  } else {
    layoutClass = "grid-cols-2";
  }

  if (!images.length) return null;

  return (
    <div className="relative">
      <div className={cn("grid gap-2 overflow-hidden rounded-none", layoutClass)}>
        {images.map((src, index) => {
          const isLive = Boolean(livePhotoMap?.[src]);

          return (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => openPhotoSwipe(index)}
              className={cn(
                "relative cursor-pointer overflow-hidden bg-leaf-50 text-left",
                cellClass(index),
              )}
              aria-label={`预览图片 ${index + 1}`}
            >
              <Image
                src={src}
                alt={`图片 ${index + 1}`}
                fill
                sizes="(max-width:768px) 50vw, 400px"
                className="object-cover transition-transform hover:scale-105"
                unoptimized
                onLoad={(event) => handleImageLoad(src, event)}
              />
              {isLive && (
                <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  LIVE
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
