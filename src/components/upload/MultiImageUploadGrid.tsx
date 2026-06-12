'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';
import PhotoSwipe from 'photoswipe';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent } from
"@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable } from
"@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from '@/components/ui/Icon';
import { registerPhotoSwipeGalleryUi } from "@/lib/photoswipe-ui";
import { cn } from '@/lib/utils';
import { useConcurrentUpload } from './useConcurrentUpload';
import type { ConcurrentUploadingItem } from './useConcurrentUpload';
import styles from './MultiImageUploadGrid.module.scss';
import { cx } from '@/lib/style-utils';



interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  maxFileSizeMb?: number;
  onUploadingChange?: (uploading: boolean) => void;
  className?: string;
  gridClassName?: string;
  tileClassName?: string;
  tileImageClassName?: string;
  addTileClassName?: string;
  firstItemLabel?: string;
  squareTiles?: boolean;
  hideAddButton?: boolean;
  showAddWhileUploading?: boolean;
  squareAddButton?: boolean;
  showCount?: boolean;
  helpText?: ReactNode;
  helpTextClassName?: string;
}

export interface MultiImageUploadGridHandle {
  openPicker: () => void;
}

type GridEntry =
{type: 'uploaded';key: string;url: string;} |
{type: 'uploading';key: string;id: string;};

const uploadedKey = (url: string) => `uploaded:${url}`;
const uploadingKey = (id: string) => `uploading:${id}`;
const keyToUploadedUrl = (key: string) => key.slice("uploaded:".length);

interface ImageSize {
  width: number;
  height: number;
}

