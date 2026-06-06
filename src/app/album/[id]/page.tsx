'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';
import { Shell } from '@/components/layout/Shell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { PlainCommentComposer } from '@/components/post/PlainCommentComposer';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/client-api';
import { registerPhotoSwipeGalleryUi } from '@/lib/photoswipe-ui';
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
  images?: string[];
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
}

interface ImageSize {
  width: number;
  height: number;
}

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageSizes, setImageSizes] = useState<Record<string, ImageSize>>({});
  const pswpRef = useRef<PhotoSwipe | null>(null);

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

  const handleImageLoad = useCallback(
    (src: string, event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        setImageSizes((prev) => ({
          ...prev,
          [src]: { width: img.naturalWidth, height: img.naturalHeight },
        }));
      }
    },
    [],
  );

  const slides = useMemo(
    () =>
      (album?.images ?? []).map((img) => {
        const size = imageSizes[img.url] || { width: 1600, height: 1066 };
        return {
          src: img.url,
          msrc: img.url,
          thumbnail: img.url,
          width: size.width,
          height: size.height,
        };
      }),
    [album?.images, imageSizes],
  );

  const openPhotoSwipe = useCallback(
    (index: number) => {
      if (!slides.length) return;
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
    [slides],
  );

  useEffect(() => {
    return () => {
      pswpRef.current?.destroy();
    };
  }, []);

  if (loading) {
    return (
      <Shell withSidebar={false}>
        <div className="max-w-4xl mx-auto">
          <div className="card animate-pulse overflow-hidden">
            <div className="aspect-video bg-leaf-100" />
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
      <Shell withSidebar={false}>
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
    <Shell withSidebar={false}>
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
              <button
                key={img.id}
                type="button"
                className="relative aspect-square cursor-zoom-in bg-leaf-50"
                onClick={() => openPhotoSwipe(i)}
                aria-label={`预览图片 ${i + 1}`}
              >
                <Image
                  src={img.url}
                  alt={img.caption || ''}
                  fill
                  className="object-cover transition-opacity hover:opacity-90"
                  unoptimized
                  onLoad={(event) => handleImageLoad(img.url, event)}
                />
                {i === 7 && album.images.length > 8 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-bold text-white">
                    +{album.images.length - 8}
                  </div>
                )}
              </button>
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

        <AlbumCommentSection
          albumId={album.id}
          comments={comments}
          count={album.commentCount}
          onCommentAdded={(comment) => {
            setComments((prev) => [comment, ...prev]);
            setAlbum((prev) =>
              prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev
            );
          }}
        />
      </div>
    </Shell>
  );
}

function AlbumCommentSection({
  albumId,
  comments,
  count,
  onCommentAdded,
}: {
  albumId: string;
  comments: Comment[];
  count: number;
  onCommentAdded: (comment: Comment) => void;
}) {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const list = [...comments];
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [comments]);

  const submit = async () => {
    const text = commentText.trim();
    if (!user || (!text && commentImages.length === 0)) return;
    setSubmitting(true);
    setErr(null);
    try {
      const comment = await api.post<Comment>(`/api/albums/${albumId}/comments`, {
        content: text,
        images: commentImages,
      });
      onCommentAdded(comment);
      setCommentText('');
      setCommentImages([]);
    } catch {
      setErr('评论发送失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="comments" className="scroll-mt-20 overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm">
      <div className="border-b border-leaf-100 bg-leaf-50/30 p-5">
        {user ? (
          <div className="flex gap-3">
            <Avatar src={user.avatar} alt={user.name} size={42} />
            <PlainCommentComposer
              title="评论"
              value={commentText}
              onChange={setCommentText}
              images={commentImages}
              onImagesChange={setCommentImages}
              onSubmit={submit}
              placeholder="写下你的想法..."
              submitLabel="发送"
              submitting={submitting}
              error={err}
              maxLength={500}
              minHeight={112}
              className="min-w-0 flex-1"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm">
            <span className="text-leaf-700">登录后参与评论</span>
            <Link href="/login" className="btn-primary h-8 !px-3 !text-xs">
              登录
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-b border-leaf-100 px-5 py-4">
        <div className="text-base font-bold text-ink-950">
          全部评论 <span className="ml-1 text-leaf-700/70">({count})</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-leaf-50 p-1 text-xs">
          <span className="rounded-full bg-white px-3 py-1 font-medium text-leaf-800 shadow-sm">
            最新
          </span>
        </div>
      </div>

      <div className="divide-y divide-leaf-100">
        {sorted.length === 0 ? (
          <div className="p-8">
            <Empty title="还没有评论" desc="来写下第一条想法吧。" />
          </div>
        ) : (
          sorted.map((comment, index) => (
            <article key={comment.id} className="p-5">
              <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
                <aside className="rounded-xl bg-leaf-50/70 px-3 py-3 text-center">
                  <Link href={`/user/${comment.user.id}`} className="inline-flex">
                    <Avatar src={comment.user.avatar} alt={comment.user.name} size={54} />
                  </Link>
                  <Link
                    href={`/user/${comment.user.id}`}
                    className="mt-2 block truncate text-sm font-semibold text-ink-900 hover:text-leaf-800"
                    title={comment.user.name}
                  >
                    {comment.user.name}
                  </Link>
                </aside>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[13px] text-leaf-700/60">
                    <span className="mr-1 font-semibold text-leaf-800">#{index + 1} 楼</span>
                    <span>{timeAgo(comment.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink-700">
                    {comment.content}
                  </p>
                  {comment.images && comment.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {comment.images.map((url, imageIndex) => (
                        <div
                          key={`${comment.id}-${url}-${imageIndex}`}
                          className="relative aspect-square overflow-hidden rounded-[6px] bg-leaf-50"
                        >
                          <Image
                            src={url}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
