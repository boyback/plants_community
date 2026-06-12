'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Post } from '@/lib/types';
import { cn } from '@/lib/utils';
import { api, ApiError } from "@/lib/client-api";
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { useRouter } from 'next/navigation';
import { PostContentView } from '@/components/post/PostContentView';
import { toast } from '@/components/ui/Toast';
import styles from './PostBody.module.scss';
import { cx } from '@/lib/style-utils';



/** 根据帖子类型渲染主体内容 */
export function PostBody({
  post,
  initialAttending = false,
  livePhotoMap





}: {post: Post;initialAttending?: boolean; /** 图片 URL → Live Photo 视频 URL 映射(详情页 server 端反查后传入) */livePhotoMap?: Record<string, string>;}) {
  switch (post.type) {
    case 'rich':
      return <PostContentView json={post.contentJson} html={post.content} />;
    case 'image':
      return <ImageBody post={post} livePhotoMap={livePhotoMap} />;
    case 'short':
      return <ShortBody post={post} livePhotoMap={livePhotoMap} />;
    case 'video':
      return <VideoBody post={post} livePhotoMap={livePhotoMap} />;
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

function JournalBody({ post }: {post: Post;}) {
  if (!post.journal) return null;
  const j = post.journal;
  const status =
  j.endReason === 'alive' ?
  { emoji: '🌱', label: '仍在养', color: styles.r_5f6a59f1 } :
  j.endReason === 'withered' ?
  { emoji: '🥀', label: '已枯死', color: styles.r_b54428d1 } :
  j.endReason === 'gifted' ?
  { emoji: '🎁', label: '已送人', color: styles.r_85d79ebf } :
  j.endReason === 'finished' ?
  { emoji: '✅', label: '已结束', color: styles.r_b17d6a13 } :
  { emoji: '📌', label: '其他', color: styles.r_5f6a59f1 };
  return (
    <div className={cx(styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_efb55408, styles.r_8e63407b)}>
      <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_9a638cfe)}>
        <Stat label="对象">
          <div className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>{j.subjectName}</div>
          {j.speciesName &&
          <div className={cx(styles.r_359090c2, styles.r_21d33c50)}>🌱 {j.speciesName}</div>
          }
        </Stat>
        <Stat label="天数">
          <div className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>
            第 {j.daysSinceStart} 天
          </div>
          <div className={cx(styles.r_359090c2, styles.r_21d33c50)}>
            起 {new Date(j.startDate).toLocaleDateString()}
          </div>
        </Stat>
        <Stat label="状态">
          <div className={cn(cx(styles.r_4ee73492, styles.r_e83a7042), status.color)}>
            {status.emoji} {status.label}
          </div>
          <div className={cx(styles.r_359090c2, styles.r_21d33c50)}>📖 已记录 {j.entriesCount} 条</div>
        </Stat>
      </div>
    </div>);

}

function Stat({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div>
      <div className={cx(styles.r_65281709, styles.r_d058ca6d, styles.r_69335b95)}>{label}</div>
      {children}
    </div>);

}
function ShortBody({ post, livePhotoMap }: {post: Post;livePhotoMap?: Record<string, string>;}) {
  return <PostContentView html={post.content} images={post.images} livePhotoMap={livePhotoMap} />;
}

function ImageBody({ post, livePhotoMap }: {post: Post;livePhotoMap?: Record<string, string>;}) {
  return <PostContentView images={post.images} livePhotoMap={livePhotoMap} />;
}

function VideoBody({
  post,
  livePhotoMap



}: {post: Post;livePhotoMap?: Record<string, string>;}) {
  return (
    <div className={styles.r_3e7ce58d}>
      {post.videoUrl &&
      <div className={cx(styles.r_2cd02d11, styles.r_0c5e9137, styles.r_0595c69e)}>
          <video
          controls
          className={cx(styles.r_25245f7e, styles.r_6da6a3c3)}
          preload="metadata">

            <source src={post.videoUrl} type="video/mp4" />
          </video>
        </div>
      }
    </div>);

}

