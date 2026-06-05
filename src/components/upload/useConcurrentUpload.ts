'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { uploadFileWithProgress } from '@/lib/upload-client';

export interface ConcurrentUploadingItem {
  id: string;
  file: File;
  localUrl: string;
  url?: string;
  abortController: AbortController;
  progress: number;
  status: 'uploading' | 'uploaded' | 'error';
  error?: string;
}

interface UseConcurrentUploadOptions {
  value: string[];
  onChange: (next: string[]) => void;
  max: number;
  validateFile: (file: File) => string | null;
  onUploaded?: (urls: string[]) => void;
  onUploadedItem?: (id: string, url: string) => void;
}

function createUploadId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useConcurrentUpload({
  value,
  onChange,
  max,
  validateFile,
  onUploaded,
  onUploadedItem,
}: UseConcurrentUploadOptions) {
  const valueRef = useRef(value);
  const uploadingItemsRef = useRef<ConcurrentUploadingItem[]>([]);
  const [uploadingItems, setUploadingItems] = useState<ConcurrentUploadingItem[]>([]);

  const isUploading = uploadingItems.some((item) => item.status === 'uploading');
  const remainingCount = Math.max(0, max - value.length - uploadingItems.length);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    uploadingItemsRef.current = uploadingItems;
  }, [uploadingItems]);

  useEffect(() => {
    return () => {
      uploadingItemsRef.current.forEach((item) => {
        item.abortController.abort();
        URL.revokeObjectURL(item.localUrl);
      });
    };
  }, []);

  const removeUploadingItem = useCallback((id: string) => {
    setUploadingItems((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item) {
        item.abortController.abort();
        URL.revokeObjectURL(item.localUrl);
      }
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const reorderUploadingItems = useCallback((orderedIds: string[]) => {
    setUploadingItems((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item]));
      const ordered = orderedIds
        .map((id) => byId.get(id))
        .filter((item): item is ConcurrentUploadingItem => Boolean(item));
      const orderedSet = new Set(orderedIds);
      const rest = prev.filter((item) => !orderedSet.has(item.id));
      return [...ordered, ...rest];
    });
  }, []);

  const uploadItem = useCallback(async (item: ConcurrentUploadingItem) => {
    try {
      const result = await uploadFileWithProgress(
        item.file,
        (progress) => {
          setUploadingItems((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, progress } : x)),
          );
        },
        item.abortController.signal,
      );
      if (item.abortController.signal.aborted) return null;
      setUploadingItems((prev) =>
        prev.map((x) =>
          x.id === item.id ? { ...x, status: 'uploaded', progress: 100, url: result.url } : x,
        ),
      );
      return { id: item.id, url: result.url };
    } catch (error: any) {
      if (item.abortController.signal.aborted) return null;
      const message = error?.message || '上传失败';
      toast.error(message);
      setUploadingItems((prev) =>
        prev.map((x) =>
          x.id === item.id ? { ...x, status: 'error', error: message } : x,
        ),
      );
      return null;
    }
  }, []);

  const applyUploadedUrls = useCallback(
    (urls: string[]) => {
      if (urls.length === 0) return;
      if (onUploaded) {
        onUploaded(urls);
        return;
      }
      const next = [...valueRef.current, ...urls].slice(0, max);
      valueRef.current = next;
      onChange(next);
    },
    [max, onChange, onUploaded],
  );

  const retryUpload = useCallback(
    async (item: ConcurrentUploadingItem) => {
      const abortController = new AbortController();
      const retryItem = {
        ...item,
        abortController,
        progress: 0,
        status: 'uploading' as const,
        error: undefined,
      };
      setUploadingItems((prev) => prev.map((x) => (x.id === item.id ? retryItem : x)));
      const result = await uploadItem(retryItem);
      if (result) {
        if (onUploadedItem) {
          onUploadedItem(result.id, result.url);
        } else {
          applyUploadedUrls([result.url]);
        }
        setUploadingItems((prev) => {
          const done = prev.find((x) => x.id === result.id);
          if (done) URL.revokeObjectURL(done.localUrl);
          return prev.filter((x) => x.id !== result.id);
        });
      }
    },
    [applyUploadedUrls, onUploadedItem, uploadItem],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const picked = Array.from(files);
      if (picked.length === 0) return;

      const available = Math.max(0, max - valueRef.current.length - uploadingItemsRef.current.length);
      if (available <= 0) {
        toast.error(`最多上传 ${max} 个文件`);
        return;
      }
      if (picked.length > available) {
        toast.error(`最多还能上传 ${available} 个文件`);
      }

      const items = picked.slice(0, available).flatMap((file) => {
        const validationError = validateFile(file);
        if (validationError) {
          toast.error(validationError);
          return [];
        }
        return [{
          id: createUploadId(),
          file,
          localUrl: URL.createObjectURL(file),
          abortController: new AbortController(),
          progress: 0,
          status: 'uploading' as const,
        }];
      });

      if (items.length === 0) return;
      setUploadingItems((prev) => [...prev, ...items]);

      const slots: Array<{ id: string; url?: string; done: boolean }> = items.map((item) => ({
        id: item.id,
        done: false,
      }));
      let flushedCount = 0;

      const flushReadySlots = () => {
        const urls: string[] = [];
        const ids: string[] = [];

        while (flushedCount < slots.length && slots[flushedCount].done) {
          const slot = slots[flushedCount];
          if (slot.url) {
            urls.push(slot.url);
            ids.push(slot.id);
          }
          flushedCount += 1;
        }

        applyUploadedUrls(urls);
        if (ids.length > 0) {
          const uploadedIds = new Set(ids);
          setUploadingItems((prev) => {
            prev.forEach((item) => {
              if (uploadedIds.has(item.id)) URL.revokeObjectURL(item.localUrl);
            });
            return prev.filter((item) => !uploadedIds.has(item.id));
          });
        }
      };

      await Promise.all(
        items.map(async (item, index) => {
          const result = await uploadItem(item);
          slots[index] = {
            id: item.id,
            done: true,
            url: result?.url,
          };
          if (onUploadedItem && result) {
            onUploadedItem(result.id, result.url);
            setUploadingItems((prev) => {
              const done = prev.find((x) => x.id === result.id);
              if (done) URL.revokeObjectURL(done.localUrl);
              return prev.filter((x) => x.id !== result.id);
            });
          } else {
            flushReadySlots();
          }
        }),
      );
    },
    [applyUploadedUrls, max, onUploadedItem, uploadItem, validateFile],
  );

  return {
    uploadingItems,
    remainingCount,
    isUploading,
    handleFiles,
    retryUpload,
    removeUploadingItem,
    reorderUploadingItems,
  };
}
