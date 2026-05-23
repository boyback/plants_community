'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { UploadField } from '@/components/upload/UploadField';
import { PostPreview } from '@/components/editor/PostPreview';
import { UserAccountCard } from '@/components/layout/UserAccountCard';
import { toast } from '@/components/ui/Toast';
import { BoardSelect } from '@/components/editor/BoardSelect';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';

type EditableType = 'rich' | 'short' | 'video';

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
 * 帖子编辑器(仅作者本人 · 仅 rich/short/video 类型)
 *
 * 限制:
 *   - type 锁定不可改
 *   - 复用发帖编辑器的 UI 形式,左表单 + 右预览
 *   - 提交走 PATCH /api/posts/:id
 *   - 编辑后含外链会被自动送审(后端逻辑;前端给提示)
 */
export function PostEditor({ post }: { post: InitialPost }) {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [contentJson, setContentJson] = useState<unknown>(
    post.contentJson || (post.content ? createJsonFromHtml(post.content) : null)
  );
  const [cover, setCover] = useState(post.cover ?? post.images?.[0] ?? '');
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
      const n = node as { type?: string; attrs?: { src?: string } | null; content?: unknown[] };
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
    if (post.type === 'short' && !content.trim())
      return toast.error('请填写内容');
    if (post.type === 'rich') {
      const j = contentJson as { content?: unknown[] } | null;
      const empty =
        !j || !Array.isArray(j.content) || j.content.length === 0;
      if (empty) return toast.error('请填写正文');
    }
    if (post.type === 'video' && !videoUrl.trim())
      return toast.error('请上传视频或填写视频 URL');
    if (!categorySlug)
      return toast.error('请选择板块');

    setSubmitting(true);
    try {
      const isRich = post.type === 'rich';
      // rich/event 类型从 contentJson 提取图片
      const contentImages = isRich ? extractImagesFromJson(contentJson) : [];
      const payload: Record<string, unknown> = {
        title,
        ...(isRich ? { contentJson } : { content }),
        tags,
        ...(cover && { cover }),
        ...(contentImages.length > 0 && { images: contentImages }),
        ...(speciesSlug
          ? { speciesSlug }
          : genusSlug
          ? { genusSlug }
          : { categorySlug }),
        ...(post.type === 'video' && { videoUrl }),
      };
      const r = await api.patch<{ ok: boolean; needsReview: boolean }>(
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
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-5">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">✍️ 编辑帖子</h1>
            <PostTypeBadge type={post.type} />
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Row label={<><span className="text-rose-500">*</span> 类型</>}>
                <div className="flex items-center gap-2">
                  <PostTypeBadge type={post.type} />
                  <span className="text-xs text-ink-500">（不可修改）</span>
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
                placeholder="搜索并选择板块"
              />
            </Row>

            <Row label={<><span className="text-rose-500">*</span> 标题</>}>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
              />
              <div className="mt-1 text-right text-[11px] text-leaf-700/60">
                {title.length} / 60
              </div>
            </Row>

            {post.type === 'rich' && (
              <Row label="正文">
                <RichTextEditor
                  value={contentJson}
                  onChange={setContentJson}
                  placeholder="编辑你的内容..."
                  minHeight={300}
                  charLimit={1000}
                />
              </Row>
            )}

            {post.type === 'short' && (
              <Row label="内容">
                <textarea
                  className="input min-h-[140px]"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={500}
                />
                <div className="mt-1 text-right text-[11px] text-leaf-700/60">
                  {content.length} / 500
                </div>
              </Row>
            )}

            {post.type === 'video' && (
              <>
                <Row label="视频">
                  <UploadField
                    kind="video"
                    value={videoUrl ? [videoUrl] : []}
                    onChange={(arr) => setVideoUrl(arr[0] ?? '')}
                    max={1}
                  />
                </Row>
                <Row label="说明">
                  <textarea
                    className="input min-h-[100px]"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="视频说明..."
                  />
                </Row>
              </>
            )}

            <Row label="封面图">
              <UploadField
                kind="image"
                value={cover ? [cover] : []}
                onChange={(arr) => setCover(arr[0] ?? '')}
                max={1}
              />
              <div className="mt-1 text-xs text-leaf-700/60">
                帖子封面图（可选）
              </div>
            </Row>

            <Row label="标签">
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-leaf-200 bg-white p-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-0.5 text-xs text-leaf-700"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="text-leaf-600 hover:text-leaf-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="flex-1 bg-transparent px-1 text-sm outline-none min-w-[120px]"
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
                  disabled={tags.length >= 10}
                />
              </div>
            </Row>

            <div className="rounded-lg bg-leaf-50/60 p-3 text-[11px] text-leaf-700/80">
              ⚠️ 帖子类型不可更改 · 编辑后含外链将自动重新进入审核
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link
                href={`/post/${post.id}`}
                className="btn-outline"
              >
                取消
              </Link>
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                <Icon name="check" size={14} />
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧实时预览 */}
      <div className="space-y-4">
        <div className="space-y-4 xl:sticky xl:top-[60px] xl:max-h-[calc(100vh-72px)] xl:overflow-y-auto xl:self-start">
          <PostPreview
          type={post.type}
          title={title}
          content={content}
          contentJson={contentJson}
          images={extractImagesFromJson(contentJson)}
          videoUrl={videoUrl}
          tags={tags}
          user={user}
          voteOptions={[]}
          voteMulti={false}
          voteDeadline=""
          eventLocation=""
          eventStartAt=""
          journal={{
            subjectName: '',
            startDate: '',
            entries: [],
          }}
          cover={cover}
        />
          <UserAccountCard />
        </div>
      </div>
    </div>
  );
}

function Row({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-leaf-700/80">
        {label}
      </label>
      {children}
    </div>
  );
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
            text: stripHtml(html),
          },
        ],
      },
    ],
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
