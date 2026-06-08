'use client';

import type { JournalEntry, Post } from '@/lib/types';
import { STAGE_META } from '@/lib/journal';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';

export function PostJournalPreview({ post, className }: { post: Post; className?: string }) {
  if (!post.journal) return null;

  const journal = post.journal;
  const shown = journal.entries ?? [];
  const totalCount = journal.entriesCount ?? shown.length;
  const showCompact = totalCount > 4;
  const firstEntries = shown.slice(0, 3);
  const lastEntry = shown[shown.length - 1];
  const middleCount = totalCount - 4;

  return (
    <div className={cn('rounded-none bg-leaf-50/60 p-2', className)}>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-leaf-700/80">
        <span className="truncate font-semibold">成长记录 · {journal.subjectName}</span>
        <span className="shrink-0 text-[11px]">
          第 {journal.daysSinceStart} 天 · 共 {journal.entriesCount} 条
        </span>
      </div>

      <ol className="space-y-1.5">
        {firstEntries.map((entry) => (
          <li key={entry.id} className="space-y-1">
            <JournalEntryPreview entry={entry} />
          </li>
        ))}

        {showCompact && (
          <li className="pl-4 text-[10px] text-leaf-700/60">
            + {middleCount} 条更多...
          </li>
        )}

        {showCompact && lastEntry && (
          <li key={lastEntry.id} className="space-y-1">
            <JournalEntryPreview entry={lastEntry} />
          </li>
        )}
      </ol>
    </div>
  );
}

function JournalEntryPreview({ entry }: { entry: JournalEntry }) {
  const date = new Date(entry.entryDate);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const meta = STAGE_META[entry.stage] || STAGE_META.other;
  const stageText = entry.stage === 'other' && entry.stageLabel ? entry.stageLabel : meta.zh;

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <span className="mt-1 block h-2 w-2 shrink-0 rounded-full bg-leaf-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-medium text-ink-800">{yyyy}/{mm}/{dd}</span>
            <span className={cn('rounded border px-1.5 py-0.5 text-[10px]', meta.color)}>
              {meta.emoji} {stageText}
            </span>
          </div>

          {entry.note && (
            <Tooltip content={entry.note}>
              <p className="mt-0.5 line-clamp-2 text-xs text-ink-600/80">{entry.note}</p>
            </Tooltip>
          )}

          {entry.images.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {entry.images.slice(0, 3).map((image, index) => (
                <div key={`${image}-${index}`} className="relative h-8 w-8 overflow-hidden rounded bg-white/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
              {entry.images.length > 3 && (
                <div className="relative flex h-8 w-8 items-center justify-center rounded bg-black/40 text-[10px] text-white">
                  +{entry.images.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
