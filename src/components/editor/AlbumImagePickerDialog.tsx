'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type AlbumImage = {
  id: string;
  url: string;
  caption?: string | null;
  orderIdx: number;
};

type AlbumItem = {
  id: string;
  title: string;
  description?: string | null;
  cover?: string | null;
  isPublic: boolean;
  imageCount: number;
  images: AlbumImage[];
};

type PickerMode = 'insert' | 'cover';

interface AlbumImagePickerDialogProps {
  open: boolean;
  mode: PickerMode;
  onClose: () => void;
  onConfirm: (urls: string[]) => void;
}

export function AlbumImagePickerDialog({
  open,
  mode,
  onClose,
  onConfirm,
}: AlbumImagePickerDialogProps) {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState('');
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedUrls([]);
    setKeyword('');
    void loadAlbums();
  }, [open]);

  const loadAlbums = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: AlbumItem[] }>('/api/albums/mine');
      setAlbums(data.items);
      setActiveAlbumId((current) => current || data.items[0]?.id || '');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '读取晒图相册失败');
    } finally {
      setLoading(false);
    }
  };

  const activeAlbum = albums.find((album) => album.id === activeAlbumId) ?? albums[0];
  const images = useMemo(() => {
    const source = activeAlbum?.images ?? [];
    const query = keyword.trim().toLowerCase();
    if (!query) return source;
    return source.filter((image) => `${image.caption ?? ''} ${image.url}`.toLowerCase().includes(query));
  }, [activeAlbum?.images, keyword]);

  const toggleUrl = (url: string) => {
    setSelectedUrls((current) => {
      if (mode === 'cover') return current[0] === url ? [] : [url];
      return current.includes(url) ? current.filter((item) => item !== url) : [...current, url];
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === 'cover' ? '从我的晒图选择封面' : '从我的晒图选择图片'}
      maxWidth="xl"
      actions={
        <>
          <button type="button" className="btn-outline flex-1 justify-center" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="btn-primary flex-1 justify-center"
            disabled={selectedUrls.length === 0}
            onClick={() => {
              onConfirm(selectedUrls);
              onClose();
            }}
          >
            {mode === 'cover' ? '设为封面' : `插入 ${selectedUrls.length} 张`}
          </button>
        </>
      }
    >
      <div className="grid min-h-[420px] gap-4 md:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="min-h-0 rounded-lg border border-leaf-100 bg-leaf-50/40 p-2">
          <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-ink-700">
            <span>我的相册</span>
            <span className="text-ink-400">{albums.length}</span>
          </div>
          <div className="max-h-[360px] space-y-1 overflow-y-auto pr-1">
            {albums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => setActiveAlbumId(album.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition',
                  activeAlbum?.id === album.id ? 'bg-white text-leaf-800 shadow-sm' : 'text-ink-600 hover:bg-white/70',
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-white">
                  {album.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={album.cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon name="image" size={15} className="text-leaf-500" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{album.title}</span>
                  <span className="block text-xs text-ink-400">{album.imageCount} 张</span>
                </span>
              </button>
            ))}
            {!loading && albums.length === 0 && (
              <div className="px-2 py-10 text-center text-xs text-ink-400">还没有晒图相册</div>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索图片备注或 URL"
              wrapperClassName="min-w-[220px] flex-1"
            />
            <div className="rounded-lg bg-leaf-50 px-3 py-2 text-xs text-ink-500">
              只显示你自己的晒图图片，帖子会保存图片 URL 快照
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto rounded-lg border border-leaf-100 p-2">
            {loading ? (
              <div className="grid h-52 place-items-center text-sm text-ink-400">加载中...</div>
            ) : images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((image) => {
                  const selected = selectedUrls.includes(image.url);
                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => toggleUrl(image.url)}
                      className={cn(
                        'group relative aspect-square overflow-hidden rounded-lg border bg-leaf-50 text-left outline-none transition',
                        selected ? 'border-leaf-500 ring-2 ring-leaf-100' : 'border-leaf-100 hover:border-leaf-300',
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.caption ?? ''} className="h-full w-full object-cover" />
                      <span
                        className={cn(
                          'absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full border text-xs shadow-sm transition',
                          selected
                            ? 'border-leaf-500 bg-leaf-600 text-white'
                            : 'border-white/80 bg-black/25 text-white group-hover:bg-leaf-600',
                        )}
                      >
                        {selected ? <Icon name="check" size={13} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid h-52 place-items-center text-sm text-ink-400">当前相册没有可选图片</div>
            )}
          </div>
        </section>
      </div>
    </Dialog>
  );
}