function VoteBody({ post }: {post: Post;}) {
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
    setSelected((prev) => {
      if (post.vote!.multi) {
        return prev.includes(optionId) ?
        prev.filter((id) => id !== optionId) :
        [...prev, optionId];
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
        headers: { "Content-Type": 'application/json' },
        body: JSON.stringify({ optionIds: selected })
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
    <div className={styles.r_3e7ce58d}>
      <PostContentView html={post.content} />
      <div className={cx(styles.r_6f7e013d, styles.r_0c5e9137, styles.r_a8a62ca4, styles.r_7660b450)}>
        {/* 问题 */}
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <span className={cx(styles.r_f50e2015, styles.r_69cdf25a, styles.r_2689f395, styles.r_e7eab4cb, styles.r_36e579c0, styles.r_7e0b7cdf)}>
            🗳️ {post.vote.question}
          </span>
          <span className={cx(styles.r_012fbd12, styles.r_45d82811, styles.r_465609a2, styles.r_07389a77, styles.r_1dc571a3, `${deadlinePassed ? cx(styles.r_f2b23104, styles.r_b17d6a13) : cx(styles.r_ae525718, styles.r_e7eab4cb)}`)}>
            {deadlinePassed ? '已截止' : '进行中'}
          </span>
          <span className={cx(styles.r_012fbd12, styles.r_1dc571a3, styles.r_b17d6a13)}>{post.vote.multi ? '多选' : '单选'}</span>
        </div>

        {/* 选项列表 */}
        <div className={styles.r_5a250822}>
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
                className={cn(cx(styles.r_d89972fe, styles.r_2cd02d11, styles.r_07389a77, styles.r_d8e0e382, styles.r_660d2eff, styles.r_0fe7d7d8),

                isSelectable && cx(styles.r_34516836, styles.r_2efc423a, styles.r_ab1dd417, styles.r_bd87640d),
                isSelected && styles.r_4d592586,
                !isSelectable && !isSelected && styles.r_b0b66d88
                )}>

                {/* 进度条 */}
                <div
                  className={cx(styles.r_da4dbfbc, styles.r_5f89f14a, styles.r_c78facc7, styles.r_ae525718)}
                  style={{ width: `${pct}%` }} />

                {/* 内容 */}
                <div className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_44ee8ba0, styles.r_d058ca6d)}>
                  <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_7e0b7cdf, styles.r_36e579c0)}>
                    <span className={cx(styles.r_5fe765d6, styles.r_ca6bf630, styles.r_b17d6a13, styles.r_69450ef1, styles.r_012fbd12)}>
                      {isSelected ? '✓' : ''}
                    </span>
                    <span className={cx(styles.r_f283ea9b, styles.r_fa5fa43b)}>{o.label}</span>
                  </div>
                  <span className={cx(styles.r_012fbd12, styles.r_3032cae0, styles.r_5f6a59f1)}>
                    {pct}% <span className={styles.r_b17d6a13}>({o.votes}票)</span>
                  </span>
                </div>
              </div>);

          })}
        </div>

        {/* 底部统计 */}
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <span className={cx(styles.r_d058ca6d, styles.r_21d33c50)}>{total} 票</span>
          {canVote &&
          <button
            type="button"
            className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_07389a77, styles.r_45499621, styles.r_72a4c7cd, styles.r_1dc571a3, styles.r_2689f395, styles.r_24f5f8c9, styles.r_ceb69a6b, styles.r_b29d8adb)}
            disabled={selected.length === 0 || submitting}
            onClick={handleSubmit}>

              {submitting ? '提交中...' : '提交投票'}
            </button>
          }
          {voted &&
          <span className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_07389a77, styles.r_c5eb17bf, styles.r_5f6a59f1, styles.r_1dc571a3, styles.r_2689f395)}>
              已投票
            </span>
          }
          {!canVote && !voted && deadlinePassed &&
          <span className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_07389a77, styles.r_f2b23104, styles.r_b17d6a13, styles.r_1dc571a3, styles.r_2689f395)}>
              已截止
            </span>
          }
        </div>
      </div>
    </div>);

}

function EventBody({ post, initialAttending }: {post: Post;initialAttending: boolean;}) {
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
      const res = await api.post<{joined: boolean;attendees: number;}>(
        `/api/posts/${post.id}/attend`
      );
      setJoined(res.joined);
      setAttendees(res.attendees);
    } catch {









      // ignore
    } finally {setBusy(false);}};return <div className={styles.r_3e7ce58d}>
      <div className={styles.r_2cd02d11}>
        {post.cover && <div className={cx(styles.r_d89972fe, styles.r_188a6e22, styles.r_6da6a3c3, styles.r_2cd02d11)}>
            <Image src={post.cover} alt={post.title} fill className={styles.r_7d85d0c2} unoptimized />
            <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_39b2e003, styles.r_612a29eb, styles.r_e06d4996)} />
          </div>}
        <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_0c3bc985, styles.r_c07e54fd, styles.r_9a638cfe)}>
          <InfoBlock icon="📅"
        title={t('detail.event.time')}
        value={`${startDate.toLocaleDateString()} ${startDate.
        toLocaleTimeString().
        slice(0, 5)}`} />

          <InfoBlock icon="📍" title={t('detail.event.location')} value={ev.location} />
          <InfoBlock icon="🙋" title={t('detail.event.attended')} value={t('detail.event.attendeesCount', { n: attendees })} />
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_b950dda2, styles.r_88b684d2, styles.r_d139dd09, styles.r_1b2d54a3)}>
          <div className={cx(styles.r_359090c2, styles.r_69335b95)}>
            {passed ? t('detail.event.ended') : t('detail.event.ongoing')}
          </div>
          <button
          type="button"
          disabled={passed || busy}
          onClick={toggle}
          className={cn(styles.r_af7490b1,

          joined ? cx(styles.r_5f48f96e, styles.r_06fd2bc1) :

          passed ? cx(styles.r_f2b23104, styles.r_b17d6a13, styles.r_29b733e4) : cx(styles.r_aea07fd2, styles.r_72a4c7cd, styles.r_de269b91)


          )}>

            {busy ? t('detail.event.processing') : joined ? t('detail.event.joined') : passed ? t('detail.event.endedLabel') : t('detail.event.join')}
          </button>
        </div>
      </div>

      <PostContentView json={post.contentJson} html={post.content} />
    </div>;

}

function InfoBlock({ icon, title, value }: {icon: string;title: string;value: string;}) {
  return (
    <div className={cx(styles.r_0c5e9137, styles.r_a8a62ca4, styles.r_eb6e8b88)}>
      <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>
        <span className={styles.r_61816240}>{icon}</span>
        {title}
      </div>
      <div className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{value}</div>
    </div>);

}