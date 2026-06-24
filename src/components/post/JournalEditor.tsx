'use client';

import { useEffect, useMemo, useState } from 'react';
import { Form } from "radix-ui";
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { MultiImageUploadGrid } from '@/components/upload/MultiImageUploadGrid';
import { MultiSelect, type SelectOption } from '@/components/ui/Select';
import { ALL_STAGES, STAGE_META, normalizeJournalStages } from '@/lib/journal';
import { toast } from '@/components/ui/Toast';
import type { JournalStage } from '@/lib/types';
import { cn } from '@/lib/utils';
import styles from './JournalEditor.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



export interface JournalDraftEntry {
  id?: string;
  entryDate: string; // yyyy-MM-dd
  stage: JournalStage | '';
  stages?: JournalStage[];
  stageLabel?: string;
  note: string;
  images: string[];
}

export interface JournalDraft {
  subjectName: string;
  startDate: string; // yyyy-MM-dd
  entries: JournalDraftEntry[];
}

interface JournalStageOption {
  id: string;
  name: string;
  value: string;
  emoji: string;
  orderIdx: number;
  builtIn: boolean;
  canDelete?: boolean;
}

const fallbackStageOptions: JournalStageOption[] = ALL_STAGES
  .filter((stage) => stage !== 'other')
  .map((stage, index) => ({
    id: stage,
    name: STAGE_META[stage]?.zh ?? stage,
    value: stage,
    emoji: STAGE_META[stage]?.emoji ?? '',
    orderIdx: index,
    builtIn: true
  }));

export function emptyJournalDraft(): JournalDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    subjectName: '',
    startDate: today,
    entries: [
    { entryDate: today, stage: '', stageLabel: '', note: '', images: [] }]

  };
}

interface Props {
  value: JournalDraft;
  onChange: (next: JournalDraft) => void;
  validationErrors?: Set<string>;
}

