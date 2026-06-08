'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/Toast';
import { Tooltip } from '@/components/ui/Tooltip';
import { Icon } from '@/components/ui/Icon';

export type PostVoteUpdateHandler = (
  postId: string,
  options: { id: string; label: string; votes: number }[],
  total: number,
  voted: boolean,
  votedOptionIds: string[]
) => void;

export function PostVotePreview({
  post,
  onVoteUpdate,
  className,
}: {
  post: Post;
  onVoteUpdate?: PostVoteUpdateHandler;
  className?: string;
}) {
  const vote = post.vote;
  const { user } = useAuth();
  const [selectedOptions, setSelectedOptions] = useState<string[]>(vote?.voted ? vote.votedOptionIds ?? [] : []);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedOptions(vote?.voted ? vote.votedOptionIds ?? [] : []);
  }, [vote?.voted, vote?.votedOptionIds]);

  if (!vote) return null;

  const total = vote.options.reduce((sum, option) => sum + option.votes, 0);
  const deadlinePassed = new Date(vote.deadline).getTime() < Date.now();
  const canVote = !deadlinePassed && !vote.voted;

  const handleSelect = (optionId: string) => {
    if (!canVote) return;
    setSelectedOptions((prev) => {
      if (vote.multi) {
        return prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId];
      }
      return prev.includes(optionId) ? [] : [optionId];
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    if (selectedOptions.length === 0 || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIds: selectedOptions }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error?.message || data.code || '投票失败');
        return;
      }
      toast.success('投票成功');
      onVoteUpdate?.(post.id, data.data.options, data.data.total, true, selectedOptions);
    } catch (err) {
      console.error('投票失败:', err);
      toast.error('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn('space-y-2 rounded-none bg-leaf-50/60 p-2', className)} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <Link href={`/post/${post.id}`} onClick={(e) => e.stopPropagation()} className="min-w-0 flex-1">
          <Tooltip content={vote.question} className="max-w-[240px]">
            <div className="flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-leaf-800 transition-colors hover:text-leaf-600">
              <Icon name="vote" size={13} className="shrink-0" />
              <span className="line-clamp-1">{vote.question}</span>
            </div>
          </Tooltip>
        </Link>
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 text-[10px]',
            deadlinePassed ? 'bg-leaf-100 text-leaf-600' : 'bg-leaf-200 text-leaf-800'
          )}
        >
          {deadlinePassed ? '已截止' : '进行中'}
        </span>
        <span className="shrink-0 text-[10px] text-leaf-600">{vote.multi ? '多选' : '单选'}</span>
      </div>

      <div className="space-y-1.5">
        {vote.options.map((option, index) => {
          let pct = 0;
          if (total > 0) {
            if (index === vote.options.length - 1) {
              const sumBefore = vote.options.slice(0, index).reduce((sum, item) => sum + item.votes, 0);
              pct = Number((((total - sumBefore) / total) * 100).toFixed(1));
            } else {
              pct = Number(((option.votes / total) * 100).toFixed(1));
            }
          }
          const isSelected = selectedOptions.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              aria-disabled={!canVote}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (canVote) handleSelect(option.id);
              }}
              className={cn(
                'relative w-full overflow-hidden rounded px-1 py-1 text-left transition-all',
                canVote && 'cursor-pointer hover:bg-leaf-100 hover:shadow-sm active:bg-leaf-200',
                isSelected ? 'bg-leaf-200/40' : 'bg-white/70',
                !canVote && 'cursor-default'
              )}
            >
              <span className="absolute inset-y-0 left-0 bg-leaf-200" style={{ width: `${pct}%` }} />
              <span className="relative flex items-center justify-between gap-1 text-[11px]">
                <span className="flex min-w-0 flex-1 items-center gap-1">
                  <span className="w-[10px] shrink-0 text-center font-bold text-leaf-600">{isSelected ? '✓' : ''}</span>
                  <span className="truncate text-leaf-900">{option.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-leaf-700">
                  {pct}% <span className="text-leaf-600">({option.votes}票)</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-leaf-700/80">{total} 票</span>
        {canVote && (
          <button
            type="button"
            className="rounded bg-leaf-500 px-3 py-1 text-[10px] font-medium text-white transition-colors hover:bg-leaf-600 disabled:opacity-50"
            disabled={selectedOptions.length === 0 || submitting}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleSubmit();
            }}
          >
            {submitting ? '提交中...' : '提交投票'}
          </button>
        )}
        {vote.voted && (
          <span className="rounded bg-leaf-200/60 px-3 py-1 text-[10px] font-medium text-leaf-700">已投票</span>
        )}
        {!canVote && !vote.voted && deadlinePassed && (
          <span className="rounded bg-leaf-100 px-3 py-1 text-[10px] font-medium text-leaf-600">已截止</span>
        )}
      </div>
    </div>
  );
}
