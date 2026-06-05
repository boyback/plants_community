'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { PostContentView } from '@/components/post/PostContentView';
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
  boardLabel?: string;
  visibilityLabel?: string;
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
  boardLabel,
  visibilityLabel,
  voteOptions,
  voteMulti,
  voteDeadline,
  eventLocation,
  eventStartAt,
  journal,
  cover,
}: Props) {
  const isRichContent = type === 'rich' || type === 'event';
  const previewTitle = title || '帖子标题预览';
  const plainImages = isRichContent ? [] : cover ? [cover, ...images.filter((url) => url !== cover)] : images;

  return (
    <section className="rounded-xl border border-leaf-100 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-ink-900">实时预览</h2>

      <article className="mt-4 overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm">
        <div className="border-b border-leaf-100 px-4 py-4">
          <div className="mb-3 flex items-center gap-2">
            <PostTypeBadge type={type} />
          </div>

          <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-leaf-50 px-2.5 py-1 font-medium text-leaf-800">
              板块：{boardLabel || '待选择'}
            </span>
            <span className="rounded-full bg-ink-50 px-2.5 py-1 font-medium text-ink-600">
              {visibilityLabel || '公开（所有人可见）'}
            </span>
            <span className={cn(
              'rounded-full px-2.5 py-1 font-medium',
              cover ? 'bg-leaf-50 text-leaf-800' : 'bg-ink-50 text-ink-500',
            )}>
              封面：{cover ? '已设置' : '未设置'}
            </span>
          </div>

          <h3 className={cn('text-[22px] font-bold leading-snug text-ink-950', !title && 'text-ink-400')}>
            {previewTitle}
          </h3>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-500">
            <div className="flex min-w-0 items-center gap-2 text-ink-800">
              <Avatar src={user?.avatar || ''} alt={user?.name || '用户'} size={30} />
              <span className="truncate font-semibold">{user?.name || '肉友'}</span>
              <span className="rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] text-leaf-800">
                Lv.{user?.level ?? 1}
              </span>
            </div>
            <span>刚刚</span>
            <span className="inline-flex items-center gap-1">
              <Icon name="eye" size={13} />
              0
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="comment" size={13} />
              0
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="heart" size={13} />
              0
            </span>
          </div>

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-leaf-50 px-3 py-1 text-xs font-medium text-leaf-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-4">
          {cover && (
            <div className="mb-4 overflow-hidden rounded-lg border border-leaf-100 bg-leaf-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="block aspect-video w-full object-cover" />
            </div>
          )}

          {renderPreviewBody({
            content,
            contentJson,
            eventLocation,
            eventStartAt,
            images: plainImages,
            isRichContent,
            journal,
            title: previewTitle,
            type,
            videoUrl,
            voteDeadline,
            voteMulti,
            voteOptions,
          })}

          {!content && !contentJson && type !== 'journal' && type !== 'vote' && type !== 'event' && !videoUrl && (
            <p className="text-base leading-7 text-ink-400">正文内容会在这里实时预览。</p>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-leaf-100 pt-3 text-xs text-ink-600">
            <span className="inline-flex items-center gap-1">
              <Icon name="heart" size={14} />
              0
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="comment" size={14} />
              0
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="star" size={14} />
              收藏
            </span>
          </div>
        </div>
      </article>
    </section>
  );
}

function renderPreviewBody({
  content,
  contentJson,
  eventLocation,
  eventStartAt,
  images,
  isRichContent,
  journal,
  title,
  type,
  videoUrl,
  voteDeadline,
  voteMulti,
  voteOptions,
}: {
  content: string;
  contentJson: unknown;
  eventLocation: string;
  eventStartAt: string;
  images: string[];
  isRichContent: boolean;
  journal: JournalDraft;
  title: string;
  type: PostType;
  videoUrl: string;
  voteDeadline: string;
  voteMulti: boolean;
  voteOptions: string[];
}) {
  if (type === 'video') {
    return (
      <div className="space-y-4">
        {videoUrl && (
          <div className="overflow-hidden rounded-none bg-black">
            <video src={videoUrl} controls preload="metadata" className="aspect-video w-full" />
          </div>
        )}
        <PostContentView text={content || undefined} images={images} />
      </div>
    );
  }

  if (type === 'vote') {
    const visibleOptions = voteOptions.filter((x) => x.trim());
    return (
      <div className="space-y-4">
        <PostContentView text={content || undefined} />
        <div className="space-y-2 rounded-none bg-leaf-50/60 p-2">
          <div className="flex items-center gap-2">
            <span className="line-clamp-1 min-w-0 flex-1 text-[12px] font-medium text-leaf-800">
              投票：{title || '投票问题'}
            </span>
            <span className="shrink-0 rounded bg-leaf-200 px-1.5 py-0.5 text-[10px] text-leaf-800">进行中</span>
            <span className="shrink-0 text-[10px] text-leaf-600">{voteMulti ? '多选' : '单选'}</span>
          </div>
          <div className="space-y-1.5">
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option, index) => (
                <div key={`${option}-${index}`} className="rounded bg-white/70 px-2 py-1 text-[11px] text-leaf-900">
                  {option}
                </div>
              ))
            ) : (
              <div className="rounded bg-white/70 px-2 py-1 text-[11px] text-leaf-700/50">投票选项会显示在这里</div>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-leaf-700/80">
            <span>0 票</span>
            {voteDeadline && <span>截止 {new Date(voteDeadline).toLocaleString('zh-CN')}</span>}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'event') {
    return (
      <div className="space-y-4">
        <div className="card overflow-hidden">
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
            <InfoBlock title="时间" value={eventStartAt ? new Date(eventStartAt).toLocaleString('zh-CN') : '待填写'} />
            <InfoBlock title="地点" value={eventLocation || '待填写'} />
            <InfoBlock title="报名" value="0 人已参加" />
          </div>
          <div className="flex items-center justify-between border-t border-leaf-100 px-5 py-3">
            <div className="text-xs text-leaf-700/70">活动预览</div>
            <span className="btn bg-violet-500 !px-4 text-white">报名</span>
          </div>
        </div>
        <PostContentView json={contentJson || undefined} html={contentJson ? undefined : content || undefined} />
      </div>
    );
  }

  if (type === 'journal') {
    return <JournalPreview journal={journal} />;
  }

  if (isRichContent && contentJson) {
    return <PostContentView json={contentJson} />;
  }

  if (content || images.length > 0) {
    return <PostContentView text={content || undefined} images={images} />;
  }

  return null;
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-none bg-leaf-50/60 p-3">
      <div className="text-[11px] text-leaf-700/70">{title}</div>
      <div className="mt-1 text-sm font-medium text-ink-800">{value}</div>
    </div>
  );
}

