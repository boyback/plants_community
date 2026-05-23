import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';
import { registerPhotoSwipeGalleryUi } from '@/lib/photoswipe-ui';

export function RichTextView({
  json,
  html,
  text,
  className,
  size = 'md',
  withImageGalleryControls = false,
}: {
  json?: unknown;
  html?: string;
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  withImageGalleryControls?: boolean;
}) {
  const sizeCls =
    size === 'sm'
      ? 'text-sm leading-6'
    : size === 'lg'
      ? 'text-base leading-8'
      : 'text-base leading-7';

  const containerRef = useRef<HTMLDivElement>(null);
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const openPhotoSwipe = useCallback(
    (index: number, images: Array<{ src: string; msrc: string; thumbnail: string; width: number; height: number }>) => {
      if (pswpRef.current) {
        pswpRef.current.destroy();
      }

      pswpRef.current = new PhotoSwipe({
        dataSource: images,
        index,
        showHideAnimationType: 'fade',
      } as any);
      if (withImageGalleryControls) {
        registerPhotoSwipeGalleryUi(pswpRef.current);
      }
      pswpRef.current.init();
    },
    [withImageGalleryControls],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const getImages = () => {
      return Array.from(container.querySelectorAll<HTMLImageElement>('img'))
        .map((img) => {
          const src = img.currentSrc || img.getAttribute('src') || '';
          if (!src) return null;
          return {
            src,
            msrc: src,
            thumbnail: src,
            width: img.naturalWidth || Number(img.getAttribute('width')) || 1600,
            height: img.naturalHeight || Number(img.getAttribute('height')) || 1066,
          };
        })
        .filter((item): item is { src: string; msrc: string; thumbnail: string; width: number; height: number } =>
          Boolean(item),
        );
    };

    const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
    imgs.forEach((img) => {
      img.style.cursor = 'pointer';
    });

    const handleClick = (event: MouseEvent) => {
      const img = (event.target as HTMLElement | null)?.closest('img');
      if (!img || !container.contains(img)) return;
      const currentImages = getImages();
      const src = (img as HTMLImageElement).currentSrc || img.getAttribute('src') || '';
      const index = currentImages.findIndex((item) => item.src === src);
      if (index >= 0) {
        event.preventDefault();
        event.stopPropagation();
        openPhotoSwipe(index, currentImages);
      }
    };

    container.addEventListener('click', handleClick);
    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [html, json, text, openPhotoSwipe]);

  useEffect(() => {
    return () => {
      pswpRef.current?.destroy();
    };
  }, []);

  let content = '';
  if (html) {
    content = html;
  } else if (text) {
    content = `<p>${escape(text).replace(/\n/g, '<br>')}</p>`;
  } else if (json) {
    content = '<p class="text-leaf-700/50">(暂无可显示内容)</p>';
  }

  if (!content) return null;
  return (
    <div
      ref={containerRef}
      className={cn('prose-article text-ink-800', sizeCls, className)}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
