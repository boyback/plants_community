'use client';

import { RichTextView } from '@/components/richtext/RichTextView';
import { ImageGallery } from '@/components/ui/ImageGallery';
import styles from './PostContentView.module.scss';

export function PostContentView({
  json,
  html,
  text,
  images,
  livePhotoMap,
  className,
  size








}: {json?: unknown;html?: string;text?: string;images?: string[];livePhotoMap?: Record<string, string>;className?: string;size?: 'sm' | 'md' | 'lg';}) {
  const hasContent = Boolean(json || html || text);
  const hasImages = Boolean(images?.length);

  return (
    <div className={hasContent && hasImages ? styles.r_3e7ce58d : undefined}>
      {hasContent &&
      <RichTextView
        json={json}
        html={html}
        text={text}
        className={className}
        size={size}
        withImageGalleryControls />

      }
      {hasImages && <ImageGallery images={images!} livePhotoMap={livePhotoMap} />}
    </div>);

}
