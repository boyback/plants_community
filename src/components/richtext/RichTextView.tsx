import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';

interface ImageSize {
  width: number;
  height: number;
}

export function RichTextView({
  json,
  html,
  text,
  className,
  size = 'md',
}: {
  json?: unknown;
  html?: string;
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeCls =
    size === 'sm'
      ? 'text-sm leading-6'
      : size === 'lg'
      ? 'text-base leading-8'
      : 'text-[15px] leading-7';

  const containerRef = useRef<HTMLDivElement>(null);
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const openPhotoSwipe = useCallback((index: number, images: { src: string }[]) => {
    if (pswpRef.current) {
      pswpRef.current.destroy();
    }

    pswpRef.current = new PhotoSwipe({
      dataSource: images,
      index,
      showHideAnimationType: 'fade',
    } as any);
    pswpRef.current.init();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const imgs = container.querySelectorAll('img');
    const images: { src: string }[] = [];

    imgs.forEach((img, i) => {
      const src = img.getAttribute('src');
      if (src) {
        images.push({ src });
        // if (img.naturalWidth && img.naturalHeight) {
        //   setImageSizes((prev) => ({
        //     ...prev,
        //     [src]: { width: img.naturalWidth, height: img.naturalHeight },
        //   }));
        // }
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => openPhotoSwipe(i, images));
      }
    });
  }, [html, openPhotoSwipe]);

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