export const MultiImageUploadGrid = forwardRef<MultiImageUploadGridHandle, Props>(function MultiImageUploadGrid({
  value,
  onChange,
  max = 50,
  maxFileSizeMb = 10,
  onUploadingChange,
  className,
  gridClassName,
  tileClassName = cx(styles.r_4b4cc48e, styles.r_d524f8b8),
  tileImageClassName,
  addTileClassName,
  firstItemLabel,
  squareTiles = false,
  hideAddButton = false,
  showAddWhileUploading = false,
  squareAddButton = false,
  showCount = true,
  helpText,
  helpTextClassName
}, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const orderKeysRef = useRef<string[]>([]);
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const [orderKeys, setOrderKeys] = useState<string[]>([]);
  const [imageSizes, setImageSizes] = useState<Record<string, ImageSize>>({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const previewSlides = useMemo(
    () =>
    value.map((src) => {
      const size = imageSizes[src] || { width: 1600, height: 1066 };
      return {
        src,
        msrc: src,
        thumbnail: src,
        width: size.width,
        height: size.height
      };
    }),
    [imageSizes, value]
  );

  const handleImageLoad = useCallback((src: string, event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImageSizes((prev) => ({
        ...prev,
        [src]: { width: img.naturalWidth, height: img.naturalHeight }
      }));
    }
  }, []);

  const openPreview = useCallback(
    (index: number) => {
      if (index < 0 || index >= previewSlides.length) return;
      pswpRef.current?.destroy();
      pswpRef.current = new PhotoSwipe({
        dataSource: previewSlides,
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
    [previewSlides]
  );

  useEffect(() => {
    return () => {
      pswpRef.current?.destroy();
    };
  }, []);

  const applyOrderedKeys = useCallback(
    (nextKeys: string[]) => {
      orderKeysRef.current = nextKeys;
      setOrderKeys(nextKeys);

      const nextValue = nextKeys.
      filter((key) => key.startsWith("uploaded:")).
      map(keyToUploadedUrl);
      if (
      nextValue.length !== valueRef.current.length ||
      nextValue.some((url, index) => url !== valueRef.current[index]))
      {
        valueRef.current = nextValue;
        onChange(nextValue);
      }
    },
    [onChange]
  );

  const handleUploadedItem = useCallback(
    (id: string, url: string) => {
      const fromKey = uploadingKey(id);
      const toKey = uploadedKey(url);
      const current = orderKeysRef.current;
      const next = current.includes(fromKey) ?
      current.map((key) => key === fromKey ? toKey : key) :
      [...current, toKey];
      applyOrderedKeys(next);
    },
    [applyOrderedKeys]
  );

  const validateFile = (file: File) => {
    const isHeic =
    /\.(heic|heif)$/i.test(file.name) ||
    /^image\/(heic|heif)$/i.test(file.type);
    if (!file.type.startsWith('image/') && !isHeic) {
      return '请选择图片文件';
    }
    if (file.size > maxFileSizeMb * 1024 * 1024) {
      return `图片过大，单张不能超过 ${maxFileSizeMb} MB`;
    }
    return null;
  };

  const {
    uploadingItems,
    remainingCount,
    isUploading,
    handleFiles,
    retryUpload,
    removeUploadingItem,
    reorderUploadingItems
  } = useConcurrentUpload({
    value,
    onChange,
    max,
    validateFile,
    onUploadedItem: handleUploadedItem
  });

  useEffect(() => {
    const currentKeys = [
    ...value.map(uploadedKey),
    ...uploadingItems.map((item) => uploadingKey(item.id))];

    setOrderKeys((prev) => {
      const kept = prev.filter((key) => currentKeys.includes(key));
      const missing = currentKeys.filter((key) => !kept.includes(key));
      const next = [...kept, ...missing];
      orderKeysRef.current = next;
      return next;
    });
  }, [uploadingItems, value]);

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  useImperativeHandle(ref, () => ({
    openPicker: () => {
      if (remainingCount <= 0) return;
      inputRef.current?.click();
    }
  }), [remainingCount]);

  const entries = useMemo<GridEntry[]>(() => {
    const uploadingById = new Map(uploadingItems.map((item) => [item.id, item]));
    const currentValue = valueRef.current;
    return orderKeys.reduce<GridEntry[]>((result, key) => {
      if (key.startsWith("uploaded:")) {
        const url = keyToUploadedUrl(key);
        if (currentValue.includes(url)) result.push({ type: 'uploaded', key, url });
        return result;
      }
      if (key.startsWith("uploading:")) {
        const id = key.slice("uploading:".length);
        if (uploadingById.has(id)) result.push({ type: 'uploading', key, id });
        return result;
      }
      return result;
    }, []);
  }, [orderKeys, uploadingItems, value]);

  const applyDragOrder = useCallback(
    (nextKeys: string[]) => {
      applyOrderedKeys(nextKeys);
      reorderUploadingItems(
        nextKeys.
        filter((key) => key.startsWith("uploading:")).
        map((key) => key.slice("uploading:".length))
      );
    },
    [applyOrderedKeys, reorderUploadingItems]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const current = orderKeysRef.current;
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      applyDragOrder(arrayMove(current, oldIndex, newIndex));
    },
    [applyDragOrder]
  );

  const handleRemoveUploaded = useCallback(
    (url: string) => {
      const next = valueRef.current.filter((item) => item !== url);
      valueRef.current = next;
      onChange(next);
      applyOrderedKeys(orderKeysRef.current.filter((key) => key !== uploadedKey(url)));
    },
    [applyOrderedKeys, onChange]
  );

  return (
    <div className={cn(styles.r_6f7e013d, className)}>
      {showCount &&
      <div className={cx(styles.r_308fc069, styles.r_359090c2, styles.r_6c4cc49e)}>
          {value.length}/{max}
        </div>
      }
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,.heic,.heif"
        className={styles.r_99d72c7f}
        disabled={remainingCount === 0}
        onChange={(event) => {
          const files = event.currentTarget.files;
          if (files) void handleFiles(files);
          event.currentTarget.value = '';
        }} />


      <div className={cn(styles.r_f3c543ad, gridClassName ?? cx(styles.r_be2e831b, styles.r_77a2a20e, styles.r_898c0bcb, styles.r_74713240))}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={entries.map((entry) => entry.key)} strategy={rectSortingStrategy}>
            {entries.map((entry, index) => {
              const item = entry.type === 'uploading' ?
              uploadingItems.find((uploadingItem) => uploadingItem.id === entry.id) :
              null;
              const url = entry.type === 'uploaded' ? entry.url : item?.url ?? item?.localUrl;
              if (!url || item === undefined) return null;

              return (
                <SortableUploadTile
                  key={entry.key}
                  id={entry.key}
                  entry={entry}
                  item={item}
                  url={url}
                  index={index}
                  tileClassName={tileClassName}
                  tileImageClassName={tileImageClassName}
                  squareTiles={squareTiles}
                  firstItemLabel={firstItemLabel}
                  onRemoveUploaded={handleRemoveUploaded}
                  onRemoveUploading={removeUploadingItem}
                  onRetryUpload={retryUpload}
                  previewIndex={entry.type === 'uploaded' ? value.indexOf(entry.url) : -1}
                  onPreview={openPreview}
                  onImageLoad={handleImageLoad} />);


            })}
          </SortableContext>
        </DndContext>

        {!hideAddButton && remainingCount > 0 && (!isUploading || showAddWhileUploading) &&
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_44ee8ba0, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_54720a96, styles.r_359090c2, styles.r_ceb69a6b, styles.r_0a7c2f87, styles.r_98dc6304),

          !squareTiles && !squareAddButton && styles.r_421ac2be,
          tileClassName,
          addTileClassName
          )}>

            <Icon name="plus" size={16} className={styles.r_b17d6a13} />
            <span className={cx(styles.r_1dc571a3, styles.r_69335b95)}>图片</span>
          </button>
        }
      </div>

      {helpText &&
      <div className={cn(cx(styles.r_e2eedc57, styles.r_ca6bf630, styles.r_d058ca6d, styles.r_3353f144), helpTextClassName)}>
          {helpText}
        </div>
      }
    </div>);

});

