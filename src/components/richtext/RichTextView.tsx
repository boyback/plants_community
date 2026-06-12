import { useCallback, useEffect, useRef } from 'react';
import { generateHTML } from '@tiptap/html';
import { cn } from '@/lib/utils';
import PhotoSwipe from 'photoswipe';
import { registerPhotoSwipeGalleryUi } from "@/lib/photoswipe-ui";
import { getServerExtensions } from "@/lib/tiptap-extensions";
import styles from './RichTextView.module.scss';
import { cx } from '@/lib/style-utils';



export function RichTextView({
  json,
  html,
  text,
  className,
  size = 'md',
  withImageGalleryControls = false







}: {json?: unknown;html?: string;text?: string;className?: string;size?: 'sm' | 'md' | 'lg';withImageGalleryControls?: boolean;}) {
  const sizeCls =
  size === 'sm' ? cx(styles.r_fc7473ca, styles.r_18550d59) :

  size === 'lg' ? cx(styles.r_4ee73492, styles.r_c6b7e58a) : cx(styles.r_4ee73492, styles.r_7eff2faf);



  const containerRef = useRef<HTMLDivElement>(null);
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const openPhotoSwipe = useCallback(
    (index: number, images: Array<{src: string;msrc: string;thumbnail: string;width: number;height: number;}>) => {
      if (pswpRef.current) {
        pswpRef.current.destroy();
      }

      pswpRef.current = new PhotoSwipe({
        dataSource: images,
        index,
        showHideAnimationType: 'fade',
        imageClickAction: false,
        tapAction: false,
        doubleTapAction: false,
        zoom: false,
        closeOnVerticalDrag: false
      } as any);
      if (withImageGalleryControls) {
        registerPhotoSwipeGalleryUi(pswpRef.current);
      }
      pswpRef.current.init();
    },
    [withImageGalleryControls]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const getImages = () => {
      return Array.from(container.querySelectorAll<HTMLImageElement>('img')).
      map((img) => {
        const src = img.currentSrc || img.getAttribute('src') || '';
        if (!src) return null;
        return {
          src,
          msrc: src,
          thumbnail: src,
          width: img.naturalWidth || Number(img.getAttribute('width')) || 1600,
          height: img.naturalHeight || Number(img.getAttribute('height')) || 1066
        };
      }).
      filter((item): item is {src: string;msrc: string;thumbnail: string;width: number;height: number;} =>
      Boolean(item)
      );
    };

    const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
    imgs.forEach((img) => {
      img.style.cursor = "zoom-in";
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
    try {
      content = generateHTML(json as never, getServerExtensions());
    } catch {
      content = styles.r_3353f144;
    }
  }

  if (!content) return null;
  return (
    <div
      ref={containerRef}
      className={cn(cx("prose-article", styles.r_399e11a5), sizeCls, className)}
      dangerouslySetInnerHTML={{ __html: content }} />);


}

function escape(s: string): string {
  return s.
  replace(/&/g, '&amp;').
  replace(/</g, '&lt;').
  replace(/>/g, '&gt;').
  replace(/"/g, '&quot;').
  replace(/'/g, '&#39;');
}