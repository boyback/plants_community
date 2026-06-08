import type PhotoSwipe from 'photoswipe';
import type { DataSourceArray } from 'photoswipe';

type SlideLike = {
  src?: string;
  msrc?: string;
  thumbnail?: string;
};

const ROTATE_CW_ICON_PATH = 'M21 2v6h-6M21 13a9 9 0 1 1-3-6.7L21 8';

function ensurePhotoSwipeCursorStyle() {
  if (typeof document === 'undefined' || document.getElementById('rouyou-pswp-cursor-style')) return;

  const style = document.createElement('style');
  style.id = 'rouyou-pswp-cursor-style';
  style.textContent = `
    .pswp .pswp__img,
    .pswp .pswp__img:active,
    .pswp.pswp--click-to-zoom.pswp--zoom-allowed .pswp__img,
    .pswp.pswp--click-to-zoom.pswp--zoomed-in .pswp__img,
    .pswp.pswp--click-to-zoom.pswp--zoomed-in .pswp__img:active,
    .pswp.pswp--no-mouse-drag.pswp--zoomed-in .pswp__img,
    .pswp.pswp--no-mouse-drag.pswp--zoomed-in .pswp__img:active {
      cursor: pointer !important;
    }
  `;
  document.head.appendChild(style);
}

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
      el.style.gridTemplateColumns = 'repeat(auto-fit, 60px)';
      el.style.gridTemplateRows = 'repeat(auto-fit, 60px)';
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

export function createZoomControlsUiElement() {
  return {
    name: 'zoom-percent-controls',
    order: 19,
    isButton: false,
    appendTo: 'bar' as const,
    onInit: (el: HTMLElement, pswpInstance: PhotoSwipe) => {
      const minPercent = 50;
      const maxPercent = 150;
      const step = 5;
      const wheelStep = 10;
      let percent = 100;

      el.style.display = 'inline-flex';
      el.style.alignItems = 'center';
      el.style.height = '44px';
      el.style.padding = '0 4px';
      el.style.marginTop = '10px';

      const wrap = document.createElement('div');
      wrap.style.display = 'inline-flex';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '6px';
      wrap.style.height = '36px';
      wrap.style.borderRadius = '999px';
      wrap.style.background = 'rgba(255,255,255,0.12)';
      wrap.style.padding = '4px';
      wrap.style.color = '#fff';
      wrap.style.fontSize = '12px';
      wrap.style.fontWeight = '600';
      wrap.style.backdropFilter = 'blur(10px)';

      const label = document.createElement('span');
      label.style.minWidth = '46px';
      label.style.textAlign = 'center';
      label.style.fontVariantNumeric = 'tabular-nums';

      const createButton = (text: string, ariaLabel: string) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.setAttribute('aria-label', ariaLabel);
        button.style.display = 'grid';
        button.style.width = '28px';
        button.style.height = '28px';
        button.style.placeItems = 'center';
        button.style.border = '0';
        button.style.borderRadius = '999px';
        button.style.background = 'rgba(255,255,255,0.14)';
        button.style.color = '#fff';
        button.style.cursor = 'pointer';
        button.style.fontSize = '16px';
        button.style.lineHeight = '1';
        return button;
      };

      const minus = createButton('-', 'Zoom out');
      const plus = createButton('+', 'Zoom in');
      let lastWheelAt = 0;

      const updateUi = () => {
        label.textContent = `${percent}%`;
        minus.disabled = percent <= minPercent;
        plus.disabled = percent >= maxPercent;
        minus.style.opacity = minus.disabled ? '0.42' : '1';
        plus.style.opacity = plus.disabled ? '0.42' : '1';
        minus.style.cursor = minus.disabled ? 'default' : 'pointer';
        plus.style.cursor = plus.disabled ? 'default' : 'pointer';
      };

      const applyZoom = (nextPercent: number) => {
        const slide = pswpInstance.currSlide;
        if (!slide) return;

        percent = Math.max(minPercent, Math.min(maxPercent, nextPercent));
        const baseZoom = slide.zoomLevels.initial || slide.currZoomLevel || 1;
        const center = {
          x: pswpInstance.viewportSize.x / 2,
          y: pswpInstance.viewportSize.y / 2,
        };
        slide.zoomTo(baseZoom * (percent / 100), center, 180, true);
        updateUi();
      };

      minus.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyZoom(percent - step);
      });
      plus.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        applyZoom(percent + step);
      });

      wrap.append(minus, label, plus);
      el.appendChild(wrap);
      updateUi();

      pswpInstance.on('change', () => {
        percent = 100;
        updateUi();
      });
      pswpInstance.on('wheel', (event) => {
        event.preventDefault();
        event.originalEvent.preventDefault();
        const now = Date.now();
        if (now - lastWheelAt < 60) return;
        lastWheelAt = now;
        applyZoom(percent + (event.originalEvent.deltaY < 0 ? wheelStep : -wheelStep));
      });
    },
  };
}

