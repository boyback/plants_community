"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Gallery, Item } from "react-photoswipe-gallery";
import "photoswipe/dist/photoswipe.css";
import type { DataSourceArray } from "photoswipe";
import { cn } from "@/lib/utils";
import { Post } from "@/lib/types";

interface ImageGalleryProps {
  images: string[];
  livePhotoMap?: Record<string, string>;
}

interface ImageSize {
  width: number;
  height: number;
}

/**
 * 基于 react-photoswipe-gallery 的图片画廊组件
 * - 动态计算图片尺寸用于精确的缩放动画
 * - 支持下载、Caption 和底部缩略图条
 * - 支持侧边栏模式（用于帖子详情页）
 */
export function ImageGallery({
  images,
  livePhotoMap,
}: ImageGalleryProps) {
  const [imageSizes, setImageSizes] = useState<Record<string, ImageSize>>({});

  // 处理图片加载，获取实际尺寸
  const handleImageLoad = useCallback(
    (src: string, e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        setImageSizes((prev) => ({
          ...prev,
          [src]: { width: img.naturalWidth, height: img.naturalHeight },
        }));
      }
    },
    [],
  );

  // 布局策略
  const n = images.length;
  const display = images.slice(0, n >= 5 ? 4 : n);
  const remain = n - display.length;

  let layoutClass = "";
  let cellClass = (_i: number) => "aspect-square";

  if (n === 1) {
    layoutClass = "grid-cols-1";
    cellClass = () => "aspect-[16/10]";
  } else if (n === 2) {
    layoutClass = "grid-cols-2";
    cellClass = () => "aspect-square";
  } else if (n === 3) {
    layoutClass = "grid-cols-3 grid-rows-2";
    cellClass = (i: number) => (i === 0 ? "col-span-2 row-span-2" : "");
  } else {
    layoutClass = "grid-cols-2";
    cellClass = () => "aspect-square";
  }

  // 底部缩略图条 UI 元素
  const thumbnailUiElement = {
    name: "thumbnails-indicator",
    order: 9,
    isButton: false,
    appendTo: "wrapper" as const,
    onInit: (el: HTMLElement, pswpInstance: any) => {
      let prevIndex = -1;
      const thumbnails: HTMLElement[] = [];

      el.style.position = "absolute";
      el.style.bottom = "20px";
      el.style.left = "10px";
      el.style.right = "0";
      el.style.display = "grid";
      el.style.gap = "10px";
      el.style.gridTemplateColumns = "repeat(auto-fit, 40px)";
      el.style.gridTemplateRows = "repeat(auto-fit, 40px)";
      el.style.justifyContent = "center";

      const dataSource = pswpInstance.options.dataSource as DataSourceArray;

      for (let i = 0; i < dataSource.length; i++) {
        const slideData = dataSource[i];

        const thumbnail = document.createElement("div");
        thumbnail.style.transition =
          "transform 0.15s ease-in, opacity 0.15s ease-in";
        thumbnail.style.opacity = "0.6";
        thumbnail.style.cursor = "pointer";
        thumbnail.style.borderRadius = "4px";
        thumbnail.style.overflow = "hidden";
        thumbnail.onclick = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const thumbnailEl =
            target.tagName === "IMG" ? target.parentElement : target;
          if (thumbnailEl) {
            pswpInstance.goTo(thumbnails.indexOf(thumbnailEl));
          }
        };

        const thumbnailImage = document.createElement("img");
        const thumbSrc = slideData.thumbnail || slideData.msrc || "";
        thumbnailImage.setAttribute("src", thumbSrc);
        thumbnailImage.style.width = "100%";
        thumbnailImage.style.height = "100%";
        thumbnailImage.style.objectFit = "cover";

        thumbnail.appendChild(thumbnailImage);
        el.appendChild(thumbnail);
        thumbnails.push(thumbnail);
      }

      pswpInstance.on("change", () => {
        if (prevIndex >= 0 && thumbnails[prevIndex]) {
          const prevThumbnail = thumbnails[prevIndex];
          prevThumbnail.style.opacity = "0.6";
          prevThumbnail.style.transform = "scale(1)";
        }

        if (thumbnails[pswpInstance.currIndex]) {
          const currentThumbnail = thumbnails[pswpInstance.currIndex];
          currentThumbnail.style.opacity = "1";
          currentThumbnail.style.transform = "scale(1.1)";
        }

        prevIndex = pswpInstance.currIndex;
      });
    },
  };

  return (
    <div className='relative'>
      <Gallery
        withDownloadButton
        uiElements={[thumbnailUiElement]}
      >
        <div
          className={cn("grid gap-2 overflow-hidden rounded-none", layoutClass)}
        >
          {display.map((src, i) => {
            const showRemain = i === display.length - 1 && remain > 0;
            const isLive = !!livePhotoMap?.[src];
            const size = imageSizes[src] || { width: 1600, height: 1066 };

            return (
              <Item
                key={src}
                original={src}
                thumbnail={src}
                width={size.width}
                height={size.height}
                alt={`图片 ${i + 1}`}
              >
                {({ ref, open }) => (
                  <div
                    ref={ref as React.RefCallback<HTMLDivElement>}
                    onClick={open}
                    className={cn(
                      "relative overflow-hidden bg-leaf-50 cursor-pointer",
                      cellClass(i),
                    )}
                  >
                    <Image
                      src={src}
                      alt={`图片 ${i + 1}`}
                      fill
                      sizes='(max-width:768px) 50vw, 400px'
                      className='object-cover transition-transform hover:scale-105'
                      unoptimized
                      onLoad={(e) => handleImageLoad(src, e)}
                    />
                    {isLive && (
                      <span className='pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white shadow'>
                        <span className='h-1.5 w-1.5 rounded-full bg-white' />
                        LIVE
                      </span>
                    )}
                    {showRemain && (
                      <div className='absolute inset-0 grid place-items-center bg-ink-900/50 text-2xl font-bold text-white'>
                        +{remain}
                      </div>
                    )}
                  </div>
                )}
              </Item>
            );
          })}
        </div>
      </Gallery>
    </div>
  );
}
