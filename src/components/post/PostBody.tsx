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
}: {
  post: Post;
  initialVoted?: string[];
  initialAttending?: boolean;
}) {
  switch (post.type) {
    case 'rich':
      return <RichBody post={post} />;
    case 'short':
      return <ShortBody post={post} />;
    case 'video':
      return <VideoBody post={post} />;
    case 'vote':
      return <VoteBody post={post} initialVoted={initialVoted} />;
    case 'event':
      return <EventBody post={post} initialAttending={initialAttending} />;
    default:
      return null;
  }
}

function RichBody({ post }: { post: Post }) {
  return (
    <div className="space-y-4">
      <RichTextView json={post.contentJson} html={post.content} />
      {post.images && post.images.length > 0 && <ImageGallery images={post.images} />}
    </div>
  );
}

function ShortBody({ post }: { post: Post }) {
  return (
    <div className="space-y-4">
      <p className="whitespace-pre-wrap text-[15px] leading-7 text-ink-800">{post.content}</p>
      {post.images && post.images.length > 0 && <ImageGallery images={post.images} />}
    </div>
  );
}

function VideoBody({ post }: { post: Post }) {
  return (
    <div className="space-y-4">
      {post.videoUrl && (
        <div className="overflow-hidden rounded-2xl bg-black">
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
      <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-5">
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
                  'relative block w-full overflow-hidden rounded-lg border px-4 py-2.5 text-left text-sm transition-colors',
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
    <div className="rounded-xl bg-leaf-50/60 p-3">
      <div className="text-[11px] text-leaf-700/70">
        <span className="mr-1">{icon}</span>
        {title}
      </div>
      <div className="mt-1 text-sm font-medium text-ink-800">{value}</div>
    </div>
  );
}

function ImageGallery({ images }: { images: string[] }) {
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
      <div className={cn('grid gap-2 overflow-hidden rounded-lg', layoutClass)}>
        {display.map((src, i) => {
          const showRemain = i === display.length - 1 && remain > 0;
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
      />
    </>
  );
}
