'use client';

import { Item } from "react-photoswipe-gallery";
import { LivePhotoView } from '@/components/upload/LivePhotoView';
import styles from './ImagePreview.module.scss';
import { cx } from '@/lib/style-utils';



interface ImagePreviewProps {
  src: string;
  alt?: string;
  livePhotoSrc?: string;
  children: (props: {ref: React.RefCallback<HTMLButtonElement | null>;open: (e: React.MouseEvent) => void;}) => React.ReactElement;
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
      livePhotoSrc ?
      <LivePhotoView
        imageUrl={src}
        videoUrl={livePhotoSrc}
        alt={alt}
        className={cx(styles.r_668b21aa, styles.r_6da6a3c3)}
        imgClassName={styles.r_b1104f41} /> :

      undefined
      }>

      {children}
    </Item>);

}