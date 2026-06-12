'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import styles from './AlbumImagePickerDialog.module.scss';
import { cx } from '@/lib/style-utils';



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
  onConfirm
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
      const data = await api.get<{items: AlbumItem[];}>('/api/albums/mine');
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
          <button type="button" className={cx(styles.r_36e579c0, styles.r_86843cf1)} onClick={onClose}>
            取消
          </button>
          <button
          type="button"
          className={cx(styles.r_36e579c0, styles.r_86843cf1)}
          disabled={selectedUrls.length === 0}
          onClick={() => {
            onConfirm(selectedUrls);
            onClose();
          }}>

            {mode === 'cover' ? '设为封面' : `插入 ${selectedUrls.length} 张`}
          </button>
        </>
      }>

      <div className={cx(styles.r_f3c543ad, styles.r_afc45e21, styles.r_0c3bc985, styles.r_be080d6f)}>
        <aside className={cx(styles.r_fb7302e5, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_efb55408, styles.r_7660b450)}>
          <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_d8e0e382, styles.r_359090c2, styles.r_e83a7042, styles.r_eb6abb1f)}>
            <span>我的相册</span>
            <span className={styles.r_66a36c90}>{albums.length}</span>
          </div>
          <div className={cx(styles.r_d6c1b980, styles.r_da7c36cd, styles.r_92bf82f4, styles.r_eda95540)}>
            {albums.map((album) =>
            <button
              key={album.id}
              type="button"
              onClick={() => setActiveAlbumId(album.id)}
              className={cn(cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_d5eab218, styles.r_03b4dd7f, styles.r_2eba0d65, styles.r_56bf8ae8),

              activeAlbum?.id === album.id ? cx(styles.r_5e10cdb8, styles.r_e7eab4cb, styles.r_438b2237) : cx(styles.r_02eb621e, styles.r_78541963)
              )}>

                <span className={cx(styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_012fbd12, styles.r_67d66567, styles.r_2cd02d11, styles.r_421ac2be, styles.r_5e10cdb8)}>
                  {album.cover ?
                // eslint-disable-next-line @next/next/no-img-element
                <img src={album.cover} alt="" className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)} /> :

                <Icon name="image" size={15} className={styles.r_eb16169c} />
                }
                </span>
                <span className={styles.r_7e0b7cdf}>
                  <span className={cx(styles.r_0214b4b3, styles.r_f283ea9b, styles.r_fc7473ca, styles.r_e83a7042)}>{album.title}</span>
                  <span className={cx(styles.r_0214b4b3, styles.r_359090c2, styles.r_66a36c90)}>{album.imageCount} 张</span>
                </span>
              </button>
            )}
            {!loading && albums.length === 0 &&
            <div className={cx(styles.r_d5eab218, styles.r_1100bef6, styles.r_ca6bf630, styles.r_359090c2, styles.r_66a36c90)}>还没有晒图相册</div>
            }
          </div>
        </aside>

        <section className={styles.r_7e0b7cdf}>
          <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索图片备注或 URL"
              wrapperClassName={cx(styles.r_cbc20887, styles.r_36e579c0)} />

            <div className={cx(styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_7b89cd85)}>
              只显示你自己的晒图图片，帖子会保存图片 URL 快照
            </div>
          </div>

          <div className={cx(styles.r_d6c1b980, styles.r_92bf82f4, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_7660b450)}>
            {loading ?
            <div className={cx(styles.r_f3c543ad, styles.r_9ce7ff7a, styles.r_67d66567, styles.r_fc7473ca, styles.r_66a36c90)}>加载中...</div> :
            images.length > 0 ?
            <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_77a2a20e, styles.r_ab1b20c2, styles.r_4558bce6)}>
                {images.map((image) => {
                const selected = selectedUrls.includes(image.url);
                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => toggleUrl(image.url)}
                    className={cn(cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_b59cd297, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ebecbb6, styles.r_2eba0d65, styles.r_df37b1fd, styles.r_56bf8ae8),

                    selected ? cx(styles.r_d3b27cd9, styles.r_16b1efa5, styles.r_52c47100) : cx(styles.r_88b684d2, styles.r_a5c39c39)
                    )}>

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.caption ?? ''} className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)} />
                      <span
                      className={cn(cx(styles.r_da4dbfbc, styles.r_7b2d6393, styles.r_9a2db8f9, styles.r_f3c543ad, styles.r_f6fe9024, styles.r_7ec10f86, styles.r_67d66567, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_359090c2, styles.r_438b2237, styles.r_56bf8ae8),

                      selected ? cx(styles.r_d3b27cd9, styles.r_6bceb016, styles.r_72a4c7cd) : cx(styles.r_4c40914e, styles.r_ded46938, styles.r_72a4c7cd, styles.r_3b4e6d3a)


                      )}>

                        {selected ? <Icon name="check" size={13} /> : null}
                      </span>
                    </button>);

              })}
              </div> :

            <div className={cx(styles.r_f3c543ad, styles.r_9ce7ff7a, styles.r_67d66567, styles.r_fc7473ca, styles.r_66a36c90)}>当前相册没有可选图片</div>
            }
          </div>
        </section>
      </div>
    </Dialog>);

}