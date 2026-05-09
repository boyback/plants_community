'use client';

import { Icon } from '@/components/ui/Icon';
import { ALL_STAGES, STAGE_META } from '@/lib/journal';
import type { JournalStage } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface JournalDraftEntry {
  entryDate: string; // yyyy-MM-dd
  stage: JournalStage;
  note: string;
  images: string[];
  imageInput?: string;
}

export interface JournalDraft {
  subjectName: string;
  startDate: string; // yyyy-MM-dd
  entries: JournalDraftEntry[];
}

export function emptyJournalDraft(): JournalDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    subjectName: '',
    startDate: today,
    entries: [
      { entryDate: today, stage: 'germinate', note: '', images: [], imageInput: '' },
    ],
  };
}

interface Props {
  value: JournalDraft;
  onChange: (next: JournalDraft) => void;
}

export function JournalEditor({ value, onChange }: Props) {
  const patch = (p: Partial<JournalDraft>) => onChange({ ...value, ...p });
  const patchEntry = (i: number, p: Partial<JournalDraftEntry>) => {
    const entries = value.entries.map((e, k) => (k === i ? { ...e, ...p } : e));
    onChange({ ...value, entries });
  };
  const addEntry = () => {
    const today = new Date().toISOString().slice(0, 10);
    onChange({
      ...value,
      entries: [
        ...value.entries,
        { entryDate: today, stage: 'growing', note: '', images: [], imageInput: '' },
      ],
    });
  };
  const removeEntry = (i: number) => {
    if (value.entries.length === 1) return;
    onChange({ ...value, entries: value.entries.filter((_, k) => k !== i) });
  };

  return (
    <div className="space-y-5">
      {/* 基础信息 */}
      <div className="rounded-xl border border-leaf-100 bg-leaf-50/40 p-4">
        <div className="mb-3 text-sm font-medium text-leaf-700">📖 基础信息</div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-xs text-leaf-700/80">植物昵称</div>
            <input
              className="input"
              placeholder="例如:阳台 9 号 / 我的红宝石"
              value={value.subjectName}
              onChange={(e) => patch({ subjectName: e.target.value })}
              maxLength={50}
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs text-leaf-700/80">起始日期</div>
            <input
              type="date"
              className="input"
              value={value.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
            />
          </label>
        </div>
      </div>

      {/* 事件列表 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-leaf-700">
            🌿 时间线事件({value.entries.length})
          </div>
          <button type="button" className="btn-ghost !text-xs" onClick={addEntry}>
            <Icon name="plus" size={14} />
            添加事件
          </button>
        </div>

        <div className="space-y-3">
          {value.entries.map((entry, i) => (
            <EntryCard
              key={i}
              entry={entry}
              index={i}
              canDelete={value.entries.length > 1}
              onPatch={(p) => patchEntry(i, p)}
              onRemove={() => removeEntry(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  index,
  canDelete,
  onPatch,
  onRemove,
}: {
  entry: JournalDraftEntry;
  index: number;
  canDelete: boolean;
  onPatch: (p: Partial<JournalDraftEntry>) => void;
  onRemove: () => void;
}) {
  const stageMeta = STAGE_META[entry.stage];
  const addImg = () => {
    const u = (entry.imageInput ?? '').trim();
    if (!u) return;
    if (entry.images.includes(u)) {
      onPatch({ imageInput: '' });
      return;
    }
    onPatch({ images: [...entry.images, u].slice(0, 9), imageInput: '' });
  };
  return (
    <div className="rounded-xl border border-leaf-100 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-leaf-700/70">事件 #{index + 1}</span>
        {canDelete && (
          <button
            type="button"
            className="text-xs text-rose-600 hover:underline"
            onClick={onRemove}
          >
            删除
          </button>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="block">
          <div className="mb-1 text-[11px] text-leaf-700/80">日期</div>
          <input
            type="date"
            className="input"
            value={entry.entryDate}
            onChange={(e) => onPatch({ entryDate: e.target.value })}
          />
        </label>
        <label className="block">
          <div className="mb-1 text-[11px] text-leaf-700/80">阶段</div>
          <select
            className="input"
            value={entry.stage}
            onChange={(e) => onPatch({ stage: e.target.value as JournalStage })}
          >
            {ALL_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_META[s].emoji} {STAGE_META[s].zh}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between text-[11px] text-leaf-700/80">
          <span>心得</span>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px]',
              stageMeta.color
            )}
          >
            {stageMeta.emoji} {stageMeta.zh}
          </span>
        </div>
        <textarea
          className="input min-h-[70px]"
          placeholder="今天的状态、操作、心得…"
          value={entry.note}
          onChange={(e) => onPatch({ note: e.target.value })}
          maxLength={2000}
        />
        <div className="mt-0.5 text-right text-[10px] text-leaf-700/60">
          {entry.note.length} / 2000
        </div>
      </div>

      <div className="mt-2">
        <div className="mb-1 text-[11px] text-leaf-700/80">配图(选填,最多 9 张)</div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="粘贴图片 URL…"
            value={entry.imageInput ?? ''}
            onChange={(e) => onPatch({ imageInput: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addImg();
              }
            }}
          />
          <button type="button" className="btn-outline !px-3" onClick={addImg}>
            <Icon name="plus" size={14} />
          </button>
        </div>
        {entry.images.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-6">
            {entry.images.map((u, k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <div key={k} className="relative">
                <img
                  src={u}
                  alt=""
                  className="h-16 w-full rounded-md object-cover"
                />
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/60 text-[10px] text-white"
                  onClick={() =>
                    onPatch({ images: entry.images.filter((_, j) => j !== k) })
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
