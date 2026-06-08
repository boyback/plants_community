'use client';

import { useState } from 'react';
import type { Post, JournalEntry, JournalStage } from '@/lib/types';
import { ALL_STAGES, STAGE_META } from '@/lib/journal';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { ImageGallery } from '@/components/ui/ImageGallery';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';

interface Props {
  post: Post;
  /** 当前用户 id;为本人时显示「添加新记录」按钮 */
  currentUserId?: string;
}

export function JournalTimeline({ post }: Props) {
  const { user } = useAuth();
  const isAuthor = user?.id === post.author.id;
  const [entries, setEntries] = useState<JournalEntry[]>(post.journal?.entries ?? []);
  const [adding, setAdding] = useState(false);

  if (!post.journal) return null;

  const handleDelete = async (entry: JournalEntry) => {
    try {
      await api.delete(`/api/posts/${post.id}/journal/${entry.id}`);
      setEntries(entries.filter(e => e.id !== entry.id));
      toast.success('已删除');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '删除失败');
    }
  };

  const sorted = [...entries].sort((a, b) => {
    const d = a.entryDate.localeCompare(b.entryDate);
    return d !== 0 ? d : a.orderIdx - b.orderIdx;
  });

  return (
    <section className="card overflow-hidden p-5 md:p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-800">
          🌿 时间线 · {entries.length} 条记录
        </h2>
        {isAuthor && (
          <button
            type="button"
            className="btn-primary !text-xs"
            onClick={() => setAdding(true)}
          >
            <Icon name="plus" size={14} />
            添加新记录
          </button>
        )}
      </header>

      {sorted.length === 0 ? (
        <div className="py-10 text-center text-sm text-leaf-700/70">
          还没有记录
        </div>
      ) : (
        <ol className="relative space-y-5 pl-5">
          {/* 垂直时间线 */}
          <span
            aria-hidden
            className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-leaf-200 via-leaf-300 to-leaf-200"
          />
          {sorted.map((e, i) => (
            <EntryNode
              key={e.id}
              entry={e}
              startDate={post.journal!.startDate}
              isFirst={i === 0}
              isLast={i === sorted.length - 1}
            />
          ))}
        </ol>
      )}

      {adding && (
        <AddEntryDialog
          postId={post.id}
          onClose={() => setAdding(false)}
          onAdded={(entry) => {
            setEntries([...entries, entry]);
            setAdding(false);
            toast.success('已添加');
          }}
        />
      )}

    </section>
  );
}

function EntryNode({
  entry,
  startDate,
  isFirst,
  isLast,
}: {
  entry: JournalEntry;
  startDate: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const meta = STAGE_META[entry.stage] || STAGE_META.other;
  const stageText = entry.stage === 'other' && entry.stageLabel ? entry.stageLabel : meta.zh;
  const date = new Date(entry.entryDate);
  const start = new Date(startDate);
  const day = Math.floor(
    (date.getTime() - start.getTime()) / 86400_000
  );

  return (
    <li className="relative group">
      <span
        aria-hidden
        className={cn(
          'absolute -left-[15px] top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-leaf-500 text-[10px] text-white shadow',
          isFirst && 'ring-2 ring-leaf-300'
        )}
      >
        {meta.emoji}
      </span>
      <div className="pl-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-800">
            {date.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })}
          </span>
          <span className="text-[11px] text-leaf-700/70">第 {day < 0 ? 0 : day} 天</span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]',
              meta.color
            )}
          >
            {meta.emoji} {stageText}
          </span>
        </div>
        {entry.note && (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-800/90">
            {entry.note}
          </p>
        )}
        {entry.images.length > 0 && (
          <ImageGallery images={entry.images} />
        )}
      </div>
    </li>
  );
}

