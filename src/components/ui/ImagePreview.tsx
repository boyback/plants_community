'use client';

import { Item } from 'react-photoswipe-gallery';
import { LivePhotoView } from '@/components/upload/LivePhotoView';
import 'photoswipe/dist/photoswipe.css';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  livePhotoSrc?: string;
  children: (props: { ref: React.RefCallback<HTMLButtonElement | null>; open: (e: React.MouseEvent) => void }) => React.ReactElement;
}

/**
 * 基于 react-photoswipe-gallery 的单张图片预览组件
 * 用于需要点击预览单个图片的场景
 */
export function ImagePreview({ src, alt = '', livePhotoSrc, children }: ImagePreviewProps) {
  return (
    <Item
      original={src}
      thumbnail={src}
      width={1200}
      height={800}
      content={
        livePhotoSrc ? (
          <LivePhotoView
            imageUrl={src}
            videoUrl={livePhotoSrc}
            alt={alt}
            className="h-full w-full"
            imgClassName="object-contain"
          />
        ) : undefined
      }
    >
      {children}
    </Item>
  );
}
