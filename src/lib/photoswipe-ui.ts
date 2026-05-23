import type PhotoSwipe from 'photoswipe';
import type { DataSourceArray } from 'photoswipe';

type SlideLike = {
  src?: string;
  msrc?: string;
  thumbnail?: string;
};

export function createThumbnailUiElement() {
  return {
    name: 'thumbnails-indicator',
    order: 9,
    isButton: false,
    appendTo: 'wrapper' as const,
    onInit: (el: HTMLElement, pswpInstance: PhotoSwipe) => {
      let prevIndex = -1;
      const thumbnails: HTMLElement[] = [];

      el.style.position = 'absolute';
      el.style.bottom = '20px';
      el.style.left = '10px';
      el.style.right = '0';
      el.style.display = 'grid';
      el.style.gap = '10px';
      el.style.gridTemplateColumns = 'repeat(auto-fit, 40px)';
      el.style.gridTemplateRows = 'repeat(auto-fit, 40px)';
      el.style.justifyContent = 'center';

      const dataSource = pswpInstance.options.dataSource as DataSourceArray;

      for (let i = 0; i < dataSource.length; i++) {
        const slideData = dataSource[i] as SlideLike;
        const thumbSrc = slideData.thumbnail || slideData.msrc || slideData.src || '';
        if (!thumbSrc) continue;

        const thumbnail = document.createElement('div');
        thumbnail.style.transition = 'transform 0.15s ease-in, opacity 0.15s ease-in';
        thumbnail.style.opacity = '0.6';
        thumbnail.style.cursor = 'pointer';
        thumbnail.style.borderRadius = '4px';
        thumbnail.style.overflow = 'hidden';
        thumbnail.onclick = (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          const thumbnailEl = target.tagName === 'IMG' ? target.parentElement : target;
          if (thumbnailEl) {
            pswpInstance.goTo(thumbnails.indexOf(thumbnailEl));
          }
        };

        const thumbnailImage = document.createElement('img');
        thumbnailImage.setAttribute('src', thumbSrc);
        thumbnailImage.style.width = '100%';
        thumbnailImage.style.height = '100%';
        thumbnailImage.style.objectFit = 'cover';

        thumbnail.appendChild(thumbnailImage);
        el.appendChild(thumbnail);
        thumbnails.push(thumbnail);
      }

      pswpInstance.on('change', () => {
        if (prevIndex >= 0 && thumbnails[prevIndex]) {
          const prevThumbnail = thumbnails[prevIndex];
          prevThumbnail.style.opacity = '0.6';
          prevThumbnail.style.transform = 'scale(1)';
        }

        if (thumbnails[pswpInstance.currIndex]) {
          const currentThumbnail = thumbnails[pswpInstance.currIndex];
          currentThumbnail.style.opacity = '1';
          currentThumbnail.style.transform = 'scale(1.1)';
        }

        prevIndex = pswpInstance.currIndex;
      });
    },
  };
}

export function registerPhotoSwipeGalleryUi(pswp: PhotoSwipe) {
  pswp.on('uiRegister', () => {
    pswp.ui?.registerElement({
      name: 'download-button',
      ariaLabel: 'Download',
      order: 8,
      isButton: true,
      tagName: 'a',
      appendTo: 'bar',
      html: {
        isCustomSVG: true,
        inner:
          '<path d="M20.5 14.3 17.1 18V10h-2.2v7.9l-3.4-3.6L10 16l6 6.1 6-6.1ZM23 23H9v2h14Z" id="pswp__icn-download"/>',
        outlineID: 'pswp__icn-download',
      },
      onInit: (el: HTMLElement, pswpInstance: PhotoSwipe) => {
        el.setAttribute('download', '');
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
        const updateHref = () => {
          const src = pswpInstance.currSlide?.data.src;
          if (src) (el as HTMLAnchorElement).href = src;
        };
        updateHref();
        pswpInstance.on('change', updateHref);
      },
    });

    pswp.ui?.registerElement(createThumbnailUiElement());
  });
}
