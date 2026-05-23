'use client';

import { RichTextView } from '@/components/richtext/RichTextView';
import { ImageGallery } from '@/components/ui/ImageGallery';

export function PostContentView({
  json,
  html,
  text,
  images,
  livePhotoMap,
  className,
  size,
}: {
  json?: unknown;
  html?: string;
  text?: string;
  images?: string[];
  livePhotoMap?: Record<string, string>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const hasContent = Boolean(json || html || text);
  const hasImages = Boolean(images?.length);

  return (
    <div className={hasContent && hasImages ? 'space-y-4' : undefined}>
      {hasContent && (
        <RichTextView
          json={json}
          html={html}
          text={text}
          className={className}
          size={size}
          withImageGalleryControls
        />
      )}
      {hasImages && <ImageGallery images={images!} livePhotoMap={livePhotoMap} />}
    </div>
  );
}