interface SortableUploadTileProps {
  id: string;
  entry: GridEntry;
  item: ConcurrentUploadingItem | null;
  url: string;
  index: number;
  tileClassName?: string;
  tileImageClassName?: string;
  squareTiles: boolean;
  firstItemLabel?: string;
  onRemoveUploaded: (url: string) => void;
  onRemoveUploading: (id: string) => void;
  onRetryUpload: (item: ConcurrentUploadingItem) => void;
  previewIndex: number;
  onPreview: (index: number) => void;
  onImageLoad: (src: string, event: SyntheticEvent<HTMLImageElement>) => void;
}

function SortableUploadTile({
  id,
  entry,
  item,
  url,
  index,
  tileClassName,
  tileImageClassName,
  squareTiles,
  firstItemLabel,
  onRemoveUploaded,
  onRemoveUploading,
  onRetryUpload,
  previewIndex,
  onPreview,
  onImageLoad
}: SortableUploadTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      {...attributes}
      {...listeners}
      onClick={(event) => {
        if (entry.type !== 'uploaded') return;
        if ((event.target as HTMLElement).closest('button')) return;
        onPreview(previewIndex);
      }}
      className={cn(cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_60fbb771, styles.r_51e5622e, styles.r_8d083852, styles.r_3960ffc2, styles.r_86843cf1, styles.r_2cd02d11, styles.r_ca6bcd4b, styles.r_54720a96, styles.r_d9bff91e),

      entry.type === 'uploading' ? cx(styles.r_a29b7a64, styles.r_691861bc) : styles.r_88b684d2,
      isDragging && cx(styles.r_0f2fff0a, styles.r_f2868c22, styles.r_06bbb431),
      !squareTiles && styles.r_421ac2be,
      tileClassName
      )}>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        draggable={false}
        className={cn(cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2),

        item?.status === 'uploading' ? styles.r_2a2db466 : styles.r_3972e98d,
        tileImageClassName
        )}
        onLoad={(event) => onImageLoad(url, event)} />

      {entry.type === 'uploaded' ?
      <>
          <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemoveUploaded(entry.url)}
          className={cx(styles.r_da4dbfbc, styles.r_68d3fc19, styles.r_c55dcda2, styles.r_145745bf, styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_db1c7bcb, styles.r_d058ca6d, styles.r_72a4c7cd, styles.r_3972e98d, styles.r_67d6184a, styles.r_527b812d, styles.r_ed9efdb6)}
          title="移除">

            x
          </button>
          {firstItemLabel && index === 0 &&
        <span className={cx(styles.r_da4dbfbc, styles.r_57045bd8, styles.r_7971386c, styles.r_db1c7bcb, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_72a4c7cd)}>
              {firstItemLabel}
            </span>
        }
        </> :
      item?.status === 'uploading' ?
      <>
          <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemoveUploading(item.id)}
          className={cx(styles.r_da4dbfbc, styles.r_68d3fc19, styles.r_c55dcda2, styles.r_145745bf, styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_db1c7bcb, styles.r_d058ca6d, styles.r_72a4c7cd)}
          title="取消上传">

            x
          </button>
          <div className={cx(styles.r_d89972fe, styles.r_236812d6, styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_72a4c7cd)}>
            <div className={cx(styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_afbdd13a, styles.r_ac204c10, styles.r_65935df5, styles.r_9c15994f, styles.r_9fd93a7d)} />
            <span className={styles.r_1dc571a3}>上传中</span>
          </div>
        </> :
      item?.status === 'uploaded' ?
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onRemoveUploading(item.id)}
        className={cx(styles.r_da4dbfbc, styles.r_68d3fc19, styles.r_c55dcda2, styles.r_145745bf, styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_db1c7bcb, styles.r_d058ca6d, styles.r_72a4c7cd)}
        title="移除">

          x
        </button> :
      item ?
      <div className={cx(styles.r_d89972fe, styles.r_236812d6, styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_9db85c5e, styles.r_d5eab218, styles.r_660d2eff, styles.r_72a4c7cd)}>
          <span className={styles.r_1dc571a3}>失败</span>
          <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => void onRetryUpload(item)}
          className={cx(styles.r_1dc571a3, styles.r_c82b67c8)}>

            重试
          </button>
          <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemoveUploading(item.id)}
          className={cx(styles.r_1dc571a3, styles.r_c82b67c8)}>

            移除
          </button>
        </div> :
      null}
    </div>);

}