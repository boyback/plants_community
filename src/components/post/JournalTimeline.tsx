'use client';

import { useState } from 'react';
import type { Post, JournalEntry, JournalStage } from '@/lib/types';
import { ALL_STAGES, STAGE_META } from '@/lib/journal';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { ImageGallery } from '@/components/ui/ImageGallery';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './JournalTimeline.module.scss';
import { cx } from '@/lib/style-utils';



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
      setEntries(entries.filter((e) => e.id !== entry.id));
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
    <section className={cx(styles.r_2cd02d11, styles.r_c07e54fd, styles.r_97effa3f)}>
      <header className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <h2 className={cx(styles.r_42536e69, styles.r_e83a7042, styles.r_399e11a5)}>
          🌿 时间线 · {entries.length} 条记录
        </h2>
        {isAuthor &&
        <button
          type="button"
          className={styles.r_dd702538}
          onClick={() => setAdding(true)}>

            <Icon name="plus" size={14} />
            添加新记录
          </button>
        }
      </header>

      {sorted.length === 0 ?
      <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_69335b95)}>
          还没有记录
        </div> :

      <ol className={cx(styles.r_d89972fe, styles.r_b43b4c08, styles.r_1512159b)}>
          {/* 垂直时间线 */}
          <span
          aria-hidden
          className={cx(styles.r_da4dbfbc, styles.r_d83be576, styles.r_9a2db8f9, styles.r_f6babb33, styles.r_47a69140, styles.r_24a9e3ad, styles.r_50f960a5, styles.r_a4cf77bd, styles.r_280245bf)} />

          {sorted.map((e, i) =>
        <EntryNode
          key={e.id}
          entry={e}
          startDate={post.journal!.startDate}
          isFirst={i === 0}
          isLast={i === sorted.length - 1} />

        )}
        </ol>
      }

      {adding &&
      <AddEntryDialog
        postId={post.id}
        onClose={() => setAdding(false)}
        onAdded={(entry) => {
          setEntries([...entries, entry]);
          setAdding(false);
          toast.success('已添加');
        }} />

      }

    </section>);

}

function EntryNode({
  entry,
  startDate,
  isFirst,
  isLast





}: {entry: JournalEntry;startDate: string;isFirst: boolean;isLast: boolean;}) {
  const meta = STAGE_META[entry.stage] || STAGE_META.other;
  const stageText = entry.stage === 'other' && entry.stageLabel ? entry.stageLabel : meta.zh;
  const date = new Date(entry.entryDate);
  const start = new Date(startDate);
  const day = Math.floor(
    (date.getTime() - start.getTime()) / 86400_000
  );

  return (
    <li className={cx(styles.r_d89972fe, styles.r_64292b1c)}>
      <span
        aria-hidden
        className={cn(cx(styles.r_da4dbfbc, styles.r_9b4ec91e, styles.r_b1044d86, styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_65935df5, styles.r_2fe59630, styles.r_45499621, styles.r_1dc571a3, styles.r_72a4c7cd, styles.r_ed9d3d83),

        isFirst && cx(styles.r_16b1efa5, styles.r_9b87abcd)
        )}>

        {meta.emoji}
      </span>
      <div className={styles.r_81976f3f}>
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <span className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>
            {date.toLocaleDateString("zh-CN", {
              year: 'numeric',
              month: "2-digit",
              day: "2-digit"
            })}
          </span>
          <span className={cx(styles.r_d058ca6d, styles.r_69335b95)}>第 {day < 0 ? 0 : day} 天</span>
          <span
            className={cn(cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d),

            meta.color
            )}>

            {meta.emoji} {stageText}
          </span>
        </div>
        {entry.note &&
        <p className={cx(styles.r_b6b02c0e, styles.r_a2edcb1a, styles.r_fc7473ca, styles.r_18550d59, styles.r_6ee7f802)}>
            {entry.note}
          </p>
        }
        {entry.images.length > 0 &&
        <ImageGallery images={entry.images} />
        }
      </div>
    </li>);

}