function JournalPreview({ journal }: { journal: JournalDraft }) {
  return (
    <div className="space-y-4">
      <div className="rounded-none border border-leaf-100 bg-leaf-50/40 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <InfoBlock title="对象" value={journal.subjectName || '植物昵称'} />
          <InfoBlock title="起始日期" value={journal.startDate ? new Date(journal.startDate).toLocaleDateString('zh-CN') : '待填写'} />
          <InfoBlock title="记录" value={`${journal.entries.length} 条记录`} />
        </div>
      </div>
      {journal.entries.length > 0 && (
        <ol className="space-y-2">
          {journal.entries.slice(0, 3).map((entry, index) => {
            const meta = STAGE_META[entry.stage as JournalStage] || STAGE_META.other;
            return (
              <li key={index} className="flex items-start gap-2 rounded-none bg-leaf-50/60 p-2 text-xs">
                <span
                  className={cn(
                    'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]',
                    meta?.color?.replace('border-', '') || 'bg-leaf-50 text-leaf-700',
                  )}
                >
                  {meta?.emoji || '•'}
                </span>
                <div className="min-w-0 flex-1 leading-5 text-ink-700">
                  <span className="text-ink-500">
                    {entry.entryDate
                      ? new Date(entry.entryDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
                      : '?'}
                  </span>{' '}
                  {entry.note ? truncate(entry.note, 36) : meta?.zh || '其他'}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return `${s.slice(0, n)}...`;
}
