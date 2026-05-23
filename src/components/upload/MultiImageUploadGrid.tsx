'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useConcurrentUpload } from './useConcurrentUpload';
import type { ConcurrentUploadingItem } from './useConcurrentUpload';

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
  | { type: 'uploaded'; key: string; url: string }
  | { type: 'uploading'; key: string; id: string };

const uploadedKey = (url: string) => `uploaded:${url}`;
const uploadingKey = (id: string) => `uploading:${id}`;
const keyToUploadedUrl = (key: string) => key.slice('uploaded:'.length);

export const MultiImageUploadGrid = forwardRef<MultiImageUploadGridHandle, Props>(function MultiImageUploadGrid({
  value,
  onChange,
  max = 50,
  maxFileSizeMb = 10,
  onUploadingChange,
  className,
  gridClassName,
  tileClassName = 'h-[90px] w-[90px]',
  tileImageClassName,
  addTileClassName,
  firstItemLabel,
  squareTiles = false,
  hideAddButton = false,
  showAddWhileUploading = false,
  squareAddButton = false,
  showCount = true,
  helpText,
  helpTextClassName,
}, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const orderKeysRef = useRef<string[]>([]);
  const [orderKeys, setOrderKeys] = useState<string[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const applyOrderedKeys = useCallback(
    (nextKeys: string[]) => {
      orderKeysRef.current = nextKeys;
      setOrderKeys(nextKeys);

      const nextValue = nextKeys
        .filter((key) => key.startsWith('uploaded:'))
        .map(keyToUploadedUrl);
      if (
        nextValue.length !== valueRef.current.length ||
        nextValue.some((url, index) => url !== valueRef.current[index])
      ) {
        valueRef.current = nextValue;
        onChange(nextValue);
      }
    },
    [onChange],
  );

  const handleUploadedItem = useCallback(
    (id: string, url: string) => {
      const fromKey = uploadingKey(id);
      const toKey = uploadedKey(url);
      const current = orderKeysRef.current;
      const next = current.includes(fromKey)
        ? current.map((key) => (key === fromKey ? toKey : key))
        : [...current, toKey];
      applyOrderedKeys(next);
    },
    [applyOrderedKeys],
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
    reorderUploadingItems,
  } = useConcurrentUpload({
    value,
    onChange,
    max,
    validateFile,
    onUploadedItem: handleUploadedItem,
  });

  useEffect(() => {
    const currentKeys = [
      ...value.map(uploadedKey),
      ...uploadingItems.map((item) => uploadingKey(item.id)),
    ];
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
    },
  }), [remainingCount]);

  const entries = useMemo<GridEntry[]>(() => {
    const uploadingById = new Map(uploadingItems.map((item) => [item.id, item]));
    const currentValue = valueRef.current;
    return orderKeys.reduce<GridEntry[]>((result, key) => {
      if (key.startsWith('uploaded:')) {
        const url = keyToUploadedUrl(key);
        if (currentValue.includes(url)) result.push({ type: 'uploaded', key, url });
        return result;
      }
      if (key.startsWith('uploading:')) {
        const id = key.slice('uploading:'.length);
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
        nextKeys
          .filter((key) => key.startsWith('uploading:'))
          .map((key) => key.slice('uploading:'.length)),
      );
    },
    [applyOrderedKeys, reorderUploadingItems],
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
    [applyDragOrder],
  );

  const handleRemoveUploaded = useCallback(
    (url: string) => {
      const next = valueRef.current.filter((item) => item !== url);
      valueRef.current = next;
      onChange(next);
      applyOrderedKeys(orderKeysRef.current.filter((key) => key !== uploadedKey(url)));
    },
    [applyOrderedKeys, onChange],
  );

  return (
    <div className={cn('space-y-2', className)}>
      {showCount && (
        <div className="text-right text-xs text-leaf-700/60">
          {value.length}/{max}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,.heic,.heif"
        className="hidden"
        disabled={remainingCount === 0}
        onChange={(event) => {
          const files = event.currentTarget.files;
          if (files) void handleFiles(files);
          event.currentTarget.value = '';
        }}
      />

      <div className={cn('grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5', gridClassName)}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={entries.map((entry) => entry.key)} strategy={rectSortingStrategy}>
            {entries.map((entry, index) => {
              const item = entry.type === 'uploading'
                ? uploadingItems.find((uploadingItem) => uploadingItem.id === entry.id)
                : null;
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
                />
              );
            })}
          </SortableContext>
        </DndContext>

        {!hideAddButton && remainingCount > 0 && (!isUploading || showAddWhileUploading) && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-1 border border-dashed border-leaf-200 bg-leaf-50/30 text-xs transition-colors hover:border-leaf-400 hover:bg-leaf-50/50',
              !squareTiles && !squareAddButton && 'rounded-md',
              tileClassName,
              addTileClassName,
            )}
          >
            <Icon name="plus" size={16} className="text-leaf-600" />
            <span className="text-[10px] text-leaf-700/70">图片</span>
          </button>
        )}
      </div>

      {helpText && (
        <div className={cn('space-y-0.5 text-center text-[11px] text-leaf-700/50', helpTextClassName)}>
          {helpText}
        </div>
      )}
    </div>
  );
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
}: SortableUploadTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative flex touch-none cursor-grab items-center justify-center overflow-hidden border bg-leaf-50/30 active:cursor-grabbing',
        entry.type === 'uploading' ? 'border-dashed border-leaf-200' : 'border-leaf-100',
        isDragging && 'z-30 opacity-60 shadow-lg',
        !squareTiles && 'rounded-md',
        tileClassName,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        draggable={false}
        className={cn(
          'absolute inset-0 h-full w-full object-cover',
          item?.status === 'uploading' ? 'opacity-40' : 'opacity-100',
          tileImageClassName,
        )}
      />
      {entry.type === 'uploaded' ? (
        <>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onRemoveUploaded(entry.url)}
            className="absolute right-1 top-1 z-20 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            title="移除"
          >
            x
          </button>
          {firstItemLabel && index === 0 && (
            <span className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
              {firstItemLabel}
            </span>
          )}
        </>
      ) : item?.status === 'uploading' ? (
        <>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onRemoveUploading(item.id)}
            className="absolute right-1 top-1 z-20 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white"
            title="取消上传"
          >
            x
          </button>
          <div className="relative z-10 flex flex-col items-center gap-1 text-white">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            <span className="text-[10px]">上传中</span>
          </div>
        </>
      ) : item?.status === 'uploaded' ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemoveUploading(item.id)}
          className="absolute right-1 top-1 z-20 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white"
          title="移除"
        >
          x
        </button>
      ) : item ? (
        <div className="relative z-10 flex flex-col items-center gap-1 bg-black/45 px-2 py-1 text-white">
          <span className="text-[10px]">失败</span>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => void onRetryUpload(item)}
            className="text-[10px] underline"
          >
            重试
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onRemoveUploading(item.id)}
            className="text-[10px] underline"
          >
            移除
          </button>
        </div>
      ) : null}
    </div>
  );
}
