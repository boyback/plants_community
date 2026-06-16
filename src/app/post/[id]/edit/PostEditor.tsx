'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { UploadField } from '@/components/upload/UploadField';
import { PostCard } from '@/components/post/PostCard';
import { UserAccountCard } from '@/components/layout/UserAccountCard';
import { toast } from '@/components/ui/Toast';
import { BoardSelect } from '@/components/editor/BoardSelect';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from "@/lib/client-api";
import type { Board, Post, User } from '@/lib/types';
import previewStyles from '@/components/editor/FeedPreview.module.scss';
import styles from './PostEditor.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';



type EditableType = 'rich' | 'image' | 'short' | 'video';

const postTypeHasCover = (type: EditableType) => type !== 'image' && type !== 'video';

interface InitialPost {
  id: string;
  type: EditableType;
  title: string;
  content: string;
  contentJson: unknown;
  images: string[];
  videoUrl: string;
  tags: string[];
  categorySlug: string;
  genusSlug: string;
  speciesSlug: string;
  cover?: string;
}

/**
 * 帖子编辑器(仅作者本人 · 仅 rich/image/short/video 类型)
 *
 * 限制:
 *   - type 锁定不可改
 *   - 复用发帖编辑器的 UI 形式,左表单 + 右预览
 *   - 提交走 PATCH /api/posts/:id
 *   - 编辑后含外链会被自动送审(后端逻辑;前端给提示)
 */
