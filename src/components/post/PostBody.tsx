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
import { Lightbox } from '@/components/ui/Lightbox';

/** 根据帖子类型渲染主体内容 */
export function PostBody({
  post,
  initialVoted = [],
  initialAttending = false,
  livePhotoMap,
}: {
  post: Post;
  initialVoted?: string[];
  initialAttending?: boolean;
  /** 图片 URL → Live Photo 视频 URL 映射(详情页 server 端反查后传入) */
  livePhotoMap?: Record<string, string>;
}) {
  switch (post.type) {
    case 'rich':
      return <RichBody post={post} livePhotoMap={livePhotoMap} />;
    case 'short':
      return <ShortBody post={post} livePhotoMap={livePhotoMap} />;
    case 'video':
      return <VideoBody post={post} />;
    case 'vote':
      return <VoteBody post={post} initialVoted={initialVoted} />;
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

function RichBody({
  post,
  livePhotoMap,
}: {
  post: Post;
  livePhotoMap?: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <RichTextView json={post.contentJson} html={post.content} />
      {post.images && post.images.length > 0 && (
        <ImageGallery images={post.images} livePhotoMap={livePhotoMap} />
      )}
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
      <p className="whitespace-pre-wrap text-[15px] leading-7 text-ink-800">{post.content}</p>
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
            poster={post.cover}
            className="aspect-video w-full"
            preload="metadata"
          >
            <source src={post.videoUrl} type="video/mp4" />
          </video>
        </div>
      )}
      <p className="whitespace-pre-wrap text-[15px] leading-7 text-ink-800">{post.content}</p>
    </div>
  );
}

function VoteBody({ post, initialVoted }: { post: Post; initialVoted: string[] }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialVoted);
  const [voted, setVoted] = useState(initialVoted.length > 0);
  const [options, setOptions] = useState(post.vote?.options ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!post.vote) return null;

  const total = options.reduce((s, o) => s + o.votes, 0);
  const deadlinePassed = new Date(post.vote.deadline).getTime() < Date.now();

  const toggle = (id: string) => {
    if (voted || deadlinePassed) return;
    setSelected((prev) => {
      if (post.vote!.multi) {
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return [id];
    });
  };

  const submit = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    setErr(null);
    setSubmitting(true);
    try {
      const res = await api.post<{
        options: { id: string; label: string; votes: number }[];
      }>(`/api/posts/${post.id}/vote`, { optionIds: selected });
      setOptions(res.options);
      setVoted(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('detail.vote.voteFail'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="whitespace-pre-wrap text-[15px] leading-7 text-ink-800">{post.content}</p>
      <div className="rounded-none border border-amber-100 bg-amber-50/30 p-5">
        <div className="mb-1 text-xs text-amber-700">
          {t('detail.vote.title', {
            mode: post.vote.multi ? t('detail.vote.multi') : t('detail.vote.single'),
            date: new Date(post.vote.deadline).toLocaleDateString(),
          })}
          {deadlinePassed && <span className="ml-2 rounded bg-amber-200/60 px-1.5 py-0.5">{t('detail.vote.ended')}</span>}
        </div>
        <h3 className="text-base font-semibold text-amber-900">{post.vote.question}</h3>
        <div className="mt-4 space-y-2">
          {options.map((o) => {
            const chosen = selected.includes(o.id);
            const pct = total ? Math.round((o.votes / total) * 100) : 0;
            const showResult = voted || deadlinePassed;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.id)}
                disabled={voted || deadlinePassed}
                className={cn(
                  'relative block w-full overflow-hidden rounded-none border px-4 py-2.5 text-left text-sm transition-colors',
                  chosen
                    ? 'border-amber-500 bg-amber-100/60'
                    : 'border-amber-100 bg-white hover:bg-amber-50'
                )}
              >
                {showResult && (
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0',
                      chosen ? 'bg-amber-300/40' : 'bg-amber-200/30'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-block h-4 w-4 shrink-0 rounded-full border-2',
                        post.vote!.multi ? 'rounded-[4px]' : '',
                        chosen ? 'border-amber-500 bg-amber-500' : 'border-amber-300 bg-white'
                      )}
                    />
                    {o.label}
                  </span>
                  {showResult && (
                    <span className="text-xs tabular-nums text-amber-700">
                      {pct}% ({o.votes})
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-amber-700">
          <span>{t('detail.vote.totalParticipants', { n: total })}</span>
          {!voted && !deadlinePassed && (
            <button
              type="button"
              disabled={selected.length === 0 || submitting}
              onClick={submit}
              className="btn-primary h-8 !px-4 !text-xs bg-amber-500 hover:bg-amber-600"
            >
              {submitting ? t('detail.vote.submitting') : t('detail.vote.submit')}
            </button>
          )}
        </div>
        {err && <div className="mt-2 text-xs text-rose-600">{err}</div>}
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

function ImageGallery({
  images,
  livePhotoMap,
}: {
  images: string[];
  livePhotoMap?: Record<string, string>;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<number | null>(null);

  // 自适应布局策略:
  //   1: 单张大图(16/10)
  //   2: 左右对半(square)
  //   3: 左大右上下(IG 式)
  //   4: 2x2 田字
  //   5+: 大图 + 缩略,最多 4 张可见,5+ 时最后一格遮罩 +N
  const n = images.length;
  const display = images.slice(0, n >= 5 ? 4 : n);
  const remain = n - display.length;

  let layoutClass = '';
  let cellClass = (i: number) => {
    void i;
    return 'aspect-square';
  };

  if (n === 1) {
    layoutClass = 'grid-cols-1';
    cellClass = () => 'aspect-[16/10]';
  } else if (n === 2) {
    layoutClass = 'grid-cols-2';
    cellClass = () => 'aspect-square';
  } else if (n === 3) {
    // 第一张大,占两行;后两张右侧叠
    layoutClass = 'grid-cols-3 grid-rows-2 h-[260px] md:h-[320px]';
    cellClass = (i) => (i === 0 ? 'col-span-2 row-span-2' : '');
  } else {
    // n>=4
    layoutClass = 'grid-cols-2';
    cellClass = () => 'aspect-square';
  }

  return (
    <>
      <div className={cn('grid gap-2 overflow-hidden rounded-none', layoutClass)}>
        {display.map((src, i) => {
          const showRemain = i === display.length - 1 && remain > 0;
          const isLive = !!livePhotoMap?.[src];
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'relative overflow-hidden bg-leaf-50',
                cellClass(i)
              )}
            >
              <Image
                src={src}
                alt={t('detail.gallery.imgAlt', { n: i + 1 })}
                fill
                sizes="(max-width:768px) 50vw, 400px"
                className="object-cover transition-transform hover:scale-105"
                unoptimized
              />
              {isLive && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white shadow"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  LIVE
                </span>
              )}
              {showRemain && (
                <div className="absolute inset-0 grid place-items-center bg-ink-900/50 text-2xl font-bold text-white">
                  +{remain}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <Lightbox
        images={images}
        index={active}
        onClose={() => setActive(null)}
        onChange={setActive}
        livePhotoMap={livePhotoMap}
      />
    </>
  );
}
