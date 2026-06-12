'use client';

import type { JournalEntry, Post } from '@/lib/types';
import { STAGE_META } from '@/lib/journal';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import styles from './PostJournalPreview.module.scss';
import { cx } from '@/lib/style-utils';



export function PostJournalPreview({ post, className }: {post: Post;className?: string;}) {
  if (!post.journal) return null;

  const journal = post.journal;
  const shown = journal.entries ?? [];
  const totalCount = journal.entriesCount ?? shown.length;
  const showCompact = totalCount > 4;
  const firstEntries = shown.slice(0, 3);
  const lastEntry = shown[shown.length - 1];
  const middleCount = totalCount - 4;

  return (
    <div className={cn(cx(styles.r_0c5e9137, styles.r_a8a62ca4, styles.r_7660b450), className)}>
      <div className={cx(styles.r_65281709, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3, styles.r_359090c2, styles.r_21d33c50)}>
        <span className={cx(styles.r_f283ea9b, styles.r_e83a7042)}>记录贴 · {journal.subjectName}</span>
        <span className={cx(styles.r_012fbd12, styles.r_d058ca6d)}>
          第 {journal.daysSinceStart} 天 · 共 {journal.entriesCount} 条
        </span>
      </div>

      <ol className={styles.r_5a250822}>
        {firstEntries.map((entry) =>
        <li key={entry.id} className={styles.r_da7c36cd}>
            <JournalEntryPreview entry={entry} />
          </li>
        )}

        {showCompact &&
        <li className={cx(styles.r_fdb4af3a, styles.r_1dc571a3, styles.r_6c4cc49e)}>
            + {middleCount} 条更多...
          </li>
        }

        {showCompact && lastEntry &&
        <li key={lastEntry.id} className={styles.r_da7c36cd}>
            <JournalEntryPreview entry={lastEntry} />
          </li>
        }
      </ol>
    </div>);

}

function JournalEntryPreview({ entry }: {entry: JournalEntry;}) {
  const date = new Date(entry.entryDate);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const meta = STAGE_META[entry.stage] || STAGE_META.other;
  const stageText = entry.stage === 'other' && entry.stageLabel ? entry.stageLabel : meta.zh;

  return (
    <div className={styles.r_da7c36cd}>
      <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_77a2a20e)}>
        <span className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_2f2a842e, styles.r_940924b6, styles.r_012fbd12, styles.r_ac204c10, styles.r_7bdcf974)} />
        <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_d058ca6d)}>
            <span className={cx(styles.r_2689f395, styles.r_399e11a5)}>{yyyy}/{mm}/{dd}</span>
            <span className={cn(cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3), meta.color)}>
              {meta.emoji} {stageText}
            </span>
          </div>

          {entry.note &&
          <Tooltip content={entry.note}>
              <p className={cx(styles.r_15e1b1f4, styles.r_054cb4e3, styles.r_359090c2, styles.r_0ab0615a)}>{entry.note}</p>
            </Tooltip>
          }

          {entry.images.length > 0 &&
          <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_44ee8ba0)}>
              {entry.images.slice(0, 3).map((image, index) =>
            <div key={`${image}-${index}`} className={cx(styles.r_d89972fe, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_2cd02d11, styles.r_07389a77, styles.r_e7c8531b)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)} />
                </div>
            )}
              {entry.images.length > 3 &&
            <div className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_3960ffc2, styles.r_86843cf1, styles.r_07389a77, styles.r_fd9dca32, styles.r_1dc571a3, styles.r_72a4c7cd)}>
                  +{entry.images.length - 3}
                </div>
            }
            </div>
          }
        </div>
      </div>
    </div>);

}