function AddEntryDialog({
  postId,
  onClose,
  onAdded




}: {postId: string;onClose: () => void;onAdded: (e: JournalEntry) => void;}) {
  useBodyScrollLock(true);

  const today = new Date().toISOString().slice(0, 10);
  const [entryDate, setEntryDate] = useState(today);
  const [stage, setStage] = useState<JournalStage>("growing");
  const [stageLabel, setStageLabel] = useState('');
  const [note, setNote] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imgInput, setImgInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!entryDate) return setErr('请选择日期');
    if (stage === 'other' && !stageLabel.trim()) return setErr('选择其他阶段时，请填写阶段名称');
    if (images.length === 0) return setErr('每条记录都需要上传配图');
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
          images
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
    <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_f3c543ad, styles.r_67d66567, styles.r_fd9dca32, styles.r_8e63407b)} onClick={onClose}>
      <div
        className={cx(styles.r_6da6a3c3, styles.r_9794ab45, styles.r_c07e54fd)}
        onClick={(e) => e.stopPropagation()}>

        <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <h3 className={cx(styles.r_4ee73492, styles.r_e83a7042)}>添加新记录</h3>
          <button onClick={onClose} className={cx(styles.r_69335b95, styles.r_9825203a)}>
            ×
          </button>
        </div>
        <div className={styles.r_6ed543e2}>
          <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_77a2a20e)}>
            <label className={styles.r_0214b4b3}>
              <div className={cx(styles.r_65281709, styles.r_359090c2, styles.r_21d33c50)}>日期</div>
              <input
                type="date"
                className="input"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)} />

            </label>
            <label className={styles.r_0214b4b3}>
              <div className={cx(styles.r_65281709, styles.r_359090c2, styles.r_21d33c50)}>阶段</div>
              <select
                className="input"
                value={stage}
                onChange={(e) => {
                  const next = e.target.value as JournalStage;
                  setStage(next);
                  if (next !== 'other') setStageLabel('');
                }}>

                {ALL_STAGES.map((s) =>
                <option key={s} value={s}>
                    {STAGE_META[s].emoji} {STAGE_META[s].zh}
                  </option>
                )}
              </select>
            </label>
          </div>
          {stage === 'other' &&
          <label className={styles.r_0214b4b3}>
              <div className={cx(styles.r_65281709, styles.r_359090c2, styles.r_21d33c50)}>
                <span className={styles.r_fa512798}>*</span> 其他阶段
              </div>
              <input
              className="input"
              value={stageLabel}
              onChange={(e) => setStageLabel(e.target.value)}
              maxLength={50}
              placeholder="例如：服盆、控养、修根" />

            </label>
          }
          <label className={styles.r_0214b4b3}>
            <div className={cx(styles.r_65281709, styles.r_359090c2, styles.r_21d33c50)}>心得</div>
            <textarea
              className={styles.r_dd9ce2a7}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="今天的状态…" />

          </label>
          <div>
            <div className={cx(styles.r_65281709, styles.r_359090c2, styles.r_21d33c50)}>
              <span className={styles.r_fa512798}>*</span> 图片
            </div>
            <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
              <input
                className={styles.r_36e579c0}
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
                }} />

              <button
                type="button"
                className={styles.r_23b4e5ed}
                onClick={() => {
                  const u = imgInput.trim();
                  if (u && !images.includes(u))
                  setImages([...images, u].slice(0, 9));
                  setImgInput('');
                }}>

                <Icon name="plus" size={14} />
              </button>
            </div>
            {images.length > 0 &&
            <div className={cx(styles.r_50d0d216, styles.r_f3c543ad, styles.r_be2e831b, styles.r_77a2a20e)}>
                {images.map((u, i) =>
              // eslint-disable-next-line @next/next/no-img-element
              <div key={i} className={styles.r_d89972fe}>
                    <img src={u} alt="" className={cx(styles.r_acaee621, styles.r_6da6a3c3, styles.r_07389a77, styles.r_7d85d0c2)} />
                    <button
                  type="button"
                  className={cx(styles.r_da4dbfbc, styles.r_26de51ee, styles.r_1af92b74, styles.r_f3c543ad, styles.r_11e59c6d, styles.r_dc7972eb, styles.r_67d66567, styles.r_ac204c10, styles.r_db1c7bcb, styles.r_1dc571a3, styles.r_72a4c7cd)}
                  onClick={() => setImages(images.filter((_, k) => k !== i))}>

                      ×
                    </button>
                  </div>
              )}
              </div>
            }
          </div>
        </div>
        {err && <div className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_595fceba)}>{err}</div>}
        <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
          <button className="btn-outline" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? '提交中…' : '保存'}
          </button>
        </div>
      </div>
    </div>);

}

