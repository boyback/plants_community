'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/client-api';
import { timeAgo } from '@/lib/utils';

interface AlbumDetail {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  imageCount: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  images: {
    id: string;
    url: string;
    caption: string | null;
    orderIdx: number;
  }[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
}

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadAlbum();
    loadComments();
    if (user) checkLiked();
  }, [id, user]);

  const loadAlbum = async () => {
    try {
      const data = await api.get<AlbumDetail>(`/api/albums/${id}`);
      setAlbum(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data = await api.get<{ items: Comment[] }>(`/api/albums/${id}/comments`);
      setComments(data.items || []);
    } catch {
      // ignore
    }
  };

  const checkLiked = async () => {
    try {
      const data = await api.get<{ liked: boolean }>(`/api/albums/${id}/like`);
      setLiked(data.liked);
    } catch {
      // ignore
    }
  };

  const handleLike = async () => {
    if (!user) return;
    try {
      const data = await api.post<{ liked: boolean }>(`/api/albums/${id}/like`);
      setLiked(data.liked);
      setAlbum((prev) =>
        prev
          ? {
              ...prev,
              likeCount: data.liked ? prev.likeCount + 1 : prev.likeCount - 1,
            }
          : prev
      );
    } catch {
      // ignore
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;
    try {
      const comment = await api.post<Comment>(`/api/albums/${id}/comments`, {
        content: commentText.trim(),
      });
      setComments((prev) => [comment, ...prev]);
      setCommentText('');
      setAlbum((prev) =>
        prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev
      );
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="max-w-4xl mx-auto">
          <div className="card animate-pulse">
            <div className="aspect-video bg-leaf-100 rounded-t-xl" />
            <div className="p-6 space-y-4">
              <div className="h-6 w-1/2 rounded bg-leaf-100" />
              <div className="h-4 w-3/4 rounded bg-leaf-100" />
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (!album) {
    return (
      <Shell>
        <div className="max-w-4xl mx-auto">
          <div className="card py-16 text-center">
            <div className="text-4xl mb-3">😕</div>
            <div className="text-lg font-medium text-ink-800 mb-2">相册不存在</div>
            <Link href="/shaitu" className="text-leaf-600 hover:underline">
              返回晒图广场
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-4xl mx-auto">
        {/* 返回链接 */}
        <Link
          href="/shaitu"
          className="inline-flex items-center gap-1 text-sm text-leaf-600 hover:text-leaf-700 mb-4"
        >
          ← 返回晒图广场
        </Link>

        {/* 相册信息 */}
        <div className="card overflow-hidden mb-6">
          {/* 图片网格 */}
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
            {album.images.slice(0, 8).map((img, i) => (
              <div
                key={img.id}
                className="relative aspect-square bg-leaf-50 cursor-pointer"
                onClick={() => setSelectedImage(img.url)}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  className="object-cover hover:opacity-90 transition-opacity"
                  unoptimized
                />
                {i === 7 && album.images.length > 8 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-bold text-lg">
                    +{album.images.length - 8}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 相册详情 */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Link href={`/user/${album.user.id}`}>
                  <Avatar
                    src={album.user.avatar}
                    alt={album.user.name}
                    size={48}
                  />
                </Link>
                <div>
                  <Link
                    href={`/user/${album.user.id}`}
                    className="font-medium text-ink-800 hover:text-leaf-700"
                  >
                    {album.user.name}
                  </Link>
                  <div className="text-xs text-ink-500">
                    {new Date(album.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLike}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors ${
                    liked
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-leaf-50 text-ink-600 hover:bg-leaf-100'
                  }`}
                >
                  <Icon name="heart" size={16} fill={liked ? 'currentColor' : 'none'} />
                  {album.likeCount}
                </button>
              </div>
            </div>

            <h1 className="text-xl font-bold text-ink-800 mb-2">
              {album.title}
            </h1>
            {album.description && (
              <p className="text-sm text-ink-600 mb-4">{album.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-ink-500">
              <span className="flex items-center gap-1">
                <Icon name="image" size={16} />
                {album.imageCount} 张图片
              </span>
              <span className="flex items-center gap-1">
                <Icon name="eye" size={16} />
                {album.viewCount} 次浏览
              </span>
              <span className="flex items-center gap-1">
                <Icon name="heart" size={16} />
                {album.likeCount} 次点赞
              </span>
              <span className="flex items-center gap-1">
                <Icon name="comment" size={16} />
                {album.commentCount} 条评论
              </span>
            </div>
          </div>
        </div>

        {/* 评论区 */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink-800 mb-4">
            评论 ({album.commentCount})
          </h2>

          {/* 发表评论 */}
          {user && (
            <div className="flex gap-3 mb-6">
              <Avatar src={user.avatar} alt={user.name} size={36} />
              <div className="flex-1">
                <textarea
                  className="input min-h-[80px]"
                  placeholder="写下你的评论..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={500}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleComment}
                    disabled={!commentText.trim()}
                    className="btn-primary text-sm"
                  >
                    发表评论
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 评论列表 */}
          {comments.length === 0 ? (
            <div className="text-center py-8 text-ink-500">
              还没有评论，快来发表第一条评论吧
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Link href={`/user/${comment.user.id}`}>
                    <Avatar
                      src={comment.user.avatar}
                      alt={comment.user.name}
                      size={36}
                    />
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/user/${comment.user.id}`}
                        className="text-sm font-medium text-ink-800 hover:text-leaf-700"
                      >
                        {comment.user.name}
                      </Link>
                      <span className="text-xs text-ink-400">
                        {timeAgo(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-ink-600">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 图片预览模态框 */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Image
              src={selectedImage}
              alt=""
              width={1200}
              height={800}
              className="object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
    </Shell>
  );
}
