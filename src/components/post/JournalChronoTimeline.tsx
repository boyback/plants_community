'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  type SyntheticEvent,
} from 'react';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';
import type { TimelineItem } from 'react-chrono';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client-api';
import { registerPhotoSwipeGalleryUi } from '@/lib/photoswipe-ui';

const Chrono = dynamic(() => import('react-chrono').then((mod) => mod.Chrono), {
  ssr: false,
});

export type JournalChronoEntry = {
  id: string;
  postId: string;
  postTitle: string;
  dateIso: string;
  dateLabel: string;
  yearLabel: string;
  monthDayLabel: string;
  stageLabel: string;
  stageIcon: string;
  stageClassName: string;
  note: string;
  images: string[];
  likes: number;
  comments: number;
  liked: boolean;
};

export type JournalTimelineImage = {
  image: string;
  entryId: string;
  dateLabel: string;
  stageLabel: string;
};

type ImageSize = {
  width: number;
  height: number;
};

export function JournalChronoTimeline({ entries }: { entries: JournalChronoEntry[] }) {
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const [imageSizes, setImageSizes] = useState<Record<string, ImageSize>>({});
  const allImages = useMemo(
    () =>
      entries.flatMap((entry) =>
        entry.images.map((image) => ({
          image,
          entryId: entry.id,
          dateLabel: entry.dateLabel,
          stageLabel: entry.stageLabel,
        })),
      ),
    [entries],
  );
  const imageStartIndexByEntryId = useMemo(() => {
    const map = new Map<string, number>();
    let index = 0;
    entries.forEach((entry) => {
      map.set(entry.id, index);
      index += entry.images.length;
    });
    return map;
  }, [entries]);
  const slides = usePhotoSwipeSlides(allImages, imageSizes);
  const handleImageLoad = useImageSizeLoader(setImageSizes);
  const openPhotoSwipe = usePhotoSwipeOpener(slides, pswpRef);
  const items: TimelineItem[] = entries.map((entry) => ({
    id: entry.id,
    title: (
      <span className="plant-chrono-title-date">{entry.yearLabel}/{entry.monthDayLabel}</span>
    ) as unknown as string,
  }));
  const height = Math.max(420, entries.reduce((total, entry) => {
    const imageRows = entry.images.length > 0 ? 150 : 0;
    const noteRows = entry.note ? Math.min(96, Math.ceil(entry.note.length / 28) * 24) : 0;
    return total + 150 + imageRows + noteRows;
  }, 80));

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-leaf-200 bg-leaf-50/40 p-10 text-center text-sm text-ink-500">
        还没有成长记录
      </div>
    );
  }

  return (
    <div className="plant-chrono-timeline" style={{ width: '100%', minHeight: height }}>
      <Chrono
        items={items}
        mode="VERTICAL"
        disableToolbar
        disableClickOnCircle
        enableBreakPoint
        responsiveBreakPoint={900}
        scrollable={false}
        cardHeight={1}
        timelinePointDimension={16}
        theme={{
          primary: 'rgb(var(--leaf-600))',
          secondary: 'rgb(var(--leaf-100))',
          cardBgColor: 'rgb(var(--surface))',
          cardDetailsBackGround: 'rgb(var(--surface))',
          cardDetailsColor: 'rgb(var(--ink-800))',
          cardMediaBgColor: 'rgb(var(--leaf-50))',
          cardTitleColor: 'rgb(var(--ink-900))',
          cardSubtitleColor: 'rgb(var(--leaf-700))',
          titleColor: 'rgb(var(--ink-700))',
          titleColorActive: 'rgb(var(--leaf-700))',
          textColor: 'rgb(var(--ink-800))',
          iconBackgroundColor: 'rgb(var(--leaf-600))',
        }}
        fontSizes={{
          title: '0.78rem',
          cardTitle: '1rem',
          cardSubtitle: '0.78rem',
          cardText: '0.875rem',
        }}
      >
        {entries.map((entry) => (
          <TimelineCardContent
            key={entry.id}
            entry={entry}
            imageStartIndex={imageStartIndexByEntryId.get(entry.id) ?? 0}
            onImageLoad={handleImageLoad}
            onPreview={openPhotoSwipe}
          />
        ))}
      </Chrono>
      <style jsx global>{`
        .plant-chrono-timeline,
        .plant-chrono-timeline > div,
        .plant-chrono-timeline .vertical,
        .plant-chrono-timeline .timeline-main-wrapper,
        .plant-chrono-timeline .timeline-main-wrapper > div {
          min-height: inherit !important;
          height: auto !important;
        }

        .plant-chrono-timeline .timeline-main-wrapper {
          padding-left: 0 !important;
          padding-right: 0 !important;
          overflow: visible !important;
          background: transparent !important;
        }

        .plant-chrono-timeline .timeline-card-content,
        .plant-chrono-timeline [id^='timeline-card-'] {
          min-height: 0 !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }

        .plant-chrono-timeline .timeline-card-content {
          border-radius: 8px !important;
          border: 0 !important;
          background: rgb(var(--surface)) !important;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 16px rgba(16, 24, 40, 0.06) !important;
          outline: none !important;
          text-align: left !important;
        }

        .plant-chrono-timeline .timeline-card-content:focus,
        .plant-chrono-timeline .timeline-card-content:focus-visible,
        .plant-chrono-timeline .timeline-card-content:active,
        .plant-chrono-timeline [id^='timeline-card-']:focus,
        .plant-chrono-timeline [id^='timeline-card-']:focus-visible,
        .plant-chrono-timeline [id^='timeline-card-']:active {
          border: 0 !important;
          outline: none !important;
        }

        .plant-chrono-timeline .card-description {
          max-height: none !important;
          overflow: visible !important;
          width: 100% !important;
          text-align: left !important;
          margin: 0;
          padding: 0;
        }

        .plant-chrono-timeline .card-description > * {
          width: 100% !important;
        }

        .plant-chrono-timeline [class*='TimelineContentContainer'],
        .plant-chrono-timeline [class*='TimelineCardContent'] {
          align-items: flex-start !important;
          justify-content: flex-start !important;
          text-align: left !important;
        }

        .plant-chrono-timeline .vertical-item-row {
          min-height: 0 !important;
          padding-bottom: 0 !important;
        }

        .plant-chrono-timeline [class*='sc-1427v1d-3'] {
          position: relative !important;
          z-index: 4 !important;
          width: 104px !important;
          min-width: 104px !important;
          flex: 0 0 104px !important;
          overflow: visible !important;
        }

        .plant-chrono-timeline [class*='sc-1427v1d-2'] {
          width: calc(100% - 144px) !important;
          justify-content: flex-start !important;
        }

        .plant-chrono-timeline [class*='sc-12rz3g8-0'] {
          width: 40px !important;
          min-width: 40px !important;
          margin-inline-end: 20px;
        }

        .plant-chrono-timeline [class*='sc-18iuiou-3'] {
          border: 3px solid rgb(var(--leaf-600)) !important;
          background: rgb(var(--leaf-50)) !important;
        }

        .plant-chrono-timeline .plant-chrono-title-date {
          color: rgb(var(--leaf-700));
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
        }

        .plant-chrono-timeline .plant-chrono-title-stage {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          color: rgb(var(--ink-800));
          font-size: 13px;
          font-weight: 700;
        }

        .plant-chrono-timeline a {
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}

export function JournalImageThumbStrip({ images }: { images: JournalTimelineImage[] }) {
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const [imageSizes, setImageSizes] = useState<Record<string, ImageSize>>({});
  const slides = usePhotoSwipeSlides(images, imageSizes);
  const handleImageLoad = useImageSizeLoader(setImageSizes);
  const openPhotoSwipe = usePhotoSwipeOpener(slides, pswpRef);

  if (images.length === 0) return null;

  return (
    <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
      {images.map((item, index) => (
        <button
          key={`${item.entryId}-${item.image}-${index}`}
          type="button"
          onClick={() => openPhotoSwipe(index)}
          title={`${item.dateLabel} ${item.stageLabel}`}
          className="relative h-16 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-leaf-100 bg-leaf-50 transition hover:border-leaf-300"
          aria-label={`预览图片 ${index + 1}`}
        >
          <Image
            src={item.image}
            alt={`${item.dateLabel} ${item.stageLabel}`}
            fill
            unoptimized
            className="object-cover"
            onLoad={(event) => handleImageLoad(item.image, event)}
          />
        </button>
      ))}
    </div>
  );
}

function TimelineCardContent({
  entry,
  imageStartIndex,
  onImageLoad,
  onPreview,
}: {
  entry: JournalChronoEntry;
  imageStartIndex: number;
  onImageLoad: (src: string, event: SyntheticEvent<HTMLImageElement>) => void;
  onPreview: (index: number) => void;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(entry.liked);
  const [likes, setLikes] = useState(entry.likes);
  const [comments, setComments] = useState(entry.comments);

  useEffect(() => {
    const handleCreated = (event: Event) => {
      const detail = (event as CustomEvent<{ postId: string; entryId?: string }>).detail;
      if (detail?.postId === entry.postId && detail.entryId === entry.id) {
        setComments((count) => count + 1);
      }
    };
    window.addEventListener('journal-entry-comment-created', handleCreated);
    return () => window.removeEventListener('journal-entry-comment-created', handleCreated);
  }, [entry.id, entry.postId]);

  const toggleLike = async () => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    const previousLiked = liked;
    const previousLikes = likes;
    setLiked(!previousLiked);
    setLikes(Math.max(0, previousLikes + (previousLiked ? -1 : 1)));
    try {
      const result = await api.post<{ liked: boolean; total: number }>(
        `/api/posts/${entry.postId}/journal/${entry.id}/like`,
      );
      setLiked(result.liked);
      setLikes(result.total);
    } catch {
      setLiked(previousLiked);
      setLikes(previousLikes);
    }
  };

  const selectCommentTarget = () => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    window.dispatchEvent(
      new CustomEvent('journal-entry-comment-target-selected', {
        detail: {
          postId: entry.postId,
          id: entry.id,
          entryId: entry.id,
          dateLabel: entry.dateLabel,
          stageLabel: entry.stageLabel,
          note: entry.note,
          image: entry.images[0],
        },
      }),
    );
    document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div id={`journal-entry-${entry.id}`} className="min-w-0 scroll-mt-28 px-5 py-4">
      <span className="plant-chrono-title-stage">
        <span>{entry.stageIcon}</span>
        <span>{entry.stageLabel}</span>
      </span>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-700">{entry.note || '暂无备注'}</p>

      {entry.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {entry.images.slice(0, 3).map((image, index) => (
            <button
              key={`${entry.id}-${image}-${index}`}
              type="button"
              onClick={() => onPreview(imageStartIndex + index)}
              className="relative h-[120px] w-[120px] cursor-zoom-in overflow-hidden rounded-lg bg-leaf-50"
              aria-label={`预览 ${entry.stageLabel} 图片 ${index + 1}`}
            >
              <Image
                src={image}
                alt={entry.postTitle}
                fill
                unoptimized
                className="object-cover"
                onLoad={(event) => onImageLoad(image, event)}
              />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2 text-xs text-ink-500">
        <button
          type="button"
          onClick={toggleLike}
          className={
            liked
              ? 'inline-flex h-8 min-w-[58px] items-center justify-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 text-rose-500 transition hover:border-rose-200 hover:bg-rose-100'
              : 'inline-flex h-8 min-w-[58px] items-center justify-center gap-1.5 rounded-lg border border-leaf-100 bg-white px-3 text-ink-500 transition hover:border-leaf-200 hover:bg-leaf-50 hover:text-leaf-700'
          }
          aria-pressed={liked}
        >
          <Icon name="thumbs-up" size={14} fill={liked ? 'currentColor' : 'none'} />
          {likes}
        </button>
        <button
          type="button"
          onClick={selectCommentTarget}
          className="inline-flex h-8 min-w-[58px] items-center justify-center gap-1.5 rounded-lg border border-leaf-100 bg-white px-3 text-ink-500 transition hover:border-leaf-200 hover:bg-leaf-50 hover:text-leaf-700"
        >
          <Icon name="comment" size={14} />
          {comments}
        </button>
      </div>
    </div>
  );
}

function usePhotoSwipeSlides(images: JournalTimelineImage[], imageSizes: Record<string, ImageSize>) {
  return useMemo(
    () =>
      images.map((item) => {
        const size = imageSizes[item.image] || { width: 1600, height: 1066 };
        return {
          src: item.image,
          msrc: item.image,
          thumbnail: item.image,
          width: size.width,
          height: size.height,
        };
      }),
    [imageSizes, images],
  );
}

function useImageSizeLoader(setImageSizes: Dispatch<SetStateAction<Record<string, ImageSize>>>) {
  return useCallback(
    (src: string, event: SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        setImageSizes((prev) => ({
          ...prev,
          [src]: { width: img.naturalWidth, height: img.naturalHeight },
        }));
      }
    },
    [setImageSizes],
  );
}

function usePhotoSwipeOpener(slides: ReturnType<typeof usePhotoSwipeSlides>, pswpRef: MutableRefObject<PhotoSwipe | null>) {
  const openPhotoSwipe = useCallback(
    (index: number) => {
      if (index < 0 || index >= slides.length) return;
      pswpRef.current?.destroy();
      pswpRef.current = new PhotoSwipe({
        dataSource: slides,
        index,
        showHideAnimationType: 'fade',
        imageClickAction: false,
        tapAction: false,
        doubleTapAction: false,
        zoom: false,
        closeOnVerticalDrag: false,
      } as any);
      registerPhotoSwipeGalleryUi(pswpRef.current);
      pswpRef.current.init();
    },
    [pswpRef, slides],
  );

  useEffect(() => {
    return () => {
      pswpRef.current?.destroy();
    };
  }, [pswpRef]);

  return openPhotoSwipe;
}
