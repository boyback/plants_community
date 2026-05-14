'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/client-api';
import { timeAgo } from '@/lib/utils';

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink-800">📷 晒图广场</h1>
            <p className="text-sm text-ink-500 mt-1">分享你的多肉植物美图</p>
          </div>
          {user && (
            <Link
              href="/album/new"
              className="btn-primary flex items-center gap-2"
            >
              <Icon name="plus" size={16} />
              创建相册
            </Link>
          )}
        </div>

        {/* 相册列表 */}
        {loading && albums.length === 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-leaf-100 rounded-t-xl" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-leaf-100" />
                  <div className="h-3 w-1/2 rounded bg-leaf-100" />
                </div>
              </div>
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="card py-16 text-center">
            <div className="text-4xl mb-3">📷</div>
            <div className="text-lg font-medium text-ink-800 mb-2">还没有相册</div>
            <p className="text-sm text-ink-500 mb-4">成为第一个分享美图的人吧</p>
            {user && (
              <Link href="/album/new" className="btn-primary">
                创建相册
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>

            {/* 加载更多 */}
            {page < totalPages && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => loadAlbums(page + 1)}
                  disabled={loading}
                  className="btn-outline"
                >
                  {loading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

function AlbumCard({ album }: { album: AlbumItem }) {
  return (
    <Link
      href={`/album/${album.id}`}
      className="card card-hoverable group overflow-hidden"
    >
      {/* 封面 */}
      <div className="relative aspect-square bg-leaf-50">
        {album.cover ? (
          <Image
            src={album.cover}
            alt={album.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl text-leaf-300">
            📷
          </div>
        )}
        {/* 图片数量 */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
          <Icon name="image" size={12} />
          {album.imageCount}
        </div>
      </div>

      {/* 信息 */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Avatar src={album.user.avatar} alt={album.user.name} size={24} />
          <span className="text-xs font-medium text-ink-700 truncate">
            {album.user.name}
          </span>
        </div>
        <h3 className="text-sm font-medium text-ink-800 line-clamp-1 mb-1">
          {album.title}
        </h3>
        {album.description && (
          <p className="text-[11px] text-ink-500 line-clamp-2 mb-2">
            {album.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-[10px] text-ink-400">
          <span className="flex items-center gap-1">
            <Icon name="eye" size={12} />
            {album.viewCount}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="heart" size={12} />
            {album.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="comment" size={12} />
            {album.commentCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