export function PostEditor({ post }: {post: InitialPost;}) {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [contentJson, setContentJson] = useState<unknown>(
    post.contentJson || (post.content ? createJsonFromHtml(post.content) : null)
  );
  const [cover, setCover] = useState(post.cover ?? post.images?.[0] ?? '');
  const [images, setImages] = useState<string[]>(post.images ?? []);
  const [videoUrl, setVideoUrl] = useState(post.videoUrl);
  const [tags, setTags] = useState<string[]>(post.tags);
  const [tagInput, setTagInput] = useState('');
  const [categorySlug, setCategorySlug] = useState(post.categorySlug);
  const [genusSlug, setGenusSlug] = useState(post.genusSlug);
  const [speciesSlug, setSpeciesSlug] = useState(post.speciesSlug);

  const [submitting, setSubmitting] = useState(false);

  const onAddTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput('');
      return;
    }
    if (tags.length >= 10) return;
    setTags([...tags, t]);
    setTagInput('');
  };

  /** 从 contentJson 中提取所有图片 URL */
  const extractImagesFromJson = (json: unknown): string[] => {
    const images: string[] = [];
    const traverse = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      const n = node as {type?: string;attrs?: {src?: string;} | null;content?: unknown[];};
      if (n.type === 'image' && typeof n.attrs?.src === 'string' && n.attrs.src) {
        images.push(n.attrs.src);
      }
      if (Array.isArray(n.content)) {
        n.content.forEach(traverse);
      }
    };
    traverse(json);
    return images;
  };

  const onSubmit = async () => {
    if (!title.trim()) return toast.error('请填写标题');
    if ((post.type === 'image' || post.type === 'video') && title.length > 500)
    return toast.error('标题最多 500 字');
    if (post.type === 'short' && !content.trim())
    return toast.error('请填写内容');
    if (post.type === 'rich') {
      const j = contentJson as {content?: unknown[];} | null;
      const empty =
      !j || !Array.isArray(j.content) || j.content.length === 0;
      if (empty) return toast.error('请填写正文');
    }
    if (post.type === 'image' && images.length === 0)
    return toast.error('请上传图片');
    if (post.type === 'video' && !videoUrl.trim())
    return toast.error('请上传视频或填写视频 URL');
    if (!categorySlug)
    return toast.error('请选择板块');

    setSubmitting(true);
    try {
      const isRich = post.type === 'rich';
      const contentImages = isRich ? extractImagesFromJson(contentJson) : [];
      const finalImages = post.type === 'image' ? images : contentImages;
      const finalCover = postTypeHasCover(post.type) ? cover : '';
      const payload: Record<string, unknown> = {
        title,
        ...(isRich ? { contentJson } : post.type === 'image' || post.type === 'video' ? { content: '' } : { content }),
        tags,
        ...(!postTypeHasCover(post.type) ? { cover: null } : finalCover && { cover: finalCover }),
        ...(finalImages.length > 0 && { images: finalImages }),
        ...(speciesSlug ?
        { speciesSlug } :
        genusSlug ?
        { genusSlug } :
        { categorySlug }),
        ...(post.type === 'video' && { videoUrl })
      };
      const r = await api.patch<{ok: boolean;needsReview: boolean;}>(
        `/api/posts/${post.id}`,
        payload
      );
      if (r.needsReview) {
        toast.success('已保存,因含外链将进入审核');
      } else {
        toast.success('已保存');
      }
      setTimeout(() => router.push(`/post/${post.id}`), 1000);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_0d304f90, styles.r_c9fde212)}>
      <div className={cx(styles.r_7e0b7cdf, styles.r_b43b4c08)}>
        <div className={styles.r_0478c89a}>
          <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
            <h1 className={cx(styles.r_d5c9b000, styles.r_e83a7042)}>✍️ 编辑帖子</h1>
            <PostTypeBadge type={post.type} />
          </div>

          <div className={styles.r_3e7ce58d}>
            <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_0c3bc985)}>
              <Row label={<><span className={styles.r_fa512798}>*</span> 类型</>}>
                <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                  <PostTypeBadge type={post.type} />
                  <span className={cx(styles.r_359090c2, styles.r_7b89cd85)}>（不可修改）</span>
                </div>
              </Row>
            </div>

            <Row label="板块">
              <BoardSelect
                value={{ categorySlug, genusSlug, speciesSlug }}
                onChange={(selection) => {
                  setCategorySlug(selection.categorySlug);
                  setGenusSlug(selection.genusSlug);
                  setSpeciesSlug(selection.speciesSlug);
                }}
                placeholder="搜索并选择板块" />

            </Row>

            <Row label={<><span className={styles.r_fa512798}>*</span> 标题</>}>
              {post.type === 'image' || post.type === 'video' ?
              <Textarea
                className={cx(styles.r_ee15a477, styles.r_5bd7b080, styles.r_4ee73492, styles.r_7eff2faf)}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={500}
                rows={post.type === 'image' ? 5 : undefined} /> :


              <Input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60} />

              }
              <div className={cx(styles.r_b6b02c0e, styles.r_308fc069, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                {title.length} / {post.type === 'image' || post.type === 'video' ? 500 : 60}
              </div>
            </Row>

            {post.type === 'rich' &&
            <Row label="正文">
                <RichTextEditor
                value={contentJson}
                onChange={setContentJson}
                placeholder="编辑你的内容..."
                minHeight={300}
                charLimit={1000} />

              </Row>
            }

            {post.type === 'image' &&
            <Row label={<><span className={styles.r_fa512798}>*</span> 上传图片</>}>
                <UploadField
                kind="image"
                value={images}
                onChange={(arr) => {
                  setImages(arr);
                }}
                max={9}
                gridClassName={cx(styles.r_be2e831b, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_d17ef2d9, styles.r_898c0bcb, styles.r_76f32b53)}
                itemClassName={cx(styles.r_b59cd297, styles.r_421ac2be, styles.r_5e10cdb8)} />

                <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_6c4cc49e)}>
                  图文贴不需要填写正文，也不单独设置封面图。
                </div>
              </Row>
            }

            {post.type === 'short' &&
            <Row label="内容">
                <Textarea
                className={styles.r_ee15a477}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500} />

                <div className={cx(styles.r_b6b02c0e, styles.r_308fc069, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                  {content.length} / 500
                </div>
              </Row>
            }

            {post.type === 'video' &&
            <Row label="视频">
                <UploadField
                kind="video"
                value={videoUrl ? [videoUrl] : []}
                onChange={(arr) => setVideoUrl(arr[0] ?? '')}
                max={1}
                itemClassName={cx(styles.r_25245f7e, styles.r_0595c69e)} />

              </Row>
            }

            {postTypeHasCover(post.type) &&
            <Row label="封面图">
                <UploadField
                kind="image"
                value={cover ? [cover] : []}
                onChange={(arr) => setCover(arr[0] ?? '')}
                max={1} />

                <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_6c4cc49e)}>
                  帖子封面图（可选）
                </div>
              </Row>
            }

            <Row label="标签">
              <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_7660b450)}>
                {tags.map((t) =>
                <span
                  key={t}
                  className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_f2b23104, styles.r_d5eab218, styles.r_465609a2, styles.r_359090c2, styles.r_5f6a59f1)}>

                    #{t}
                    <button
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    className={cx(styles.r_b17d6a13, styles.r_81be6435)}>

                      ×
                    </button>
                  </span>
                )}
                <Input
                  className={cx(styles.r_36e579c0, styles.r_7f19cdf4, styles.r_d8e0e382, styles.r_fc7473ca, styles.r_df37b1fd, styles.r_a9ef791a)}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddTag();
                    }
                  }}
                  placeholder={
                  tags.length >= 10 ? '最多 10 个标签' : '输入标签后回车'
                  }
                  disabled={tags.length >= 10} />

              </div>
            </Row>

            <div className={cx(styles.r_5f22e64f, styles.r_a8a62ca4, styles.r_eb6e8b88, styles.r_d058ca6d, styles.r_21d33c50)}>
              ⚠️ 帖子类型不可更改 · 编辑后含外链将自动重新进入审核
            </div>

            <div className={cx(styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e, styles.r_f46b61a9)}>
              <Link
                href={`/post/${post.id}`}
                className="btn-outline">

                取消
              </Link>
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="btn-primary">

                <Icon name="check" size={14} />
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧实时预览 */}
      <div className={styles.r_3e7ce58d}>
        <div className={cx(styles.r_3e7ce58d, styles.r_f271783c, styles.r_5ca527be, styles.r_c759b03e, styles.r_90b8aaf3, styles.r_bb3508ed)}>
          <LegacyEditorFeedPreview
            postId={post.id}
            type={post.type}
            title={title}
            content={content}
            contentJson={contentJson}
            images={post.type === 'image' ? images : extractImagesFromJson(contentJson)}
            videoUrl={videoUrl}
            cover={postTypeHasCover(post.type) ? cover : ''}
            tags={tags}
            boardSelection={{ categorySlug, genusSlug, speciesSlug }}
            user={user} />

          <UserAccountCard />
        </div>
      </div>
    </div>);

}