export function JournalEditor({ value, onChange, validationErrors }: Props) {
  const [stageOptions, setStageOptions] = useState<JournalStageOption[]>(fallbackStageOptions);
  const patch = (p: Partial<JournalDraft>) => onChange({ ...value, ...p });
  const patchEntry = (i: number, p: Partial<JournalDraftEntry>) => {
    const entries = value.entries.map((e, k) => k === i ? { ...e, ...p } : e);
    onChange({ ...value, entries });
  };
  const addEntry = () => {
    const today = new Date().toISOString().slice(0, 10);
    onChange({
      ...value,
      entries: [
      ...value.entries,
      { entryDate: today, stage: '', stageLabel: '', note: '', images: [] }]

    });
  };
  const removeEntry = (i: number) => {
    if (value.entries.length === 1) return;
    onChange({ ...value, entries: value.entries.filter((_, k) => k !== i) });
  };
  const mergeStageOption = (option: JournalStageOption) => {
    setStageOptions((current) => {
      const exists = current.some((item) => item.value === option.value);
      const next = exists ? current.map((item) => item.value === option.value ? option : item) : [...current, option];
      return [...next].sort((a, b) => a.orderIdx - b.orderIdx || a.name.localeCompare(b.name, 'zh-CN'));
    });
  };
  const removeStageOption = (value: string) => {
    setStageOptions((current) => current.filter((item) => item.value !== value));
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/journal-stages')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        if (!cancelled && list.length > 0) setStageOptions(list);
      })
      .catch(() => {
        if (!cancelled) setStageOptions(fallbackStageOptions);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.r_3e7ce58d}>
      <div className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_54720a96, styles.r_8e63407b)}>
        <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
          <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_4ddaa618)}>基础信息</div>
          <div className={cx(styles.r_359090c2, styles.r_69335b95)}>记录对象和起始时间</div>
        </div>
        <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_e4d6f343)}>
          <Form.Field name="journalName" serverInvalid={validationErrors?.has('journalName')}>
            <Form.Label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_21d33c50)}>
              <span className={styles.r_fa512798}>*</span> 植物昵称
            </Form.Label>
            <Form.Control asChild>
              <Input
                required
                className={cn('input', validationErrors?.has('journalName') && cx(styles.r_3b7f9781, styles.r_fdae7b46))}
                placeholder="例如:阳台 9 号 / 我的红宝石"
                value={value.subjectName}
                onChange={(e) => patch({ subjectName: e.target.value })}
                maxLength={50} />

            </Form.Control>
            <Form.Message match="valueMissing" forceMatch={validationErrors?.has('journalName')} className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_fa512798)}>
              请填写植物昵称
            </Form.Message>
          </Form.Field>
          <Form.Field name="journalDate" serverInvalid={validationErrors?.has('journalDate')}>
            <Form.Label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_21d33c50)}>
              <span className={styles.r_fa512798}>*</span> 起始日期
            </Form.Label>
            <Form.Control asChild>
              <Input
                required
                type="date"
                className={cn('input', validationErrors?.has('journalDate') && cx(styles.r_3b7f9781, styles.r_fdae7b46))}
                value={value.startDate}
                onChange={(e) => patch({ startDate: e.target.value })} />

            </Form.Control>
            <Form.Message match="valueMissing" forceMatch={validationErrors?.has('journalDate')} className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_fa512798)}>
              请选择起始日期
            </Form.Message>
          </Form.Field>
        </div>
      </div>

      <div>
        <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
          <div>
            <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_4ddaa618)}>
              <span className={styles.r_fa512798}>*</span> 记录
            </div>
            <div className={cx(styles.r_15e1b1f4, styles.r_359090c2, styles.r_bb87c54c)}>按时间追加状态、操作和配图，共 {value.entries.length} 条</div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addEntry}>
            <Icon name="plus" size={14} />
            添加记录
          </Button>
        </div>

        <div className={styles.r_6ed543e2}>
          {value.entries.map((entry, i) =>
          <EntryCard
            key={i}
            entry={entry}
            index={i}
            stageOptions={stageOptions}
            isLast={i === value.entries.length - 1}
            locked={Boolean(entry.id)}
            canDelete={value.entries.length > 1}
            validationErrors={validationErrors}
            onStageCreated={mergeStageOption}
            onStageDeleted={removeStageOption}
            onPatch={(p) => patchEntry(i, p)}
            onRemove={() => removeEntry(i)} />

          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="md"
          fullWidth
          className={cx(styles.r_eccd13ef, styles.r_a29b7a64, styles.r_54720a96)}
          onClick={addEntry}>

          <Icon name="plus" size={14} />
          继续添加一条记录
        </Button>
        {validationErrors?.has('journalEntries') &&
        <div className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_fa512798)}>至少需要一条有效记录（包含日期和内容或图片）</div>
        }
      </div>
    </div>);

}

