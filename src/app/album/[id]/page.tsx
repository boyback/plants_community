'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import PhotoSwipe from 'photoswipe';
import { Shell } from '@/components/layout/Shell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { PlainCommentComposer } from '@/components/post/PlainCommentComposer';
import { useAuth } from '@/context/AuthContext';
import { api } from "@/lib/client-api";
import { registerPhotoSwipeGalleryUi } from "@/lib/photoswipe-ui";
import { timeAgo } from '@/lib/utils';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



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
  const { id } = useParams<{id: string;}>();
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
    } finally {setLoading(false);}};const loadComments = async () => {try {const data = await api.get<{items: Comment[];}>(`/api/albums/${id}/comments`);setComments(data.items || []);
    } catch {








      // ignore
    }};const checkLiked = async () => {try {const data = await api.get<{liked: boolean;}>(`/api/albums/${id}/like`);setLiked(data.liked);} catch {







      // ignore
    }};const handleLike = async () => {if (!user) return;try {const data = await api.post<{liked: boolean;}>(`/api/albums/${id}/like`);setLiked(data.liked);setAlbum((prev) =>
      prev ?
      {
        ...prev,
        likeCount: data.liked ? prev.likeCount + 1 : prev.likeCount - 1
      } :
      prev
      );
    } catch {








      // ignore
    }};const handleImageLoad = useCallback((src: string, event: React.SyntheticEvent<HTMLImageElement>) => {const img = event.currentTarget;if (img.naturalWidth && img.naturalHeight) {setImageSizes((prev) => ({ ...prev,
            [src]: { width: img.naturalWidth, height: img.naturalHeight }
          }));
      }
    },
    []
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
        height: size.height
      };
    }),
    [album?.images, imageSizes]
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
        closeOnVerticalDrag: false
      } as any);
      registerPhotoSwipeGalleryUi(pswpRef.current);
      pswpRef.current.init();
    },
    [slides]
  );

  useEffect(() => {
    return () => {
      pswpRef.current?.destroy();
    };
  }, []);

  if (loading) {
    return (
      <Shell withSidebar={false}>
        <div className={cx(styles.r_cf3893e3, styles.r_0e12dc7d)}>
          <div className={cx(styles.r_d59b9794, styles.r_2cd02d11)}>
            <div className={cx(styles.r_826c9471, styles.r_f2b23104)} />
            <div className={cx(styles.r_0478c89a, styles.r_3e7ce58d)}>
              <div className={cx(styles.r_f6fe9024, styles.r_b7ce0d2f, styles.r_07389a77, styles.r_f2b23104)} />
              <div className={cx(styles.r_11e59c6d, styles.r_1d9f2d98, styles.r_07389a77, styles.r_f2b23104)} />
            </div>
          </div>
        </div>
      </Shell>);

  }

  if (!album) {
    return (
      <Shell withSidebar={false}>
        <div className={cx(styles.r_cf3893e3, styles.r_0e12dc7d)}>
          <div className={cx(styles.r_02cafd38, styles.r_ca6bf630)}>
            <div className={cx(styles.r_a95699d9, styles.r_1bb88326)}>😕</div>
            <div className={cx(styles.r_42536e69, styles.r_2689f395, styles.r_399e11a5, styles.r_a77ed4d9)}>相册不存在</div>
            <Link href="/shaitu" className={cx(styles.r_b17d6a13, styles.r_f673f4a7)}>
              返回晒图广场
            </Link>
          </div>
        </div>
      </Shell>);

  }

  return (
    <Shell withSidebar={false}>
      <div className={cx(styles.r_cf3893e3, styles.r_0e12dc7d)}>
        {/* 返回链接 */}
        <Link
          href="/shaitu"
          className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_fc7473ca, styles.r_b17d6a13, styles.r_9825203a, styles.r_da019856)}>

          ← 返回晒图广场
        </Link>

        {/* 相册信息 */}
        <div className={cx(styles.r_2cd02d11, styles.r_b6777c6d)}>
          {/* 图片网格 */}
          <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_44ee8ba0, styles.r_898c0bcb)}>
            {album.images.slice(0, 8).map((img, i) =>
            <button
              key={img.id}
              type="button"
              className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_3bbc8c13, styles.r_7ebecbb6)}
              onClick={() => openPhotoSwipe(i)}
              aria-label={`预览图片 ${i + 1}`}>

                <Image
                src={img.url}
                alt={img.caption || ''}
                fill
                className={cx(styles.r_7d85d0c2, styles.r_67d6184a, styles.r_961c6c3a)}
                unoptimized
                onLoad={(event) => handleImageLoad(img.url, event)} />

                {i === 7 && album.images.length > 8 &&
              <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_53bb3a28, styles.r_42536e69, styles.r_69450ef1, styles.r_72a4c7cd)}>
                    +{album.images.length - 8}
                  </div>
              }
              </button>
            )}
          </div>

          {/* 相册详情 */}
          <div className={styles.r_0478c89a}>
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_da019856)}>
              <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3)}>
                <Link href={`/user/${album.user.id}`}>
                  <Avatar
                    src={album.user.avatar}
                    alt={album.user.name}
                    size={48} />

                </Link>
                <div>
                  <Link
                    href={`/user/${album.user.id}`}
                    className={cx(styles.r_2689f395, styles.r_399e11a5, styles.r_9825203a)}>

                    {album.user.name}
                  </Link>
                  <div className={cx(styles.r_359090c2, styles.r_7b89cd85)}>
                    {new Date(album.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                <button
                  type="button"
                  onClick={handleLike}
                  className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_ceb69a6b, `${
                  liked ? cx(styles.r_e0467cf5, styles.r_595fceba) : cx(styles.r_7ebecbb6, styles.r_02eb621e, styles.r_2efc423a)}`)


                  }>

                  <Icon name="heart" size={16} fill={liked ? 'currentColor' : 'none'} />
                  {album.likeCount}
                </button>
              </div>
            </div>

            <h1 className={cx(styles.r_d5c9b000, styles.r_69450ef1, styles.r_399e11a5, styles.r_a77ed4d9)}>
              {album.title}
            </h1>
            {album.description &&
            <p className={cx(styles.r_fc7473ca, styles.r_02eb621e, styles.r_da019856)}>{album.description}</p>
            }

            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_0c3bc985, styles.r_fc7473ca, styles.r_7b89cd85)}>
              <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
                <Icon name="image" size={16} />
                {album.imageCount} 张图片
              </span>
              <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
                <Icon name="eye" size={16} />
                {album.viewCount} 次浏览
              </span>
              <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
                <Icon name="heart" size={16} />
                {album.likeCount} 次点赞
              </span>
              <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
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
          }} />

      </div>
    </Shell>);

}