function Row({ label, children, className }: {label: React.ReactNode;children: React.ReactNode;className?: string;}) {
  return (
    <div className={className}>
      <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_21d33c50)}>
        {label}
      </label>
      {children}
    </div>);

}

function LegacyEditorFeedPreview({
  postId,
  type,
  title,
  content,
  contentJson,
  images,
  videoUrl,
  cover,
  tags,
  boardSelection,
  user












}: {postId: string;type: EditableType;title: string;content: string;contentJson: unknown;images: string[];videoUrl: string;cover: string;tags: string[];boardSelection: {categorySlug: string;genusSlug: string;speciesSlug: string;};user: User | null;}) {
  const previewPost = buildLegacyPreviewPost({
    postId,
    type,
    title,
    content,
    contentJson,
    images,
    videoUrl,
    cover,
    tags,
    boardSelection,
    user
  });

  return (
    <section className={previewStyles.previewPanel}>
      <h2 className={previewStyles.previewTitle}>帖子预览</h2>
      <div className={previewStyles.previewList}>
        <ScaledLegacyFeedPreview title="H5 预览" post={previewPost} canvasWidth={330} />
        <ScaledLegacyFeedPreview title="PC 预览" post={previewPost} canvasWidth={480} />
      </div>
    </section>);

}

function ScaledLegacyFeedPreview({ title, post, canvasWidth }: {title: string;post: Post;canvasWidth: number;}) {
  return (
    <div className={previewStyles.viewportCard}>
      <div className={previewStyles.viewportHeader}>
        <span className={previewStyles.viewportName}>{title}</span>
        <span className={previewStyles.viewportSize}>{canvasWidth}px</span>
      </div>
      <div
        className={previewStyles.viewportBody}
        style={{ width: `${canvasWidth}px`, maxWidth: '100%' }}
        onClickCapture={(event) => event.preventDefault()}>

        <PostCard post={post} className={previewStyles.previewCard} />
      </div>
    </div>);

}

