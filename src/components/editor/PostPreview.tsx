'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { RichTextView } from '@/components/richtext/RichTextView';
import { STAGE_META } from '@/lib/journal';
import type { JournalStage, PostType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface JournalDraftEntry {
  entryDate: string;
  stage: JournalStage | '';
  note: string;
  images: string[];
}

interface JournalDraft {
  subjectName: string;
  startDate: string;
  entries: JournalDraftEntry[];
}

interface User {
  id: string;
  name: string;
  avatar: string;
  level: number;
}

interface Props {
  type: PostType;
  title: string;
  content: string;
  contentJson: unknown;
  images: string[];
  videoUrl: string;
  tags: string[];
  user: User | null;
  voteOptions: string[];
  voteMulti: boolean;
  voteDeadline: string;
  eventLocation: string;
  eventStartAt: string;
  journal: JournalDraft;
  cover?: string;
}

export function PostPreview({
  type,
  title,
  content,
  contentJson,
  images,
  videoUrl,
  tags,
  user,
  voteOptions,
  voteMulti,
  voteDeadline,
  eventLocation,
  eventStartAt,
  journal,
  cover,
}: Props) {
  const isRichContent = type === 'rich' || type === 'event';
  const displayImage = cover || images[0] || '';
  const extraImages = images.filter((url) => url !== displayImage).slice(0, 3);

  return (
    <section className="rounded-xl border border-leaf-100 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-ink-900">实时预览</h2>

      <article className="mt-4 overflow-hidden rounded-xl border border-leaf-100 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar src={user?.avatar || ''} alt={user?.name || '用户'} size={34} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-ink-900">{user?.name || '肉友'}</div>
              <div className="text-[11px] text-ink-500">刚刚 · Lv.{user?.level ?? 1}</div>
            </div>
          </div>
          <PostTypeBadge type={type} />
        </div>

        <h3 className="mt-4 line-clamp-2 text-base font-bold leading-6 text-ink-950">
          {title || <span className="text-ink-400">帖子标题预览</span>}
        </h3>

        {isRichContent && contentJson ? (
          <div className="preview-prose prose-article mt-3 max-h-[230px] overflow-hidden text-sm leading-6 text-ink-700">
            <RichTextView json={contentJson} html={content || undefined} />
          </div>
        ) : content ? (
          <p className="mt-3 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-ink-700">{content}</p>
        ) : (
          <p className="mt-3 text-sm leading-6 text-ink-400">正文内容会在这里实时预览。</p>
        )}

        {displayImage && (
          <div className="mt-3 overflow-hidden rounded-lg bg-leaf-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayImage} alt="" className="block aspect-[4/3] w-full object-cover" />
          </div>
        )}

        {extraImages.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {extraImages.map((url, index) => (
              <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg bg-leaf-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="block aspect-square w-full object-cover" />
                {index === 2 && images.length > 4 && (
                  <span className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-bold text-white">
                    +{images.length - 4}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {type === 'video' && videoUrl && (
          <video src={videoUrl} controls preload="metadata" className="mt-3 block w-full rounded-lg" />
        )}

        {type === 'vote' && (
          <div className="mt-3 space-y-1.5 rounded-lg bg-leaf-50/70 p-2.5 text-xs text-ink-700">
            <div className="font-semibold">{title || '投票问题'}</div>
            {voteOptions.filter((x) => x.trim()).map((option, index) => (
              <div key={`${option}-${index}`} className="rounded-md bg-white px-2 py-1">
                {option}
              </div>
            ))}
            <div className="text-[11px] text-ink-500">
              {voteMulti ? '多选' : '单选'}
              {voteDeadline && ` · 截止 ${new Date(voteDeadline).toLocaleString('zh-CN')}`}
            </div>
          </div>
        )}

        {type === 'event' && (
          <div className="mt-3 rounded-lg bg-leaf-50/70 p-2.5 text-xs leading-5 text-ink-700">
            <div>地点：{eventLocation || '待填写'}</div>
            <div>时间：{eventStartAt ? new Date(eventStartAt).toLocaleString('zh-CN') : '待填写'}</div>
          </div>
        )}

        {type === 'journal' && (
          <div className="mt-3 rounded-lg bg-leaf-50/70 p-2.5 text-xs">
            <div className="mb-2 flex items-center justify-between text-leaf-800">
              <span className="font-semibold">{journal.subjectName || '植物昵称'}</span>
              <span>{journal.entries.length} 条记录</span>
            </div>
            <ol className="space-y-1.5">
              {journal.entries.slice(0, 3).map((entry, index) => {
                const meta = STAGE_META[entry.stage as JournalStage] || STAGE_META.other;
                return (
                  <li key={index} className="flex items-start gap-1.5">
                    <span
                      className={cn(
                        'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]',
                        meta?.color?.replace('border-', '') || 'bg-leaf-50 text-leaf-700',
                      )}
                    >
                      {meta?.emoji || '•'}
                    </span>
                    <div className="min-w-0 flex-1 text-[11px] leading-4 text-ink-700">
                      <span className="text-ink-500">
                        {entry.entryDate
                          ? new Date(entry.entryDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
                          : '?'}
                      </span>{' '}
                      {entry.note ? truncate(entry.note, 30) : meta?.zh || '其他'}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] font-semibold text-leaf-700">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-leaf-100 pt-3 text-xs text-ink-600">
          <span className="inline-flex items-center gap-1">
            <Icon name="heart" size={14} />
            256
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="comment" size={14} />
            128
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="star" size={14} />
            收藏
          </span>
        </div>
      </article>
    </section>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return `${s.slice(0, n)}...`;
}