function EntryCard({
  entry,
  index,
  stageOptions,
  isLast,
  locked,
  canDelete,
  validationErrors,
  onStageCreated,
  onStageDeleted,
  onPatch,
  onRemove









}: {entry: JournalDraftEntry;index: number;stageOptions: JournalStageOption[];isLast: boolean;locked: boolean;canDelete: boolean;validationErrors?: Set<string>;onStageCreated: (option: JournalStageOption) => void;onStageDeleted: (value: string) => void;onPatch: (p: Partial<JournalDraftEntry>) => void;onRemove: () => void;}) {
  const selectedStages = normalizeJournalStages(entry.stages, entry.stage);
  const currentStage = selectedStages[0] ? STAGE_META[selectedStages[0]] : null;
  const dateInvalid = validationErrors?.has(`journalEntryDate:${index}`);
  const stageInvalid = validationErrors?.has(`journalEntryStage:${index}`);
  const imagesInvalid = validationErrors?.has(`journalEntryImages:${index}`);
  const noteInvalid = validationErrors?.has(`journalEntryNote:${index}`);

  if (locked) {
    return (
      <div className={cx(styles.r_d89972fe, styles.r_e4af8854)}>
        {!isLast && <div className={cx(styles.r_da4dbfbc, styles.r_2814ff7c, styles.r_42edf5ee, styles.r_2663e2d7, styles.r_47a69140, styles.r_f2b23104)} />}
        <div className={cx(styles.r_da4dbfbc, styles.r_c78facc7, styles.r_451eecb7, styles.r_f3c543ad, styles.r_f6fe9024, styles.r_7ec10f86, styles.r_67d66567, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_a14daebf, styles.r_438b2237)}>
          {currentStage?.emoji ?? index + 1}
        </div>
        <div className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_c3a8ec23, styles.r_eb6e8b88)}>
          <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e)}>
            <div className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_3960ffc2, styles.r_77a2a20e)}>
              <span className={cx(styles.r_359090c2, styles.r_e83a7042, styles.r_4ddaa618)}>#{index + 1}</span>
              <StageBadges stages={selectedStages} stageLabel={entry.stageLabel} />
            </div>
            <span className={cx(styles.r_ac204c10, styles.r_5e10cdb8, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_2689f395, styles.r_7b89cd85)}>已创建，不能二次编辑</span>
          </div>
          <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_fc7473ca, styles.r_f24419e6)}>
            <div className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_23531fd3)}>日期</div>
            <div className={styles.r_399e11a5}>{entry.entryDate}</div>
            <div className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_23531fd3)}>阶段</div>
            <div className={styles.r_399e11a5}>{stageText(selectedStages, entry.stageLabel)}</div>
            {entry.note &&
            <>
                <div className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_23531fd3)}>心得</div>
                <div className={cx(styles.r_a2edcb1a, styles.r_18550d59, styles.r_eb6abb1f)}>{entry.note}</div>
              </>
            }
            {entry.images.length > 0 &&
            <>
                <div className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_23531fd3)}>配图</div>
                <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
                  {entry.images.map((image) =>
                // eslint-disable-next-line @next/next/no-img-element
                <img key={image} src={image} alt="" className={cx(styles.r_acaee621, styles.r_baceed34, styles.r_5f22e64f, styles.r_7d85d0c2)} />
                )}
                </div>
              </>
            }
          </div>
        </div>
      </div>);

  }

  return (
    <div className={cx(styles.r_d89972fe, styles.r_e4af8854)}>
      {!isLast && <div className={cx(styles.r_da4dbfbc, styles.r_2814ff7c, styles.r_42edf5ee, styles.r_2663e2d7, styles.r_47a69140, styles.r_f2b23104)} />}
      <div className={cx(styles.r_da4dbfbc, styles.r_c78facc7, styles.r_451eecb7, styles.r_f3c543ad, styles.r_f6fe9024, styles.r_7ec10f86, styles.r_67d66567, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_a14daebf, styles.r_438b2237)}>
        {currentStage?.emoji ?? index + 1}
      </div>

      <div className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_eb6e8b88, styles.r_438b2237)}>
        <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e)}>
          <div className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_3960ffc2, styles.r_77a2a20e)}>
            <span className={cx(styles.r_359090c2, styles.r_e83a7042, styles.r_4ddaa618)}>#{index + 1}</span>
            <StageBadges stages={selectedStages} stageLabel={entry.stageLabel} />
          </div>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
            <Form.Field name={`journalEntryDate:${index}`} serverInvalid={dateInvalid}>
              <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                <Form.Label className={cx(styles.r_d058ca6d, styles.r_23531fd3)}>日期</Form.Label>
                <Form.Control asChild>
                  <Input
                    required
                    type="date"
                    className={cn(cx(styles.r_ed8a5df7, styles.r_3e9a4bf6, styles.r_dd702538), dateInvalid && cx(styles.r_3b7f9781, styles.r_fdae7b46))}
                    value={entry.entryDate}
                    onChange={(e) => onPatch({ entryDate: e.target.value })} />

                </Form.Control>
              </div>
              <Form.Message match="valueMissing" forceMatch={dateInvalid} className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_308fc069, styles.r_d058ca6d, styles.r_fa512798)}>
                请选择日期
              </Form.Message>
            </Form.Field>
            {canDelete &&
            <button
              type="button"
              className={cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_67d66567, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_3d496065, styles.r_fa512798, styles.r_56bf8ae8, styles.r_85cfcc24)}
              onClick={onRemove}
              title="删除记录">

                <Icon name="trash" size={14} />
              </button>
            }
          </div>
        </div>

        <Form.Field name={`journalEntryStage:${index}`} serverInvalid={stageInvalid}>
          <Form.Control
            value={selectedStages.join(',')}
            required
            readOnly
            tabIndex={-1}
            aria-hidden
            className={styles.r_2daa8e5e} />

          <StagePicker
            value={selectedStages}
            options={stageOptions}
            invalid={stageInvalid}
            onChange={(stages) => onPatch({
              stages,
              stage: stages[0] ?? '',
              stageLabel: ''
            })}
            onStageCreated={onStageCreated}
            onStageDeleted={onStageDeleted} />

          <Form.Message match="valueMissing" forceMatch={stageInvalid} className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_fa512798)}>
            请选择阶段
          </Form.Message>
        </Form.Field>

        <Form.Field name={`journalEntryImages:${index}`} serverInvalid={imagesInvalid} className={styles.r_eccd13ef}>
          <Form.Control
            value={entry.images.length > 0 ? 'ok' : ''}
            required
            readOnly
            tabIndex={-1}
            aria-hidden
            className={styles.r_2daa8e5e} />

          <Form.Label className={cx(styles.r_65281709, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e, styles.r_d058ca6d, styles.r_21d33c50)}>
            <span><span className={styles.r_fa512798}>*</span> 配图</span>
            <span>{entry.images.length}/9</span>
          </Form.Label>
          <MultiImageUploadGrid
            value={entry.images}
            onChange={(images) => onPatch({ images })}
            max={9}
            showCount={false}
            gridClassName={cn(cx(styles.r_be2e831b, styles.r_898c0bcb, styles.r_74713240, styles.r_76f32b53, styles.r_5f22e64f, styles.r_54720a96, styles.r_7660b450),

            imagesInvalid && cx(styles.r_16b1efa5, styles.r_6b7b677a)
            )}
            tileClassName={cx(styles.r_b59cd297, styles.r_b8f0a08e, styles.r_23e1f628)} />

          <Form.Message match="valueMissing" forceMatch={imagesInvalid} className={cx(styles.r_50d0d216, styles.r_0214b4b3, styles.r_359090c2, styles.r_fa512798)}>
            每条记录都需要上传配图
          </Form.Message>
        </Form.Field>

        <Form.Field name={`journalEntryNote:${index}`} serverInvalid={noteInvalid} className={styles.r_eccd13ef}>
          <Form.Label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_d058ca6d, styles.r_21d33c50)}>
            <span className={styles.r_fa512798}>*</span> 心得
          </Form.Label>
          <Form.Control asChild>
            <Textarea
              required
              className={styles.r_887b5c70}
              error={noteInvalid}
              placeholder="今天的状态、操作、心得..."
              value={entry.note}
              onChange={(e) => onPatch({ note: e.target.value })}
              maxLength={200}
              showCount
              countClassName={cx(styles.r_15e1b1f4, styles.r_1dc571a3)} />

          </Form.Control>
          <Form.Message match="valueMissing" forceMatch={noteInvalid} className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_fa512798)}>
            请填写心得
          </Form.Message>
        </Form.Field>
      </div>
    </div>);

}