function buildLegacyPreviewPost({
  postId,
  type,
  title,
  content,
  contentJson,
  images,
  videoUrl,
  cover,
  tags,
  boardSelection,
  user












}: {postId: string;type: EditableType;title: string;content: string;contentJson: unknown;images: string[];videoUrl: string;cover: string;tags: string[];boardSelection: {categorySlug: string;genusSlug: string;speciesSlug: string;};user: User | null;}): Post {
  const now = new Date().toISOString();
  const text = type === 'rich' ? extractTextFromJson(contentJson) : stripHtml(content);
  return {
    id: postId,
    type,
    title: title.trim() || '未填写标题',
    content: text,
    contentJson: type === 'rich' ? contentJson : undefined,
    contentText: text || undefined,
    images,
    videoUrl: videoUrl || undefined,
    cover: cover || undefined,
    author: user ?? createLegacyPreviewUser(),
    board: createLegacyPreviewBoard(boardSelection),
    tags,
    createdAt: now,
    updatedAt: now,
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
    pins: [],
    pinState: { any: false, global: false, board: false, topic: false },
    locked: false,
    adminPermissions: {
      canManage: false,
      canEdit: false,
      canDelete: false,
      canMove: false,
      canPin: false,
      canLock: false,
      canBan: false,
      canReview: false
    }
  };
}

function createLegacyPreviewUser(): User {
  return {
    id: "preview-user",
    name: '当前用户',
    avatar: '',
    level: 1,
    followers: 0,
    following: 0,
    posts: 0,
    pointsBalance: 0,
    badges: [],
    joinedAt: new Date().toISOString()
  };
}

function createLegacyPreviewBoard(selection: {categorySlug: string;genusSlug: string;speciesSlug: string;}): Board {
  const slug = selection.speciesSlug || selection.genusSlug || selection.categorySlug || "preview-board";
  return {
    id: "preview-board",
    level: selection.speciesSlug ? 'species' : selection.genusSlug ? 'genus' : 'category',
    slug,
    name: slug || '未选择板块',
    description: '',
    cover: '',
    icon: '',
    members: 0,
    posts: 0,
    path: [{ level: selection.speciesSlug ? 'species' : selection.genusSlug ? 'genus' : 'category', slug, name: slug || '未选择板块' }]
  };
}

/**
 * 从 HTML 创建一个基础的 ProseMirror JSON 结构
 * 用于 contentJson 为空时的回退方案
 */
function createJsonFromHtml(html: string): unknown {
  if (!html) return null;
  // 创建一个简单的 ProseMirror 文档结构，包含一个段落
  return {
    type: 'doc',
    content: [
    {
      type: 'paragraph',
      content: [
      {
        type: 'text',
        text: stripHtml(html)
      }]

    }]

  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTextFromJson(json: unknown): string {
  const parts: string[] = [];
  const traverse = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as {text?: string;content?: unknown[];};
    if (typeof n.text === 'string') parts.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(traverse);
  };
  traverse(json);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
