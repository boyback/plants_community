'use client';

import { Icon } from '@/components/ui/Icon';
import { UploadField } from '@/components/upload/UploadField';
import { ALL_STAGES, STAGE_META } from '@/lib/journal';
import type { JournalStage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';
import { Lightbox } from '@/components/ui/Lightbox';

export interface JournalDraftEntry {
  entryDate: string; // yyyy-MM-dd
  stage: JournalStage;
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
    <div className="space-y-5">
      {/* 基础信息 */}
      <div className="rounded-none border border-leaf-100 bg-leaf-50/40 p-4">
        <div className="mb-3 text-sm font-medium text-leaf-700">📖 基础信息</div>
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

      {/* 记录列表 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-leaf-700">
            <span className="text-rose-500">*</span> 🌿 成长记录({value.entries.length})
          </div>
          <button type="button" className="btn-ghost !text-xs" onClick={addEntry}>
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
              canDelete={value.entries.length > 1}
              onPatch={(p) => patchEntry(i, p)}
              onRemove={() => removeEntry(i)}
            />
          ))}
        </div>
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
  return (
    <div className="rounded-none border border-leaf-100 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-leaf-700/70">记录 #{index + 1}</span>
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
          <input
            type="text"
            list={`stage-suggestions-${index}`}
            className="input"
            placeholder="例如: 发芽、开花、换盆等"
            value={entry.stage}
            onChange={(e) => onPatch({ stage: e.target.value as JournalStage })}
            maxLength={20}
          />
          <datalist id={`stage-suggestions-${index}`}>
            {ALL_STAGES.map((s) => (
              <option key={s} value={STAGE_META[s].zh} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="mt-2">
        <div className="mb-1 text-[11px] text-leaf-700/80">心得</div>
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
        <SimpleImageGrid
          images={entry.images}
          onChange={(imgs) => onPatch({ images: imgs })}
          max={9}
        />
      </div>
    </div>
  );
}

// 简化的图片网格组件 - 只显示文件上传网格，不显示模式切换
function SimpleImageGrid({
  images,
  onChange,
  max,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
  max: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const remaining = Math.max(0, max - images.length);

  const handleFiles = async (files: FileList) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;

    setUploading(true);
    try {
      for (const file of list) {
        if (images.length >= max) break;

        const formData = new FormData();
        formData.append('file', file);

        const resp = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (resp.ok) {
          const data = await resp.json();
          const url = data.url || data.data?.url;
          if (url) {
            onChange([...images, url]);
          }
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i: number) => onChange(images.filter((_, k) => k !== i));

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        disabled={uploading || remaining === 0}
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* 图片数量提示 */}
      <div className="text-xs text-leaf-700/60 text-right">
        {images.length}/{max}
      </div>

      {/* 网格布局 */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 rounded-none p-2 bg-leaf-50/30">
        {/* 已上传的图片 */}
        {images.map((url, i) => (
          <div key={i} className="group relative aspect-square overflow-hidden rounded-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-full w-full cursor-pointer object-cover hover:opacity-90 transition-opacity"
              onClick={() => setLightboxIdx(i)}
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="移除"
            >
              ×
            </button>
          </div>
        ))}

        {/* 上传按钮 - 在最后 */}
        {remaining > 0 && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-none border-2 border-dashed text-xs transition-colors',
              'border-leaf-200 bg-leaf-50/30 hover:border-leaf-400 hover:bg-leaf-50/50',
              uploading && 'opacity-40 cursor-not-allowed'
            )}
          >
            <Icon name="plus" size={16} className="text-leaf-600" />
            <span className="text-[10px] text-leaf-700/70">
              {uploading ? '上传中' : '图片'}
            </span>
          </button>
        )}
      </div>

      {/* Lightbox */}
      {images.length > 0 && (
        <Lightbox
          images={images}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onChange={setLightboxIdx}
        />
      )}
    </div>
  );
}