function StagePicker({
  value,
  options,
  invalid,
  onChange,
  onStageCreated,
  onStageDeleted




}: {value: JournalStage[];options: JournalStageOption[];invalid?: boolean;onChange: (stages: JournalStage[]) => void;onStageCreated: (option: JournalStageOption) => void;onStageDeleted: (value: string) => void;}) {
  const selectOptions: SelectOption[] = useMemo(() => {
    const selectedCustomOptions = value
      .filter((stage) => !options.some((option) => option.value === stage))
      .map((stage) => ({
        value: stage,
        label: stage,
        custom: true
      }));
    return [
      ...selectedCustomOptions,
      ...options.map((stage) => ({
        id: stage.id,
        value: stage.value,
        label: `${stage.emoji ? `${stage.emoji} ` : ''}${stage.name}`,
        canDelete: stage.canDelete
      }))
    ];
  }, [options, value]);

  const deleteStage = async (option: SelectOption) => {
    if (!option.id) return;
    const toastId = toast.loading('阶段删除中...');
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`/api/journal-stages?id=${encodeURIComponent(option.id)}`, {
        method: 'DELETE',
        signal: controller.signal
      });
      const payload = await res.json();
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error?.message || '阶段删除失败');
      }
      onStageDeleted(option.value);
      onChange(value.filter((stage) => stage !== option.value));
      toast.dismiss(toastId);
      toast.success('阶段已删除');
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(error instanceof DOMException && error.name === 'AbortError' ? '阶段删除超时，请重试' : error instanceof Error ? error.message : '阶段删除失败');
    } finally {
      window.clearTimeout(timer);
    }
  };

  return (
    <div>
      <div className={cx(styles.r_65281709, styles.r_d058ca6d, styles.r_21d33c50)}><span className={styles.r_fa512798}>*</span> 阶段</div>
      <MultiSelect
        creatable
        compact
        options={selectOptions}
        value={value}
        onValueChange={(next) => onChange(next.map(normalizeStageName).filter(Boolean))}
        onCreateOption={async (input) => {
          const label = input.trim().replace(/^#/, '');
          if (!label) {
            toast.error('请输入阶段名称');
            return;
          }
          const toastId = toast.loading('阶段创建中...');
          const controller = new AbortController();
          const timer = window.setTimeout(() => controller.abort(), 10000);
          try {
            const res = await fetch('/api/journal-stages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: label }),
              signal: controller.signal
            });
            const payload = await res.json();
            if (!res.ok || payload?.ok === false) {
              throw new Error(payload?.error?.message || '阶段创建失败');
            }
            const created = payload?.data ?? payload;
            onStageCreated(created);
            onChange(Array.from(new Set([...value, created.value])));
            toast.dismiss(toastId);
            toast.success('阶段已创建');
          } catch (error) {
            toast.dismiss(toastId);
            toast.error(error instanceof DOMException && error.name === 'AbortError' ? '阶段创建超时，请重试' : error instanceof Error ? error.message : '阶段创建失败');
          } finally {
            window.clearTimeout(timer);
          }
        }}
        placeholder="选择阶段"
        error={invalid}
        noOptionsMessage="没有匹配阶段"
        formatCreateLabel={(input) => `输入文字按确认键创建阶段：${input.trim().replace(/^#/, '')}`}
        formatOptionLabel={(option) => (
          <span className={styles.stageSelectOption}>
            <span className={styles.stageSelectOptionText}>{option.label}</span>
            {option.canDelete &&
              <button
                type="button"
                className={styles.stageSelectDelete}
                aria-label={`删除阶段 ${option.label}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void deleteStage(option);
                }}>
                <Icon name="trash" size={12} />
              </button>
            }
          </span>
        )} />
    </div>);

}

function normalizeStageName(value: string | undefined): JournalStage {
  return value?.trim().replace(/^#/, '') ?? '';
}

function StageBadges({ stages, stageLabel }: {stages: JournalStage[];stageLabel?: string;}) {
  return (
    <>
      {stages.map((stage) => {
        const meta = STAGE_META[stage];
        return (
          <span key={stage} className={cn(cx(styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_2689f395), meta?.color ?? styles.r_7ebecbb6)}>
            {stage === 'other' ? stageLabel || STAGE_META.other.zh : meta?.zh ?? stage}
          </span>);
      })}
    </>);
}

function stageText(stages: JournalStage[], stageLabel?: string) {
  if (stages.length === 0) return stageLabel || '其他';
  return stages.map((stage) => stage === 'other' ? stageLabel || STAGE_META.other.zh : STAGE_META[stage]?.zh ?? stage).join('、');
}
