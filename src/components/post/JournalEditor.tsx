'use client';

import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/Textarea';
import { MultiImageUploadGrid } from '@/components/upload/MultiImageUploadGrid';
import { ALL_STAGES, STAGE_META } from '@/lib/journal';
import type { JournalStage } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface JournalDraftEntry {
  entryDate: string; // yyyy-MM-dd
  stage: JournalStage | '';
  note: string;
  images: string[];
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
      { entryDate: today, stage: '', note: '', images: [] },
    ],
  };
}

interface Props {
  value: JournalDraft;
  onChange: (next: JournalDraft) => void;
  validationErrors?: Set<string>;
}

export function JournalEditor({ value, onChange, validationErrors }: Props) {
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
        { entryDate: today, stage: '', note: '', images: [] },
      ],
    });
  };
  const removeEntry = (i: number) => {
    if (value.entries.length === 1) return;
    onChange({ ...value, entries: value.entries.filter((_, k) => k !== i) });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-leaf-100 bg-leaf-50/30 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-ink-900">基础信息</div>
          <div className="text-xs text-leaf-700/70">记录对象和起始时间</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-xs text-leaf-700/80">
              <span className="text-rose-500">*</span> 植物昵称
            </div>
            <input
              className={cn('input', validationErrors?.has('journalName') && 'border-rose-300 bg-rose-50/30')}
              placeholder="例如:阳台 9 号 / 我的红宝石"
              value={value.subjectName}
              onChange={(e) => patch({ subjectName: e.target.value })}
              maxLength={50}
            />
            {validationErrors?.has('journalName') && (
              <div className="mt-1 text-xs text-rose-500">请填写植物昵称</div>
            )}
          </label>
          <label className="block">
            <div className="mb-1 text-xs text-leaf-700/80">
              <span className="text-rose-500">*</span> 起始日期
            </div>
            <input
              type="date"
              className={cn('input', validationErrors?.has('journalDate') && 'border-rose-300 bg-rose-50/30')}
              value={value.startDate}
              onChange={(e) => patch({ startDate: e.target.value })}
            />
            {validationErrors?.has('journalDate') && (
              <div className="mt-1 text-xs text-rose-500">请选择起始日期</div>
            )}
          </label>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-ink-900">
              <span className="text-rose-500">*</span> 成长记录
            </div>
            <div className="mt-0.5 text-xs text-leaf-700/65">按时间追加状态、操作和配图，共 {value.entries.length} 条</div>
          </div>
          <button type="button" className="btn-outline h-8 !px-3 !text-xs" onClick={addEntry}>
            <Icon name="plus" size={14} />
            添加记录
          </button>
        </div>

        <div className="space-y-3">
          {value.entries.map((entry, i) => (
            <EntryCard
              key={i}
              entry={entry}
              index={i}
              isLast={i === value.entries.length - 1}
              canDelete={value.entries.length > 1}
              onPatch={(p) => patchEntry(i, p)}
              onRemove={() => removeEntry(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-leaf-200 bg-leaf-50/30 text-xs font-medium text-leaf-700 transition hover:border-leaf-300 hover:bg-leaf-50"
          onClick={addEntry}
        >
          <Icon name="plus" size={14} />
          继续添加一条成长记录
        </button>
        {validationErrors?.has('journalEntries') && (
          <div className="mt-2 text-xs text-rose-500">至少需要一条有效的成长记录（包含日期和内容或图片）</div>
        )}
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  index,
  isLast,
  canDelete,
  onPatch,
  onRemove,
}: {
  entry: JournalDraftEntry;
  index: number;
  isLast: boolean;
  canDelete: boolean;
  onPatch: (p: Partial<JournalDraftEntry>) => void;
  onRemove: () => void;
}) {
  const currentStage = isKnownJournalStage(entry.stage) ? STAGE_META[entry.stage] : null;

  return (
    <div className="relative pl-8">
      {!isLast && <div className="absolute left-[11px] top-8 h-[calc(100%+12px)] w-px bg-leaf-100" />}
      <div className="absolute left-0 top-4 grid h-6 w-6 place-items-center rounded-full border border-leaf-200 bg-white text-[13px] shadow-sm">
        {currentStage?.emoji ?? index + 1}
      </div>

      <div className="rounded-lg border border-leaf-100 bg-white p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xs font-semibold text-ink-900">记录 #{index + 1}</span>
            {currentStage && (
              <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', currentStage.color)}>
                {currentStage.zh}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-[11px] text-leaf-700/75">
              日期
              <input
                type="date"
                className="input h-8 w-[145px] !text-xs"
                value={entry.entryDate}
                onChange={(e) => onPatch({ entryDate: e.target.value })}
              />
            </label>
            {canDelete && (
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg border border-rose-100 text-rose-500 transition hover:bg-rose-50"
                onClick={onRemove}
                title="删除记录"
              >
                <Icon name="trash" size={14} />
              </button>
            )}
          </div>
        </div>

        <StagePicker
          value={isKnownJournalStage(entry.stage) ? entry.stage : ''}
          onChange={(stage) => onPatch({ stage })}
        />

        <div className="mt-3">
          <div className="mb-1 text-[11px] text-leaf-700/80">心得</div>
          <Textarea
            className="min-h-[82px]"
            placeholder="今天的状态、操作、心得…"
            value={entry.note}
            onChange={(e) => onPatch({ note: e.target.value })}
            maxLength={200}
            showCount
            countClassName="mt-0.5 text-[10px]"
          />
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-leaf-700/80">
            <span>配图</span>
            <span>{entry.images.length}/9</span>
          </div>
          <MultiImageUploadGrid
            value={entry.images}
            onChange={(images) => onPatch({ images })}
            max={9}
            showCount={false}
            gridClassName="grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 rounded-lg bg-leaf-50/30 p-2"
            tileClassName="aspect-square h-auto w-auto"
          />
        </div>
      </div>
    </div>
  );
}

function StagePicker({
  value,
  onChange,
}: {
  value: JournalStage | '';
  onChange: (stage: JournalStage | '') => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] text-leaf-700/80">阶段</div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_STAGES.map((stage) => {
          const meta = STAGE_META[stage];
          const selected = value === stage;

          return (
            <button
              key={stage}
              type="button"
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition',
                selected ? meta.color : 'border-leaf-100 bg-white text-leaf-700/75 hover:border-leaf-200 hover:bg-leaf-50'
              )}
              onClick={() => onChange(selected ? '' : stage)}
            >
              <span className="mr-1">{meta.emoji}</span>
              {meta.zh}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function isKnownJournalStage(value: string | undefined): value is JournalStage {
  return (ALL_STAGES as string[]).includes(value ?? '');
}
