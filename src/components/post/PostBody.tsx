'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { useRouter } from 'next/navigation';
import { RichTextView } from '@/components/richtext/RichTextView';
import { ImageGallery } from '@/components/ui/ImageGallery';
import { toast } from '@/components/ui/Toast';

/** 根据帖子类型渲染主体内容 */
export function PostBody({
  post,
  initialAttending = false,
  livePhotoMap,
}: {
  post: Post;
  initialAttending?: boolean;
  /** 图片 URL → Live Photo 视频 URL 映射(详情页 server 端反查后传入) */
  livePhotoMap?: Record<string, string>;
}) {
  switch (post.type) {
    case 'rich':
      return <RichTextView json={post.contentJson} html={post.content} />;;
    case 'short':
      return <ShortBody post={post} livePhotoMap={livePhotoMap} />;
    case 'video':
      return <VideoBody post={post} />;
    case 'vote':
      return <VoteBody post={post} />;
    case 'event':
      return <EventBody post={post} initialAttending={initialAttending} />;
    case 'journal':
      return <JournalBody post={post} />;
    default:
      return null;
  }
}

function JournalBody({ post }: { post: Post }) {
  if (!post.journal) return null;
  const j = post.journal;
  const status =
    j.endReason === 'alive'
      ? { emoji: '🌱', label: '仍在养', color: 'text-leaf-700' }
      : j.endReason === 'withered'
      ? { emoji: '🥀', label: '已枯死', color: 'text-rose-700' }
      : j.endReason === 'gifted'
      ? { emoji: '🎁', label: '已送人', color: 'text-amber-700' }
      : j.endReason === 'finished'
      ? { emoji: '✅', label: '已结束', color: 'text-leaf-600' }
      : { emoji: '📌', label: '其他', color: 'text-leaf-700' };
  return (
    <div className="rounded-none border border-leaf-100 bg-leaf-50/40 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="对象">
          <div className="text-base font-semibold text-ink-800">{j.subjectName}</div>
          {j.speciesName && (
            <div className="text-xs text-leaf-700/80">🌱 {j.speciesName}</div>
          )}
        </Stat>
        <Stat label="天数">
          <div className="text-base font-semibold text-ink-800">
            第 {j.daysSinceStart} 天
          </div>
          <div className="text-xs text-leaf-700/80">
            起 {new Date(j.startDate).toLocaleDateString()}
          </div>
        </Stat>
        <Stat label="状态">
          <div className={cn('text-base font-semibold', status.color)}>
            {status.emoji} {status.label}
          </div>
          <div className="text-xs text-leaf-700/80">📖 已记录 {j.entriesCount} 条</div>
        </Stat>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] text-leaf-700/70">{label}</div>
      {children}
    </div>
  );
}
function ShortBody({
  post,
  livePhotoMap,
}: {
  post: Post;
  livePhotoMap?: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <RichTextView html={post.content} />
      {post.images && post.images.length > 0 && (
        <ImageGallery images={post.images} livePhotoMap={livePhotoMap} />
      )}
    </div>
  );
}

function VideoBody({ post }: { post: Post }) {
  return (
    <div className="space-y-4">
      {post.videoUrl && (
        <div className="overflow-hidden rounded-none bg-black">
          <video
            controls
            className="aspect-video w-full"
            preload="metadata"
          >
            <source src={post.videoUrl} type="video/mp4" />
          </video>
        </div>
      )}
      <RichTextView html={post.content} />
      {post.images && post.images.length > 0 && (
        <ImageGallery images={post.images} />
      )}
    </div>
  );
}

