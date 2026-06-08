'use client';

import { Form } from 'radix-ui';
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/Textarea';
import { MultiImageUploadGrid } from '@/components/upload/MultiImageUploadGrid';
import { ALL_STAGES, STAGE_META } from '@/lib/journal';
import type { JournalStage } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface JournalDraftEntry {
  id?: string;
  entryDate: string; // yyyy-MM-dd
  stage: JournalStage | '';
  stageLabel?: string;
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
      { entryDate: today, stage: '', stageLabel: '', note: '', images: [] },
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
        { entryDate: today, stage: '', stageLabel: '', note: '', images: [] },
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
          <Form.Field name="journalName" serverInvalid={validationErrors?.has('journalName')}>
            <Form.Label className="mb-1 block text-xs text-leaf-700/80">
              <span className="text-rose-500">*</span> 植物昵称
            </Form.Label>
            <Form.Control asChild>
              <input
                required
                className={cn('input', validationErrors?.has('journalName') && 'border-rose-300 bg-rose-50/30')}
                placeholder="例如:阳台 9 号 / 我的红宝石"
                value={value.subjectName}
                onChange={(e) => patch({ subjectName: e.target.value })}
                maxLength={50}
              />
            </Form.Control>
            <Form.Message match="valueMissing" forceMatch={validationErrors?.has('journalName')} className="mt-1 block text-xs text-rose-500">
              请填写植物昵称
            </Form.Message>
          </Form.Field>
          <Form.Field name="journalDate" serverInvalid={validationErrors?.has('journalDate')}>
            <Form.Label className="mb-1 block text-xs text-leaf-700/80">
              <span className="text-rose-500">*</span> 起始日期
            </Form.Label>
            <Form.Control asChild>
              <input
                required
                type="date"
                className={cn('input', validationErrors?.has('journalDate') && 'border-rose-300 bg-rose-50/30')}
                value={value.startDate}
                onChange={(e) => patch({ startDate: e.target.value })}
              />
            </Form.Control>
            <Form.Message match="valueMissing" forceMatch={validationErrors?.has('journalDate')} className="mt-1 block text-xs text-rose-500">
              请选择起始日期
            </Form.Message>
          </Form.Field>
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
              locked={Boolean(entry.id)}
              canDelete={value.entries.length > 1}
              validationErrors={validationErrors}
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
  locked,
  canDelete,
  validationErrors,
  onPatch,
  onRemove,
}: {
  entry: JournalDraftEntry;
  index: number;
  isLast: boolean;
  locked: boolean;
  canDelete: boolean;
  validationErrors?: Set<string>;
  onPatch: (p: Partial<JournalDraftEntry>) => void;
  onRemove: () => void;
}) {
  const currentStage = isKnownJournalStage(entry.stage) ? STAGE_META[entry.stage] : null;
  const dateInvalid = validationErrors?.has(`journalEntryDate:${index}`);
  const stageInvalid = validationErrors?.has(`journalEntryStage:${index}`);
  const stageLabelInvalid = validationErrors?.has(`journalEntryStageLabel:${index}`);
  const imagesInvalid = validationErrors?.has(`journalEntryImages:${index}`);
  const noteInvalid = validationErrors?.has(`journalEntryNote:${index}`);

  if (locked) {
    return (
      <div className="relative pl-8">
        {!isLast && <div className="absolute left-[11px] top-8 h-[calc(100%+12px)] w-px bg-leaf-100" />}
        <div className="absolute left-0 top-4 grid h-6 w-6 place-items-center rounded-full border border-leaf-200 bg-white text-[13px] shadow-sm">
          {currentStage?.emoji ?? index + 1}
        </div>
        <div className="rounded-lg border border-leaf-100 bg-ink-50/60 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-xs font-semibold text-ink-900">记录 #{index + 1}</span>
              {currentStage && (
                <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', currentStage.color)}>
                  {currentStage.zh}
                </span>
              )}
            </div>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-ink-500">已创建，不能二次编辑</span>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-[110px_minmax(0,1fr)]">
            <div className="text-xs font-medium text-leaf-700/75">日期</div>
            <div className="text-ink-800">{entry.entryDate}</div>
            <div className="text-xs font-medium text-leaf-700/75">阶段</div>
            <div className="text-ink-800">{currentStage?.zh ?? entry.stageLabel ?? '其他'}</div>
            {entry.note && (
              <>
                <div className="text-xs font-medium text-leaf-700/75">心得</div>
                <div className="whitespace-pre-wrap leading-6 text-ink-700">{entry.note}</div>
              </>
            )}
            {entry.images.length > 0 && (
              <>
                <div className="text-xs font-medium text-leaf-700/75">配图</div>
                <div className="flex flex-wrap gap-2">
                  {entry.images.map((image) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={image} src={image} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

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
            <Form.Field name={`journalEntryDate:${index}`} serverInvalid={dateInvalid}>
              <div className="flex items-center gap-2">
                <Form.Label className="text-[11px] text-leaf-700/75">日期</Form.Label>
                <Form.Control asChild>
                  <input
                    required
                    type="date"
                    className={cn('input h-8 w-[145px] !text-xs', dateInvalid && 'border-rose-300 bg-rose-50/30')}
                    value={entry.entryDate}
                    onChange={(e) => onPatch({ entryDate: e.target.value })}
                  />
                </Form.Control>
              </div>
              <Form.Message match="valueMissing" forceMatch={dateInvalid} className="mt-1 block text-right text-[11px] text-rose-500">
                请选择日期
              </Form.Message>
            </Form.Field>
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

        <Form.Field name={`journalEntryStage:${index}`} serverInvalid={stageInvalid}>
          <Form.Control
            value={entry.stage}
            required
            readOnly
            tabIndex={-1}
            aria-hidden
            className="sr-only"
          />
          <StagePicker
            value={isKnownJournalStage(entry.stage) ? entry.stage : ''}
            invalid={stageInvalid}
            onChange={(stage) => onPatch({ stage, ...(stage === 'other' ? {} : { stageLabel: '' }) })}
          />
          <Form.Message match="valueMissing" forceMatch={stageInvalid} className="mt-1 block text-xs text-rose-500">
            请选择阶段
          </Form.Message>
        </Form.Field>

        {entry.stage === 'other' && (
          <Form.Field name={`journalEntryStageLabel:${index}`} serverInvalid={stageLabelInvalid} className="mt-3">
            <Form.Label className="mb-1 block text-[11px] text-leaf-700/80">
              <span className="text-rose-500">*</span> 其他阶段
            </Form.Label>
            <Form.Control asChild>
              <input
                required
                className={cn('input h-9 !text-sm', stageLabelInvalid && 'border-rose-300 bg-rose-50/30')}
                placeholder="例如：服盆、控养、修根"
                value={entry.stageLabel ?? ''}
                onChange={(e) => onPatch({ stageLabel: e.target.value })}
                maxLength={50}
              />
            </Form.Control>
            <Form.Message match="valueMissing" forceMatch={stageLabelInvalid} className="mt-1 block text-xs text-rose-500">
              选择其他阶段时，请填写阶段名称
            </Form.Message>
          </Form.Field>
        )}

        <Form.Field name={`journalEntryImages:${index}`} serverInvalid={imagesInvalid} className="mt-3">
          <Form.Control
            value={entry.images.length > 0 ? 'ok' : ''}
            required
            readOnly
            tabIndex={-1}
            aria-hidden
            className="sr-only"
          />
          <Form.Label className="mb-1 flex items-center justify-between gap-2 text-[11px] text-leaf-700/80">
            <span><span className="text-rose-500">*</span> 配图</span>
            <span>{entry.images.length}/9</span>
          </Form.Label>
          <MultiImageUploadGrid
            value={entry.images}
            onChange={(images) => onPatch({ images })}
            max={9}
            showCount={false}
            gridClassName={cn(
              'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 rounded-lg bg-leaf-50/30 p-2',
              imagesInvalid && 'ring-2 ring-rose-100',
            )}
            tileClassName="aspect-square h-auto w-auto"
          />
          <Form.Message match="valueMissing" forceMatch={imagesInvalid} className="mt-2 block text-xs text-rose-500">
            每条成长记录都需要上传配图
          </Form.Message>
        </Form.Field>

        <Form.Field name={`journalEntryNote:${index}`} serverInvalid={noteInvalid} className="mt-3">
          <Form.Label className="mb-1 block text-[11px] text-leaf-700/80">
            <span className="text-rose-500">*</span> 心得
          </Form.Label>
          <Form.Control asChild>
            <Textarea
              required
              className="min-h-[82px]"
              error={noteInvalid}
              placeholder="今天的状态、操作、心得..."
              value={entry.note}
              onChange={(e) => onPatch({ note: e.target.value })}
              maxLength={200}
              showCount
              countClassName="mt-0.5 text-[10px]"
            />
          </Form.Control>
          <Form.Message match="valueMissing" forceMatch={noteInvalid} className="mt-1 block text-xs text-rose-500">
            请填写心得
          </Form.Message>
        </Form.Field>
      </div>
    </div>
  );
}

function StagePicker({
  value,
  invalid,
  onChange,
}: {
  value: JournalStage | '';
  invalid?: boolean;
  onChange: (stage: JournalStage | '') => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] text-leaf-700/80"><span className="text-rose-500">*</span> 阶段</div>
      <div className={cn('flex flex-wrap gap-1.5 rounded-lg', invalid && 'ring-2 ring-rose-100')}>
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
