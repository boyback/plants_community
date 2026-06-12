'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/Toast';
import { Tooltip } from '@/components/ui/Tooltip';
import { Icon } from '@/components/ui/Icon';
import styles from './PostVotePreview.module.scss';
import { cx } from '@/lib/style-utils';



export type PostVoteUpdateHandler = (
postId: string,
options: {id: string;label: string;votes: number;}[],
total: number,
voted: boolean,
votedOptionIds: string[])
=> void;

export function PostVotePreview({
  post,
  onVoteUpdate,
  className




}: {post: Post;onVoteUpdate?: PostVoteUpdateHandler;className?: string;}) {
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
        headers: { "Content-Type": 'application/json' },
        body: JSON.stringify({ optionIds: selectedOptions })
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error?.message || data.code || '投票失败');
        return;
      }
      toast.success('投票成功');
      onVoteUpdate?.(post.id, data.data.options, data.data.total, true, selectedOptions);
    } catch (err) {
      console.error("投票失败:", err);
      toast.error('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn(cx(styles.r_6f7e013d, styles.r_0c5e9137, styles.r_a8a62ca4, styles.r_7660b450), className)} onClick={(e) => e.stopPropagation()}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
        <Link href={`/post/${post.id}`} onClick={(e) => e.stopPropagation()} className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
          <Tooltip content={vote.question} className={styles.r_2661bcf3}>
            <div className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_3960ffc2, styles.r_58284b4e, styles.r_69cdf25a, styles.r_2689f395, styles.r_e7eab4cb, styles.r_ceb69a6b, styles.r_c67dcce9)}>
              <Icon name="vote" size={13} className={styles.r_012fbd12} />
              <span className={styles.r_f50e2015}>{vote.question}</span>
            </div>
          </Tooltip>
        </Link>
        <span
          className={cn(cx(styles.r_012fbd12, styles.r_07389a77, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3),

          deadlinePassed ? cx(styles.r_f2b23104, styles.r_b17d6a13) : cx(styles.r_ae525718, styles.r_e7eab4cb)
          )}>

          {deadlinePassed ? '已截止' : '进行中'}
        </span>
        <span className={cx(styles.r_012fbd12, styles.r_1dc571a3, styles.r_b17d6a13)}>{vote.multi ? '多选' : '单选'}</span>
      </div>

      <div className={styles.r_5a250822}>
        {vote.options.map((option, index) => {
          let pct = 0;
          if (total > 0) {
            if (index === vote.options.length - 1) {
              const sumBefore = vote.options.slice(0, index).reduce((sum, item) => sum + item.votes, 0);
              pct = Number(((total - sumBefore) / total * 100).toFixed(1));
            } else {
              pct = Number((option.votes / total * 100).toFixed(1));
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
              className={cn(cx(styles.r_d89972fe, styles.r_6da6a3c3, styles.r_2cd02d11, styles.r_07389a77, styles.r_d8e0e382, styles.r_660d2eff, styles.r_2eba0d65, styles.r_0fe7d7d8),

              canVote && cx(styles.r_34516836, styles.r_2efc423a, styles.r_ab1dd417, styles.r_bd87640d),
              isSelected ? styles.r_4d592586 : styles.r_b0b66d88,
              !canVote && styles.r_50ca6ba5
              )}>

              <span className={cx(styles.r_da4dbfbc, styles.r_5f89f14a, styles.r_c78facc7, styles.r_ae525718)} style={{ width: `${pct}%` }} />
              <span className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_44ee8ba0, styles.r_d058ca6d)}>
                <span className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_3960ffc2, styles.r_44ee8ba0)}>
                  <span className={cx(styles.r_5fe765d6, styles.r_012fbd12, styles.r_ca6bf630, styles.r_69450ef1, styles.r_b17d6a13)}>{isSelected ? '✓' : ''}</span>
                  <span className={cx(styles.r_f283ea9b, styles.r_fa5fa43b)}>{option.label}</span>
                </span>
                <span className={cx(styles.r_012fbd12, styles.r_3032cae0, styles.r_5f6a59f1)}>
                  {pct}% <span className={styles.r_b17d6a13}>({option.votes}票)</span>
                </span>
              </span>
            </button>);

        })}
      </div>

      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <span className={cx(styles.r_d058ca6d, styles.r_21d33c50)}>{total} 票</span>
        {canVote &&
        <button
          type="button"
          className={cx(styles.r_07389a77, styles.r_45499621, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_1dc571a3, styles.r_2689f395, styles.r_72a4c7cd, styles.r_ceb69a6b, styles.r_24f5f8c9, styles.r_b29d8adb)}
          disabled={selectedOptions.length === 0 || submitting}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleSubmit();
          }}>

            {submitting ? '提交中...' : '提交投票'}
          </button>
        }
        {vote.voted &&
        <span className={cx(styles.r_07389a77, styles.r_c5eb17bf, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_1dc571a3, styles.r_2689f395, styles.r_5f6a59f1)}>已投票</span>
        }
        {!canVote && !vote.voted && deadlinePassed &&
        <span className={cx(styles.r_07389a77, styles.r_f2b23104, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_1dc571a3, styles.r_2689f395, styles.r_b17d6a13)}>已截止</span>
        }
      </div>
    </div>);

}