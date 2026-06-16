'use client';

import { Form } from "radix-ui";
import { Icon } from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/Textarea';
import { MultiImageUploadGrid } from '@/components/upload/MultiImageUploadGrid';
import { ALL_STAGES, STAGE_META } from '@/lib/journal';
import type { JournalStage } from '@/lib/types';
import { cn } from '@/lib/utils';
import styles from './JournalEditor.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



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
    { entryDate: today, stage: '', stageLabel: '', note: '', images: [] }]

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
          <button type="button" className={cx(styles.r_ed8a5df7, styles.r_23b4e5ed, styles.r_dd702538)} onClick={addEntry}>
            <Icon name="plus" size={14} />
            添加记录
          </button>
        </div>

        <div className={styles.r_6ed543e2}>
          {value.entries.map((entry, i) =>
          <EntryCard
            key={i}
            entry={entry}
            index={i}
            isLast={i === value.entries.length - 1}
            locked={Boolean(entry.id)}
            canDelete={value.entries.length > 1}
            validationErrors={validationErrors}
            onPatch={(p) => patchEntry(i, p)}
            onRemove={() => removeEntry(i)} />

          )}
        </div>
        <button
          type="button"
          className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_426b8b75, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_86843cf1, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_54720a96, styles.r_359090c2, styles.r_2689f395, styles.r_5f6a59f1, styles.r_56bf8ae8, styles.r_a5c39c39, styles.r_5756b7b4)}
          onClick={addEntry}>

          <Icon name="plus" size={14} />
          继续添加一条记录
        </button>
        {validationErrors?.has('journalEntries') &&
        <div className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_fa512798)}>至少需要一条有效记录（包含日期和内容或图片）</div>
        }
      </div>
    </div>);

}

function EntryCard({
  entry,
  index,
  isLast,
  locked,
  canDelete,
  validationErrors,
  onPatch,
  onRemove









}: {entry: JournalDraftEntry;index: number;isLast: boolean;locked: boolean;canDelete: boolean;validationErrors?: Set<string>;onPatch: (p: Partial<JournalDraftEntry>) => void;onRemove: () => void;}) {
  const currentStage = isKnownJournalStage(entry.stage) ? STAGE_META[entry.stage] : null;
  const dateInvalid = validationErrors?.has(`journalEntryDate:${index}`);
  const stageInvalid = validationErrors?.has(`journalEntryStage:${index}`);
  const stageLabelInvalid = validationErrors?.has(`journalEntryStageLabel:${index}`);
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
              <span className={cx(styles.r_359090c2, styles.r_e83a7042, styles.r_4ddaa618)}>记录 #{index + 1}</span>
              {currentStage &&
              <span className={cn(cx(styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_2689f395), currentStage.color)}>
                  {currentStage.zh}
                </span>
              }
            </div>
            <span className={cx(styles.r_ac204c10, styles.r_5e10cdb8, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_2689f395, styles.r_7b89cd85)}>已创建，不能二次编辑</span>
          </div>
          <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_fc7473ca, styles.r_f24419e6)}>
            <div className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_23531fd3)}>日期</div>
            <div className={styles.r_399e11a5}>{entry.entryDate}</div>
            <div className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_23531fd3)}>阶段</div>
            <div className={styles.r_399e11a5}>{currentStage?.zh ?? entry.stageLabel ?? '其他'}</div>
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
            <span className={cx(styles.r_359090c2, styles.r_e83a7042, styles.r_4ddaa618)}>记录 #{index + 1}</span>
            {currentStage &&
            <span className={cn(cx(styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_2689f395), currentStage.color)}>
                {currentStage.zh}
              </span>
            }
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
            value={entry.stage}
            required
            readOnly
            tabIndex={-1}
            aria-hidden
            className={styles.r_2daa8e5e} />

          <StagePicker
            value={isKnownJournalStage(entry.stage) ? entry.stage : ''}
            invalid={stageInvalid}
            onChange={(stage) => onPatch({ stage, ...(stage === 'other' ? {} : { stageLabel: '' }) })} />

          <Form.Message match="valueMissing" forceMatch={stageInvalid} className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_fa512798)}>
            请选择阶段
          </Form.Message>
        </Form.Field>

        {entry.stage === 'other' &&
        <Form.Field name={`journalEntryStageLabel:${index}`} serverInvalid={stageLabelInvalid} className={styles.r_eccd13ef}>
            <Form.Label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_d058ca6d, styles.r_21d33c50)}>
              <span className={styles.r_fa512798}>*</span> 其他阶段
            </Form.Label>
            <Form.Control asChild>
              <Input
              required
              className={cn(cx(styles.r_e7a768f9, styles.r_4f43b5cb), stageLabelInvalid && cx(styles.r_3b7f9781, styles.r_fdae7b46))}
              placeholder="例如：服盆、控养、修根"
              value={entry.stageLabel ?? ''}
              onChange={(e) => onPatch({ stageLabel: e.target.value })}
              maxLength={50} />

            </Form.Control>
            <Form.Message match="valueMissing" forceMatch={stageLabelInvalid} className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_fa512798)}>
              选择其他阶段时，请填写阶段名称
            </Form.Message>
          </Form.Field>
        }

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
  invalid,
  onChange




}: {value: JournalStage | '';invalid?: boolean;onChange: (stage: JournalStage | '') => void;}) {
  return (
    <div>
      <div className={cx(styles.r_65281709, styles.r_d058ca6d, styles.r_21d33c50)}><span className={styles.r_fa512798}>*</span> 阶段</div>
      <div className={cn(cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_58284b4e, styles.r_5f22e64f), invalid && cx(styles.r_16b1efa5, styles.r_6b7b677a))}>
        {ALL_STAGES.map((stage) => {
          const meta = STAGE_META[stage];
          const selected = value === stage;

          return (
            <button
              key={stage}
              type="button"
              className={cn(cx(styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_0b91436d, styles.r_660d2eff, styles.r_359090c2, styles.r_2689f395, styles.r_56bf8ae8),

              selected ? meta.color : cx(styles.r_88b684d2, styles.r_5e10cdb8, styles.r_23531fd3, styles.r_5aae3db6, styles.r_5756b7b4)
              )}
              onClick={() => onChange(selected ? '' : stage)}>

              <span className={styles.r_61816240}>{meta.emoji}</span>
              {meta.zh}
            </button>);

        })}
      </div>
    </div>);

}

function isKnownJournalStage(value: string | undefined): value is JournalStage {
  return (ALL_STAGES as string[]).includes(value ?? '');
}