function AddEntryDialog({
  postId,
  onClose,
  onAdded,
}: {
  postId: string;
  onClose: () => void;
  onAdded: (e: JournalEntry) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [entryDate, setEntryDate] = useState(today);
  const [stage, setStage] = useState<JournalStage>('growing');
  const [stageLabel, setStageLabel] = useState('');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imgInput, setImgInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!entryDate) return setErr('请选择日期');
    if (stage === 'other' && !stageLabel.trim()) return setErr('选择其他阶段时，请填写阶段名称');
    if (images.length === 0) return setErr('每条成长记录都需要上传配图');
    setBusy(true);
    setErr('');
    try {
      const r = await api.post<JournalEntry>(
        `/api/posts/${postId}/journal`,
        {
          entryDate: new Date(entryDate).toISOString(),
          stage,
          stageLabel: stage === 'other' ? stageLabel.trim() : undefined,
          note,
          images,
        }
      );
      onAdded(r);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '提交失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="card w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">添加新记录</h3>
          <button onClick={onClose} className="text-leaf-700/70 hover:text-leaf-700">
            ×
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <div className="mb-1 text-xs text-leaf-700/80">日期</div>
              <input
                type="date"
                className="input"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs text-leaf-700/80">阶段</div>
              <select
                className="input"
                value={stage}
                onChange={(e) => {
                  const next = e.target.value as JournalStage;
                  setStage(next);
                  if (next !== 'other') setStageLabel('');
                }}
              >
                {ALL_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_META[s].emoji} {STAGE_META[s].zh}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {stage === 'other' && (
            <label className="block">
              <div className="mb-1 text-xs text-leaf-700/80">
                <span className="text-rose-500">*</span> 其他阶段
              </div>
              <input
                className="input"
                value={stageLabel}
                onChange={(e) => setStageLabel(e.target.value)}
                maxLength={50}
                placeholder="例如：服盆、控养、修根"
              />
            </label>
          )}
          <label className="block">
            <div className="mb-1 text-xs text-leaf-700/80">心得</div>
            <textarea
              className="input min-h-[80px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="今天的状态…"
            />
          </label>
          <div>
            <div className="mb-1 text-xs text-leaf-700/80">
              <span className="text-rose-500">*</span> 图片
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="粘贴图片 URL…"
                value={imgInput}
                onChange={(e) => setImgInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const u = imgInput.trim();
                    if (u && !images.includes(u))
                      setImages([...images, u].slice(0, 9));
                    setImgInput('');
                  }
                }}
              />
              <button
                type="button"
                className="btn-outline !px-3"
                onClick={() => {
                  const u = imgInput.trim();
                  if (u && !images.includes(u))
                    setImages([...images, u].slice(0, 9));
                  setImgInput('');
                }}
              >
                <Icon name="plus" size={14} />
              </button>
            </div>
            {images.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {images.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div key={i} className="relative">
                    <img src={u} alt="" className="h-16 w-full rounded object-cover" />
                    <button
                      type="button"
                      className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/60 text-[10px] text-white"
                      onClick={() => setImages(images.filter((_, k) => k !== i))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {err && <div className="mt-2 text-xs text-rose-600">{err}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? '提交中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditEntryDialog({
  postId,
  entry,
  onClose,
  onUpdated,
}: {
  postId: string;
  entry: JournalEntry;
  onClose: () => void;
  onUpdated: (e: JournalEntry) => void;
}) {
  const [entryDate, setEntryDate] = useState(entry.entryDate.slice(0, 10));
  const [stage, setStage] = useState<JournalStage>(entry.stage);
  const [stageLabel, setStageLabel] = useState(entry.stageLabel ?? '');
  const [note, setNote] = useState(entry.note);
  const [images, setImages] = useState<string[]>(entry.images);
  const [imgInput, setImgInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!entryDate) return setErr('请选择日期');
    if (stage === 'other' && !stageLabel.trim()) return setErr('选择其他阶段时，请填写阶段名称');
    setBusy(true);
    setErr('');
    try {
      await api.patch(
        `/api/posts/${postId}/journal/${entry.id}`,
        {
          entryDate: new Date(entryDate).toISOString(),
          stage,
          stageLabel: stage === 'other' ? stageLabel.trim() : undefined,
          note,
          images,
        }
      );
      onUpdated({
        ...entry,
        entryDate: new Date(entryDate).toISOString(),
        stage,
        stageLabel: stage === 'other' ? stageLabel.trim() : undefined,
        note,
        images,
      });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '更新失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="card w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">编辑记录</h3>
          <button onClick={onClose} className="text-leaf-700/70 hover:text-leaf-700">
            ×
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <div className="mb-1 text-xs text-leaf-700/80">日期</div>
              <input
                type="date"
                className="input"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs text-leaf-700/80">阶段</div>
              <select
                className="input"
                value={stage}
                onChange={(e) => {
                  const next = e.target.value as JournalStage;
                  setStage(next);
                  if (next !== 'other') setStageLabel('');
                }}
              >
                {ALL_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_META[s].emoji} {STAGE_META[s].zh}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {stage === 'other' && (
            <label className="block">
              <div className="mb-1 text-xs text-leaf-700/80">
                <span className="text-rose-500">*</span> 其他阶段
              </div>
              <input
                className="input"
                value={stageLabel}
                onChange={(e) => setStageLabel(e.target.value)}
                maxLength={50}
                placeholder="例如：服盆、控养、修根"
              />
            </label>
          )}
          <label className="block">
            <div className="mb-1 text-xs text-leaf-700/80">心得</div>
            <textarea
              className="input min-h-[80px]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="今天的状态…"
            />
          </label>
          <div>
            <div className="mb-1 text-xs text-leaf-700/80">图片(选填)</div>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="粘贴图片 URL…"
                value={imgInput}
                onChange={(e) => setImgInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const u = imgInput.trim();
                    if (u && !images.includes(u))
                      setImages([...images, u].slice(0, 9));
                    setImgInput('');
                  }
                }}
              />
              <button
                type="button"
                className="btn-outline !px-3"
                onClick={() => {
                  const u = imgInput.trim();
                  if (u && !images.includes(u))
                    setImages([...images, u].slice(0, 9));
                  setImgInput('');
                }}
              >
                <Icon name="plus" size={14} />
              </button>
            </div>
            {images.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {images.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div key={i} className="relative">
                    <img src={u} alt="" className="h-16 w-full rounded object-cover" />
                    <button
                      type="button"
                      className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/60 text-[10px] text-white"
                      onClick={() => setImages(images.filter((_, k) => k !== i))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {err && <div className="mt-2 text-xs text-rose-600">{err}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? '更新中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
