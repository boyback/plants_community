'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api } from "@/lib/client-api";
import { timeAgo } from '@/lib/utils';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



interface AlbumItem {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  imageCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  images: string[];
}

export default function ShaiTuPage() {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadAlbums(1);
  }, []);

  const loadAlbums = async (p: number) => {
    setLoading(true);
    try {
      const data = await api.get<{
        items: AlbumItem[];
        totalPages: number;
      }>(`/api/albums?page=${p}&limit=20`);

      if (p === 1) {
        setAlbums(data.items);
      } else {
        setAlbums((prev) => [...prev, ...data.items]);
      }
      setTotalPages(data.totalPages);
      setPage(p);
    } catch {









      // ignore
    } finally {setLoading(false);}};return <Shell withSidebar={false}>
      <div className={cx(styles.r_1d4402df, styles.r_0e12dc7d)}>
        {/* 头部 */}
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_b6777c6d)}>
          <div>
            <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)}>📷 晒图广场</h1>
            <p className={cx(styles.r_fc7473ca, styles.r_7b89cd85, styles.r_b6b02c0e)}>分享你的多肉植物美图</p>
          </div>
          {user && <Link href="/album/new" className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>

              <Icon name="plus" size={16} />
              创建相册
            </Link>
        }
        </div>

        {/* 相册列表 */}
        {loading && albums.length === 0 ?
      <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_0c3bc985, styles.r_ab1b20c2, styles.r_d59f314f, styles.r_76125f2c)}>
            {Array.from({ length: 10 }).map((_, i) =>
        <div key={i} className={cx(styles.r_d59b9794, styles.r_2cd02d11)}>
                <div className={cx(styles.r_b59cd297, styles.r_f2b23104)} />
                <div className={cx(styles.r_eb6e8b88, styles.r_6f7e013d)}>
                  <div className={cx(styles.r_11e59c6d, styles.r_1d9f2d98, styles.r_07389a77, styles.r_f2b23104)} />
                  <div className={cx(styles.r_6a60c09e, styles.r_b7ce0d2f, styles.r_07389a77, styles.r_f2b23104)} />
                </div>
              </div>
        )}
          </div> :
      albums.length === 0 ?
      <div className={cx(styles.r_02cafd38, styles.r_ca6bf630)}>
            <div className={cx(styles.r_a95699d9, styles.r_1bb88326)}>📷</div>
            <div className={cx(styles.r_42536e69, styles.r_2689f395, styles.r_399e11a5, styles.r_a77ed4d9)}>还没有相册</div>
            <p className={cx(styles.r_fc7473ca, styles.r_7b89cd85, styles.r_da019856)}>成为第一个分享美图的人吧</p>
            {user &&
        <Link href="/album/new" className="btn-primary">
                创建相册
              </Link>
        }
          </div> :

      <>
            <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_0c3bc985, styles.r_ab1b20c2, styles.r_d59f314f, styles.r_76125f2c)}>
              {albums.map((album) =>
          <AlbumCard key={album.id} album={album} />
          )}
            </div>

            {/* 加载更多 */}
            {page < totalPages &&
        <div className={cx(styles.r_4e5d2af5, styles.r_ca6bf630)}>
                <button
            type="button"
            onClick={() => loadAlbums(page + 1)}
            disabled={loading}
            className="btn-outline">

                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
        }
          </>
      }
      </div>
    </Shell>;

}

function AlbumCard({ album }: {album: AlbumItem;}) {
  return (
    <Link
      href={`/album/${album.id}`}
      className={cx(styles.r_64292b1c, styles.r_2cd02d11)}>

      {/* 封面 */}
      <div className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_7ebecbb6)}>
        {album.cover ?
        <Image
          src={album.cover}
          alt={album.title}
          fill
          className={cx(styles.r_7d85d0c2, styles.r_eadef238, styles.r_1a9195e1)}
          unoptimized /> :


        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_668b21aa, styles.r_a95699d9, styles.r_e55bc853)}>
            📷
          </div>
        }
        {/* 图片数量 */}
        <div className={cx(styles.r_da4dbfbc, styles.r_f6babb33, styles.r_7b2d6393, styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_53bb3a28, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_72a4c7cd, styles.r_1ca6dd1e)}>
          <Icon name="image" size={12} />
          {album.imageCount}
        </div>
      </div>

      {/* 信息 */}
      <div className={styles.r_eb6e8b88}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a77ed4d9)}>
          <Avatar src={album.user.avatar} alt={album.user.name} size={24} />
          <span className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f, styles.r_f283ea9b)}>
            {album.user.name}
          </span>
        </div>
        <h3 className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5, styles.r_f50e2015, styles.r_65281709)}>
          {album.title}
        </h3>
        {album.description &&
        <p className={cx(styles.r_d058ca6d, styles.r_7b89cd85, styles.r_054cb4e3, styles.r_a77ed4d9)}>
            {album.description}
          </p>
        }
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_1dc571a3, styles.r_66a36c90)}>
          <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="eye" size={12} />
            {album.viewCount}
          </span>
          <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="heart" size={12} />
            {album.likeCount}
          </span>
          <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="comment" size={12} />
            {album.commentCount}
          </span>
        </div>
      </div>
    </Link>);

}