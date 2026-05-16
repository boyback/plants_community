'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { STAGE_META } from '@/lib/journal';
import type { PostType, JournalStage } from '@/lib/types';
import { RichTextView } from '@/components/richtext/RichTextView';
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
}

/**
 * 编辑器右侧实时预览
 * 模拟最终详情页的呈现(精简版)
 */
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
}: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-leaf-100 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-leaf-700">
          👁️ 预览
        </div>
        <PostTypeBadge type={type} />
      </div>

      <div className="space-y-3 p-4">
        {/* 标题 */}
        <h2 className="line-clamp-2 text-base font-bold text-ink-800">
          {title || (
            <span className="text-leaf-700/40">(标题预览)</span>
          )}
        </h2>

        {/* 作者 */}
        {user && (
          <div className="flex items-center gap-2 text-[11px] text-leaf-700/80">
            <Avatar src={user.avatar} alt={user.name} size={20} />
            <span className="font-medium">{user.name}</span>
            <span className="text-leaf-600/70">·</span>
            <span>Lv.{user.level}</span>
          </div>
        )}

        {/* 主图 */}
        {images.length > 0 && (
          <div className="overflow-hidden rounded-lg bg-leaf-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[0]}
              alt=""
              className="block max-h-64 w-full object-cover"
            />
          </div>
        )}

        {/* 视频 */}
        {type === 'video' && videoUrl && (
          <video
            src={videoUrl}
            controls
            preload="metadata"
            className="block w-full rounded-lg"
          />
        )}

        {/* 内容 */}
        {(type === 'rich' || type === 'event') && contentJson ? (
          <div className="prose-article max-h-72 overflow-y-auto text-sm">
            <RichTextView json={contentJson} html={content} />
          </div>
        ) : (
          content && (
            <p className="line-clamp-6 whitespace-pre-wrap text-sm text-ink-800/90">
              {content}
            </p>
          )
        )}

        {/* 投票预览 */}
        {type === 'vote' && (
          <div className="space-y-1.5 rounded-lg bg-amber-50/60 p-2.5 text-xs text-amber-900">
            <div className="font-medium">🗳️ {title || '(投票问题)'}</div>
            {voteOptions.filter((x) => x.trim()).map((o, i) => (
              <div
                key={i}
                className="rounded bg-white/70 px-2 py-1"
              >
                {o}
              </div>
            ))}
            <div className="text-[10px] text-amber-700/80">
              {voteMulti ? '多选' : '单选'}
              {voteDeadline && ` · 截止 ${new Date(voteDeadline).toLocaleString()}`}
            </div>
          </div>
        )}

        {/* 活动预览 */}
        {type === 'event' && (
          <div className="rounded-lg bg-violet-50/80 p-2.5 text-xs text-violet-900">
            <div>📍 {eventLocation || '(地点)'}</div>
            <div>🕘 {eventStartAt ? new Date(eventStartAt).toLocaleString() : '(时间)'}</div>
          </div>
        )}

        {/* 成长日记预览 */}
        {type === 'journal' && (
          <div className="rounded-lg bg-emerald-50/60 p-2.5 text-xs">
            <div className="mb-1 flex items-center justify-between text-emerald-700/80">
              <span>📖 {journal.subjectName || '(植物昵称)'}</span>
              <span>{journal.entries.length} 条记录</span>
            </div>
            <ol className="space-y-1.5">
              {journal.entries.slice(0, 3).map((e, i) => {
                const meta = STAGE_META[e.stage as JournalStage] || STAGE_META.other;
                return (
                  <li key={i} className="flex items-start gap-1.5">
                    <span
                      className={cn(
                        'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]',
                        meta?.color?.replace('border-', '') || 'bg-leaf-50 text-leaf-700'
                      )}
                    >
                      {meta?.emoji || '📌'}
                    </span>
                    <div className="min-w-0 flex-1 text-[11px] leading-4 text-emerald-900/90">
                      <span className="text-emerald-800/80">
                        {e.entryDate
                          ? new Date(e.entryDate).toLocaleDateString('zh-CN', {
                              month: 'numeric',
                              day: 'numeric',
                            })
                          : '?'}
                      </span>{' '}
                      {e.note ? truncate(e.note, 30) : meta?.zh || '其他'}
                    </div>
                  </li>
                );
              })}
            </ol>
            {journal.entries.length > 3 && (
              <div className="mt-1 text-center text-[10px] text-emerald-700/80">
                ⋯ 还有 {journal.entries.length - 3} 条
              </div>
            )}
          </div>
        )}

        {/* 标签 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] text-leaf-700"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {!title && !content && images.length === 0 && (
          <div className="rounded-lg bg-leaf-50/40 py-6 text-center text-xs text-leaf-700/60">
            <Icon name="eye" size={20} className="mx-auto mb-1 opacity-50" />
            填写左侧表单,这里会实时预览最终效果
          </div>
        )}
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n) + '…';
}
