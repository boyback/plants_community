'use client';

import type { PostType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nContext';

interface Item {
  type: PostType;
  emoji: string;
  pcOnly?: boolean;
}

const items: Item[] = [
  { type: 'rich', emoji: '📝' },
  { type: 'journal', emoji: '📖' },
  { type: 'short', emoji: '💬' },
  { type: 'vote', emoji: '🗳️' },
  // { type: 'video', emoji: '🎬' },
  // { type: 'event', emoji: '🎉' }, // 暂时隐藏，未来再完善
  { type: 'help', emoji: '❓' },
];

export function TypePicker({
  value,
  onChange,
}: {
  value: PostType;
  onChange: (t: PostType) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => (
        <button
          key={it.type}
          type="button"
          onClick={() => onChange(it.type)}
          className={cn(
            'relative rounded-none border-2 p-3 text-left transition-all',
            value === it.type
              ? 'border-leaf-500 bg-leaf-50/60'
              : 'border-leaf-100 bg-white hover:border-leaf-300'
          )}
        >
          <div className="mb-1 text-xl">{it.emoji}</div>
          <div className="text-sm font-medium text-ink-800">
            {t(`post.typeBadge.${it.type}`)}
          </div>
          <div className="mt-0.5 text-[10px] leading-tight text-leaf-700/70">
            {t(`post.typeDesc.${it.type}`)}
          </div>
          {value === it.type && (
            <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-leaf-500 text-xs text-white">
              ✓
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