function VoteBody({ post }: { post: Post }) {
  const { user } = useAuth();
  const [voted, setVoted] = useState(post.vote?.voted ?? false);
  const [votedOptionIds, setVotedOptionIds] = useState<string[]>(post.vote?.votedOptionIds ?? []);
  const [options, setOptions] = useState(post.vote?.options ?? []);
  const [selected, setSelected] = useState<string[]>(voted ? votedOptionIds : []);
  const [submitting, setSubmitting] = useState(false);

  if (!post.vote) return null;

  const total = options.reduce((s, o) => s + o.votes, 0);
  const deadlinePassed = new Date(post.vote.deadline).getTime() < Date.now();
  const canVote = !deadlinePassed && !voted;

  const handleSelect = (optionId: string) => {
    if (!canVote) return;
    setSelected(prev => {
      if (post.vote!.multi) {
        return prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId];
      } else {
        return prev.includes(optionId) ? [] : [optionId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    if (selected.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIds: selected }),
      });
      const data = await res.json();
      if (!data.ok) {
        const msg = data.error?.message || data.code || '投票失败';
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      setVotedOptionIds(selected);
      setVoted(true);
      setOptions(data.data.options);
      toast.success('投票成功');
    } catch {
      toast.error('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <RichTextView html={post.content} />
      <div className="space-y-2 rounded-none bg-leaf-50/60 p-2">
        {/* 问题 */}
        <div className="flex items-center gap-2">
          <span className="line-clamp-1 text-[12px] font-medium text-leaf-800 flex-1 min-w-0">
            🗳️ {post.vote.question}
          </span>
          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${deadlinePassed ? 'bg-leaf-100 text-leaf-600' : 'bg-leaf-200 text-leaf-800'}`}>
            {deadlinePassed ? '已截止' : '进行中'}
          </span>
          <span className="shrink-0 text-[10px] text-leaf-600">{post.vote.multi ? '多选' : '单选'}</span>
        </div>

        {/* 选项列表 */}
        <div className="space-y-1.5">
          {options.map((o, idx) => {
            let pct: number;
            if (total === 0) {
              pct = 0;
            } else if (idx === options.length - 1) {
              const sumBefore = options.slice(0, idx).reduce((s, opt) => s + opt.votes, 0);
              pct = Number(((total - sumBefore) / total * 100).toFixed(1));
            } else {
              pct = Number((o.votes / total * 100).toFixed(1));
            }

            const isSelectable = canVote;
            const isSelected = selected.includes(o.id);
            return (
              <div
                key={o.id}
                onClick={() => handleSelect(o.id)}
                className={cn(
                  'relative overflow-hidden rounded px-1 py-1 transition-all',
                  isSelectable && 'cursor-pointer hover:bg-leaf-100 hover:shadow-sm active:bg-leaf-200',
                  isSelected && 'bg-leaf-200/40',
                  !isSelectable && !isSelected && 'bg-white/70'
                )}
              >
                {/* 进度条 */}
                <div
                  className="absolute inset-y-0 left-0 bg-leaf-200"
                  style={{ width: `${pct}%` }}
                />
                {/* 内容 */}
                <div className="relative flex items-center justify-between gap-1 text-[11px]">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="w-[10px] text-center text-leaf-600 font-bold shrink-0">
                      {isSelected ? '✓' : ''}
                    </span>
                    <span className="truncate text-leaf-900">{o.label}</span>
                  </div>
                  <span className="shrink-0 tabular-nums text-leaf-700">
                    {pct}% <span className="text-leaf-600">({o.votes}票)</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部统计 */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-leaf-700/80">{total} 票</span>
          {canVote && (
            <button
              type="button"
              className="px-3 py-1 rounded bg-leaf-500 text-white text-[10px] font-medium hover:bg-leaf-600 transition-colors disabled:opacity-50"
              disabled={selected.length === 0 || submitting}
              onClick={handleSubmit}
            >
              {submitting ? '提交中...' : '提交投票'}
            </button>
          )}
          {voted && (
            <span className="px-3 py-1 rounded bg-leaf-200/60 text-leaf-700 text-[10px] font-medium">
              已投票
            </span>
          )}
          {!canVote && !voted && deadlinePassed && (
            <span className="px-3 py-1 rounded bg-leaf-100 text-leaf-600 text-[10px] font-medium">
              已截止
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EventBody({ post, initialAttending }: { post: Post; initialAttending: boolean }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [joined, setJoined] = useState(initialAttending);
  const [attendees, setAttendees] = useState(post.event?.attendees ?? 0);
  const [busy, setBusy] = useState(false);
  const ev = post.event;
  if (!ev) return null;

  const startDate = new Date(ev.startAt);
  const endDate = new Date(ev.endAt);
  const passed = endDate.getTime() < Date.now();

  const toggle = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (passed) return;
    setBusy(true);
    try {
      const res = await api.post<{ joined: boolean; attendees: number }>(
        `/api/posts/${post.id}/attend`
      );
      setJoined(res.joined);
      setAttendees(res.attendees);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        {post.cover && (
          <div className="relative aspect-[21/8] w-full overflow-hidden">
            <Image src={post.cover} alt={post.title} fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/40 to-ink-900/40" />
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <InfoBlock
            icon="📅"
            title={t('detail.event.time')}
            value={`${startDate.toLocaleDateString()} ${startDate
              .toLocaleTimeString()
              .slice(0, 5)}`}
          />
          <InfoBlock icon="📍" title={t('detail.event.location')} value={ev.location} />
          <InfoBlock icon="🙋" title={t('detail.event.attended')} value={t('detail.event.attendeesCount', { n: attendees })} />
        </div>
        <div className="flex items-center justify-between border-t border-leaf-100 px-5 py-3">
          <div className="text-xs text-leaf-700/70">
            {passed ? t('detail.event.ended') : t('detail.event.ongoing')}
          </div>
          <button
            type="button"
            disabled={passed || busy}
            onClick={toggle}
            className={cn(
              'btn !px-4',
              joined
                ? 'bg-violet-100 text-violet-700'
                : passed
                ? 'bg-leaf-100 text-leaf-600 cursor-not-allowed'
                : 'bg-violet-500 text-white hover:bg-violet-600'
            )}
          >
            {busy ? t('detail.event.processing') : joined ? t('detail.event.joined') : passed ? t('detail.event.endedLabel') : t('detail.event.join')}
          </button>
        </div>
      </div>

      <RichTextView json={post.contentJson} html={post.content} />
    </div>
  );
}

function InfoBlock({ icon, title, value }: { icon: string; title: string; value: string }) {
  return (
    <div className="rounded-none bg-leaf-50/60 p-3">
      <div className="text-[11px] text-leaf-700/70">
        <span className="mr-1">{icon}</span>
        {title}
      </div>
      <div className="mt-1 text-sm font-medium text-ink-800">{value}</div>
    </div>
  );
}