function EditEntryDialog({
  postId,
  entry,
  onClose,
  onUpdated





}: {postId: string;entry: JournalEntry;onClose: () => void;onUpdated: (e: JournalEntry) => void;}) {
  useBodyScrollLock(true);

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
          images
        }
      );
      onUpdated({
        ...entry,
        entryDate: new Date(entryDate).toISOString(),
        stage,
        stageLabel: stage === 'other' ? stageLabel.trim() : undefined,
        note,
        images
      });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '更新失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_f3c543ad, styles.r_67d66567, styles.r_fd9dca32, styles.r_8e63407b)} onClick={onClose}>
      <div
        className={cx(styles.r_6da6a3c3, styles.r_9794ab45, styles.r_c07e54fd)}
        onClick={(e) => e.stopPropagation()}>

        <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <h3 className={cx(styles.r_4ee73492, styles.r_e83a7042)}>编辑记录</h3>
          <button onClick={onClose} className={cx(styles.r_69335b95, styles.r_9825203a)}>
            ×
          </button>
        </div>
        <div className={styles.r_6ed543e2}>
          <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_77a2a20e)}>
            <label className={styles.r_0214b4b3}>
              <div className={cx(styles.r_65281709, styles.r_359090c2, styles.r_21d33c50)}>日期</div>
              <input
                type="date"
                className="input"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)} />

            </label>
            <label className={styles.r_0214b4b3}>
              <div className={cx(styles.r_65281709, styles.r_359090c2, styles.r_21d33c50)}>阶段</div>
              <select
                className="input"
                value={stage}
                onChange={(e) => {
                  const next = e.target.value as JournalStage;
                  setStage(next);
                  if (next !== 'other') setStageLabel('');
                }}>

                {ALL_STAGES.map((s) =>
                <option key={s} value={s}>
                    {STAGE_META[s].emoji} {STAGE_META[s].zh}
                  </option>
                )}
              </select>
            </label>
          </div>
          {stage === 'other' &&
          <label className={styles.r_0214b4b3}>
              <div className={cx(styles.r_65281709, styles.r_359090c2, styles.r_21d33c50)}>
                <span className={styles.r_fa512798}>*</span> 其他阶段
              </div>
              <input
              className="input"
              value={stageLabel}
              onChange={(e) => setStageLabel(e.target.value)}
              maxLength={50}
              placeholder="例如：服盆、控养、修根" />

            </label>
          }
          <label className={styles.r_0214b4b3}>
            <div className={cx(styles.r_65281709, styles.r_359090c2, styles.r_21d33c50)}>心得</div>
            <textarea
              className={styles.r_dd9ce2a7}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              placeholder="今天的状态…" />

          </label>
          <div>
            <div className={cx(styles.r_65281709, styles.r_359090c2, styles.r_21d33c50)}>图片(选填)</div>
            <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
              <input
                className={styles.r_36e579c0}
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
                }} />

              <button
                type="button"
                className={styles.r_23b4e5ed}
                onClick={() => {
                  const u = imgInput.trim();
                  if (u && !images.includes(u))
                  setImages([...images, u].slice(0, 9));
                  setImgInput('');
                }}>

                <Icon name="plus" size={14} />
              </button>
            </div>
            {images.length > 0 &&
            <div className={cx(styles.r_50d0d216, styles.r_f3c543ad, styles.r_be2e831b, styles.r_77a2a20e)}>
                {images.map((u, i) =>
              // eslint-disable-next-line @next/next/no-img-element
              <div key={i} className={styles.r_d89972fe}>
                    <img src={u} alt="" className={cx(styles.r_acaee621, styles.r_6da6a3c3, styles.r_07389a77, styles.r_7d85d0c2)} />
                    <button
                  type="button"
                  className={cx(styles.r_da4dbfbc, styles.r_26de51ee, styles.r_1af92b74, styles.r_f3c543ad, styles.r_11e59c6d, styles.r_dc7972eb, styles.r_67d66567, styles.r_ac204c10, styles.r_db1c7bcb, styles.r_1dc571a3, styles.r_72a4c7cd)}
                  onClick={() => setImages(images.filter((_, k) => k !== i))}>

                      ×
                    </button>
                  </div>
              )}
              </div>
            }
          </div>
        </div>
        {err && <div className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_595fceba)}>{err}</div>}
        <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
          <button className="btn-outline" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? '更新中…' : '保存'}
          </button>
        </div>
      </div>
    </div>);

}