export function createRotateButtonUiElement() {
  return {
    name: 'rotate-button',
    ariaLabel: 'Rotate image',
    order: 7,
    isButton: true,
    appendTo: 'bar' as const,
    html:
      `<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 32 32" width="32" height="32">` +
      `<g transform="translate(4 4)">` +
      `<path d="${ROTATE_CW_ICON_PATH}" fill="none" stroke="var(--pswp-icon-color)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</g>` +
      `</svg>`,
    onClick: (event: MouseEvent, el: HTMLElement, pswpInstance: PhotoSwipe) => {
      event.preventDefault();
      event.stopPropagation();

      const slide = pswpInstance.currSlide;
      if (!slide) return;

      const rotations = ((pswpInstance as any).__rouyouRotations ??= new Map<number, number>()) as Map<number, number>;
      const nextRotation = (rotations.get(slide.index) ?? 0) + 90;
      rotations.set(slide.index, nextRotation);

      applySlideRotation(pswpInstance, nextRotation);
      el.setAttribute('aria-label', `Rotate image (${nextRotation} degrees)`);
    },
    onInit: (el: HTMLElement, pswpInstance: PhotoSwipe) => {
      el.setAttribute('title', '旋转 90°');
      pswpInstance.on('change', () => {
        const rotations = ((pswpInstance as any).__rouyouRotations ??= new Map<number, number>()) as Map<number, number>;
        const rotation = rotations.get(pswpInstance.currSlide?.index ?? -1) ?? 0;
        applySlideRotation(pswpInstance, rotation, false);
        el.setAttribute('aria-label', rotation ? `Rotate image (${rotation} degrees)` : 'Rotate image');
      });
      pswpInstance.on('contentAppendImage', () => {
        const rotations = ((pswpInstance as any).__rouyouRotations ??= new Map<number, number>()) as Map<number, number>;
        const rotation = rotations.get(pswpInstance.currSlide?.index ?? -1) ?? 0;
        applySlideRotation(pswpInstance, rotation, false);
      });
    },
  };
}

function applySlideRotation(pswpInstance: PhotoSwipe, rotation: number, animate = true) {
  const slide = pswpInstance.currSlide;
  const contentEl = slide?.content?.element as HTMLElement | undefined;
  if (!slide || !contentEl) return;

  if (slide.currZoomLevel !== slide.zoomLevels.initial) {
    slide.zoomAndPanToInitial();
    slide.applyCurrentZoomPan();
  }

  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const isSideways = normalizedRotation % 180 !== 0;
  const width = contentEl.offsetWidth || contentEl.getBoundingClientRect().width;
  const height = contentEl.offsetHeight || contentEl.getBoundingClientRect().height;
  const scale = isSideways && width > 0 && height > 0
    ? Math.min(1, pswpInstance.viewportSize.x / height, pswpInstance.viewportSize.y / width)
    : 1;

  contentEl.style.transformOrigin = 'center center';
  contentEl.style.transition = animate ? 'transform 180ms ease' : 'none';
  contentEl.style.transform = `rotate(${rotation}deg) scale(${scale})`;
}

export function registerVerticalDragNavigation(pswp: PhotoSwipe) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let tracking = false;
  const threshold = 80;

  pswp.on('pointerDown', (event) => {
    const target = event.originalEvent.target as HTMLElement | null;
    if (target?.closest('.pswp__top-bar')) {
      tracking = false;
      return;
    }
    startX = event.originalEvent.clientX;
    startY = event.originalEvent.clientY;
    currentX = startX;
    currentY = startY;
    tracking = true;
  });

  pswp.on('pointerMove', (event) => {
    if (!tracking) return;
    currentX = event.originalEvent.clientX;
    currentY = event.originalEvent.clientY;
  });

  pswp.on('pointerUp', () => {
    if (!tracking) return;
    tracking = false;

    const slide = pswp.currSlide;
    if (slide && slide.currZoomLevel > slide.zoomLevels.initial * 1.02) return;

    const dx = currentX - startX;
    const dy = currentY - startY;
    if (Math.abs(dy) < threshold || Math.abs(dy) <= Math.abs(dx)) return;

    if (dy < 0) {
      pswp.next();
    } else {
      pswp.prev();
    }
  });

  pswp.on('verticalDrag', (event) => {
    event.preventDefault();
  });
}

export function registerPhotoSwipeCursorUi(pswp: PhotoSwipe) {
  const updateCursor = () => {
    pswp.element?.style.setProperty('--pswp-cursor', 'default');
    pswp.element?.style.setProperty('--pswp-cursor-zoom-in', 'default');
    pswp.element?.style.setProperty('--pswp-cursor-zoom-out', 'default');
    pswp.container?.style.setProperty('cursor', 'default', 'important');
    pswp.element?.querySelectorAll<HTMLElement>('.pswp__img').forEach((img) => {
      img.style.setProperty('cursor', 'pointer', 'important');
    });
  };

  pswp.on('afterInit', updateCursor);
  pswp.on('change', updateCursor);
  pswp.on('zoomPanUpdate', updateCursor);
  pswp.on('contentAppendImage', updateCursor);
}

export function registerPhotoSwipeGalleryUi(pswp: PhotoSwipe) {
  ensurePhotoSwipeCursorStyle();
  registerVerticalDragNavigation(pswp);
  registerPhotoSwipeCursorUi(pswp);

  pswp.on('uiRegister', () => {
    pswp.ui?.registerElement(createRotateButtonUiElement());
    pswp.ui?.registerElement(createZoomControlsUiElement());

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