function AlbumCommentSection({
  albumId,
  comments,
  count,
  onCommentAdded





}: {albumId: string;comments: Comment[];count: number;onCommentAdded: (comment: Comment) => void;}) {
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
    if (!user || !text && commentImages.length === 0) return;
    setSubmitting(true);
    setErr(null);
    try {
      const comment = await api.post<Comment>(`/api/albums/${albumId}/comments`, {
        content: text,
        images: commentImages
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
    <div id="comments" className={cx(styles.r_8985588d, styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
      <div className={cx(styles.r_65fdbade, styles.r_88b684d2, styles.r_54720a96, styles.r_c07e54fd)}>
        {user ?
        <div className={cx(styles.r_60fbb771, styles.r_1004c0c3)}>
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
            className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)} />

          </div> :

        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_a217b4ea, styles.r_5e10cdb8, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca)}>
            <span className={styles.r_5f6a59f1}>登录后参与评论</span>
            <Link href="/login" className={cx(styles.r_ed8a5df7, styles.r_23b4e5ed, styles.r_dd702538)}>
              登录
            </Link>
          </div>
        }
      </div>

      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_65fdbade, styles.r_88b684d2, styles.r_d139dd09, styles.r_cb11fec3)}>
        <div className={cx(styles.r_4ee73492, styles.r_69450ef1, styles.r_6d623258)}>
          全部评论 <span className={cx(styles.r_f58b0257, styles.r_69335b95)}>({count})</span>
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_eb6a3cef, styles.r_359090c2)}>
          <span className={cx(styles.r_ac204c10, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_2689f395, styles.r_e7eab4cb, styles.r_438b2237)}>
            最新
          </span>
        </div>
      </div>

      <div className={cx(styles.r_fa6acbf8, styles.r_1790d566)}>
        {sorted.length === 0 ?
        <div className={styles.r_845f5336}>
            <Empty title="还没有评论" desc="来写下第一条想法吧。" />
          </div> :

        sorted.map((comment, index) =>
        <article key={comment.id} className={styles.r_c07e54fd}>
              <div className={cx(styles.r_f3c543ad, styles.r_0c3bc985, styles.r_b6142548)}>
                <aside className={cx(styles.r_a217b4ea, styles.r_52f53b18, styles.r_0e17f2bd, styles.r_1b2d54a3, styles.r_ca6bf630)}>
                  <Link href={`/user/${comment.user.id}`} className={styles.r_52083e7d}>
                    <Avatar src={comment.user.avatar} alt={comment.user.name} size={54} />
                  </Link>
                  <Link
                href={`/user/${comment.user.id}`}
                className={cx(styles.r_50d0d216, styles.r_0214b4b3, styles.r_f283ea9b, styles.r_fc7473ca, styles.r_e83a7042, styles.r_4ddaa618, styles.r_81be6435)}
                title={comment.user.name}>

                    {comment.user.name}
                  </Link>
                </aside>

                <div className={styles.r_7e0b7cdf}>
                  <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a14daebf, styles.r_6c4cc49e)}>
                    <span className={cx(styles.r_61816240, styles.r_e83a7042, styles.r_e7eab4cb)}>#{index + 1} 楼</span>
                    <span>{timeAgo(comment.createdAt)}</span>
                  </div>
                  <p className={cx(styles.r_50d0d216, styles.r_a2edcb1a, styles.r_fc7473ca, styles.r_7eff2faf, styles.r_eb6abb1f)}>
                    {comment.content}
                  </p>
                  {comment.images && comment.images.length > 0 &&
              <div className={cx(styles.r_eccd13ef, styles.r_f3c543ad, styles.r_be2e831b, styles.r_77a2a20e, styles.r_898c0bcb)}>
                      {comment.images.map((url, imageIndex) =>
                <div
                  key={`${comment.id}-${url}-${imageIndex}`}
                  className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_2cd02d11, styles.r_c10ff8c0, styles.r_7ebecbb6)}>

                          <Image
                    src={url}
                    alt=""
                    fill
                    className={styles.r_7d85d0c2}
                    unoptimized />

                        </div>
                )}
                    </div>
              }
                </div>
              </div>
            </article>
        )
        }
      </div>
    </div>);

}