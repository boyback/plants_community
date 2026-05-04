import type { PostType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Item {
  type: PostType;
  emoji: string;
  label: string;
  desc: string;
  pcOnly?: boolean;
}

const items: Item[] = [
  { type: 'rich', emoji: '📝', label: '富文本贴', desc: '适合教程、长篇心得(PC & APP 发布)' },
  { type: 'short', emoji: '💬', label: '短内容贴', desc: '随手一发,即兴分享(PC & APP 发布)' },
  { type: 'vote', emoji: '🗳️', label: '投票贴', desc: '发起投票,集思广益(仅 PC 发布)', pcOnly: true },
  { type: 'video', emoji: '🎬', label: '视频贴', desc: '上传视频记录(PC & APP 均可发布)' },
  { type: 'event', emoji: '🎉', label: 'EVENT 贴', desc: '组织线下活动(仅 PC 可发布)', pcOnly: true },
];

export function TypePicker({
  value,
  onChange,
}: {
  value: PostType;
  onChange: (t: PostType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {items.map((it) => (
        <button
          key={it.type}
          type="button"
          onClick={() => onChange(it.type)}
          className={cn(
            'relative rounded-xl border-2 p-3 text-left transition-all',
            value === it.type
              ? 'border-leaf-500 bg-leaf-50/60'
              : 'border-leaf-100 bg-white hover:border-leaf-300'
          )}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xl">{it.emoji}</span>
            {it.pcOnly && (
              <span className="rounded bg-leaf-50 px-1 text-[10px] text-leaf-700">
                PC
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-ink-800">{it.label}</div>
          <div className="mt-0.5 text-[10px] leading-tight text-leaf-700/70">{it.desc}</div>
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
