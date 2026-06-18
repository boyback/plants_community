'use client';

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  type SyntheticEvent } from
'react';
import PhotoSwipe from 'photoswipe';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/ui/Icon';
import { Timeline, TimelineItem } from '@/components/ui/Timeline';
import { registerPhotoSwipeGalleryUi } from "@/lib/photoswipe-ui";
import styles from './JournalChronoTimeline.module.scss';
import { cx } from '@/lib/style-utils';

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
  comments: number;
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

export function JournalChronoTimeline({ entries }: {entries: JournalChronoEntry[];}) {
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const [imageSizes, setImageSizes] = useState<Record<string, ImageSize>>({});
  const allImages = useMemo(
    () =>
    entries.flatMap((entry) =>
    entry.images.map((image) => ({
      image,
      entryId: entry.id,
      dateLabel: entry.dateLabel,
      stageLabel: entry.stageLabel
    }))
    ),
    [entries]
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
  if (entries.length === 0) {
    return (
      <div className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_efb55408, styles.r_a4d0f420, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_7b89cd85)}>
        还没有记录
      </div>);

  }

  return (
    <Timeline>
        {entries.map((entry) =>
        <TimelineEntryCard
          key={entry.id}
          entry={entry}
          imageStartIndex={imageStartIndexByEntryId.get(entry.id) ?? 0}
          onImageLoad={handleImageLoad}
          onPreview={openPhotoSwipe} />

        )}
    </Timeline>);

}

export function JournalImageThumbStrip({ images }: {images: JournalTimelineImage[];}) {
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const [imageSizes, setImageSizes] = useState<Record<string, ImageSize>>({});
  const slides = usePhotoSwipeSlides(images, imageSizes);
  const handleImageLoad = useImageSizeLoader(setImageSizes);
  const openPhotoSwipe = usePhotoSwipeOpener(slides, pswpRef);

  if (images.length === 0) return null;

  return (
    <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_c0980a65, styles.r_77a2a20e, styles.r_1384f66f, styles.r_569eb162)}>
      {images.map((item, index) =>
      <button
        key={`${item.entryId}-${item.image}-${index}`}
        type="button"
        onClick={() => openPhotoSwipe(index)}
        title={`${item.dateLabel} ${item.stageLabel}`}
        className={cx(styles.r_d89972fe, styles.r_acaee621, styles.r_baceed34, styles.r_012fbd12, styles.r_3bbc8c13, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_7ebecbb6, styles.r_56bf8ae8, styles.r_a5c39c39)}
        aria-label={`预览图片 ${index + 1}`}>

          <Image
          src={item.image}
          alt={`${item.dateLabel} ${item.stageLabel}`}
          fill
          unoptimized
          className={styles.r_7d85d0c2}
          onLoad={(event) => handleImageLoad(item.image, event)} />

        </button>
      )}
    </div>);

}

function TimelineEntryCard({
  entry,
  imageStartIndex,
  onImageLoad,
  onPreview





}: {entry: JournalChronoEntry;imageStartIndex: number;onImageLoad: (src: string, event: SyntheticEvent<HTMLImageElement>) => void;onPreview: (index: number) => void;}) {
  const { user } = useAuth();
  const [comments, setComments] = useState(entry.comments);

  useEffect(() => {
    const handleCreated = (event: Event) => {
      const detail = (event as CustomEvent<{postId: string;entryId?: string;}>).detail;
      if (detail?.postId === entry.postId && detail.entryId === entry.id) {
        setComments((count) => count + 1);
      }
    };
    window.addEventListener("journal-entry-comment-created", handleCreated);
    return () => window.removeEventListener("journal-entry-comment-created", handleCreated);
  }, [entry.id, entry.postId]);

  const selectCommentTarget = () => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    window.dispatchEvent(
      new CustomEvent("journal-entry-comment-target-selected", {
        detail: {
          postId: entry.postId,
          id: entry.id,
          entryId: entry.id,
          dateLabel: entry.dateLabel,
          stageLabel: entry.stageLabel,
          note: entry.note,
          image: entry.images[0]
        }
      })
    );
    document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <TimelineItem
      id={`journal-entry-${entry.id}`}
      date={`${entry.yearLabel} ${entry.monthDayLabel}`}
      heading={
        <span className={styles.timelineStageButton}>{entry.stageLabel}</span>
      }
      actions={
        <button
          type="button"
          onClick={selectCommentTarget}
          className={styles.timelineCommentButton}>

          <Icon name="comment" size={14} />
          {comments}
        </button>
      }>
      <p className={styles.timelineNote}>{entry.note || '暂无备注'}</p>

      {entry.images.length > 0 &&
      <div className={styles.timelineImages}>
          {entry.images.slice(0, 3).map((image, index) =>
        <button
          key={`${entry.id}-${image}-${index}`}
          type="button"
          onClick={() => onPreview(imageStartIndex + index)}
          className={styles.timelineImageButton}
          aria-label={`预览 ${entry.stageLabel} 图片 ${index + 1}`}>

              <Image
            src={image}
            alt={entry.postTitle}
            fill
            unoptimized
            className={styles.r_7d85d0c2}
            onLoad={(event) => onImageLoad(image, event)} />

            </button>
        )}
        </div>
      }
    </TimelineItem>);

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
        height: size.height
      };
    }),
    [imageSizes, images]
  );
}

function useImageSizeLoader(setImageSizes: Dispatch<SetStateAction<Record<string, ImageSize>>>) {
  return useCallback(
    (src: string, event: SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        setImageSizes((prev) => ({
          ...prev,
          [src]: { width: img.naturalWidth, height: img.naturalHeight }
        }));
      }
    },
    [setImageSizes]
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
        closeOnVerticalDrag: false
      } as any);
      registerPhotoSwipeGalleryUi(pswpRef.current);
      pswpRef.current.init();
    },
    [pswpRef, slides]
  );

  useEffect(() => {
    return () => {
      pswpRef.current?.destroy();
    };
  }, [pswpRef]);

  return openPhotoSwipe;
}
