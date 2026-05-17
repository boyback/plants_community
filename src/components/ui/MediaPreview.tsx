'use client';

/**
 * 全媒体预览组件 — 基于 yet-another-react-lightbox
 *
 * 支持:
 *   - 图片预览（缩放、拖拽、滑切）
 *   - 视频预览（MP4/WebM/MOV）
 *   - 计数器 N/M
 *   - Live Photo（图片→视频回退）
 *   - 键盘导航 / 触摸手势
 *   - 缩略图导航
 *   - 全屏模式
 */

import Lightbox from 'yet-another-react-lightbox';
import Video from 'yet-another-react-lightbox/plugins/video';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  liveVideoUrl?: string;
  alt?: string;
}

interface Props {
  items: readonly MediaItem[];
  index: number | null;
  onClose: () => void;
  onChange?: (i: number) => void;
}

export function MediaPreview({
  items,
  index,
  onClose,
  onChange,
}: Props) {
  if (index === null) return null;

  const slides = items.map((item) => {
    if (item.type === 'video' || item.liveVideoUrl) {
      return {
        type: 'video' as const,
        sources: [
          { src: item.liveVideoUrl || item.url, type: guessVideoMime(item.liveVideoUrl || item.url) },
        ],
        autoPlay: false,
        controls: true,
      };
    }
    return { src: item.url, alt: item.alt };
  });

  const allPlugins = [Video, Counter, Zoom, Captions, Thumbnails, Fullscreen];

  return (
    <Lightbox
      open={index !== null}
      index={index}
      close={onClose}
      slides={slides}
      plugins={allPlugins}
      on={{ view: ({ index: i }) => onChange?.(i) }}
      carousel={{ finite: true }}
      controller={{ closeOnBackdropClick: true }}
      counter={{ container: { style: { top: 0, bottom: 'auto' } } }}
      zoom={{ scrollToZoom: true, maxZoomPixelRatio: 10 }}
      thumbnails={{ position: 'bottom', width: 80, height: 80 }}
      captions={{ descriptionMaxLines: 2 }}
      styles={{ container: { backgroundColor: 'rgba(0,0,0,0.95)' } }}
    />
  );
}

function guessVideoMime(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mov': return 'video/quicktime';
    case 'ogg': return 'video/ogg';
    case 'avi': return 'video/x-msvideo';
    default: return 'video/mp4';
  }
}