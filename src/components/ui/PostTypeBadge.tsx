import type { PostType } from '@/lib/types';
import { cn } from '@/lib/utils';

const map: Record<PostType, { label: string; emoji: string; color: string }> = {
  rich: { label: '富文本', emoji: '📝', color: 'bg-leaf-50 text-leaf-700 border-leaf-100' },
  short: { label: '短内容', emoji: '💬', color: 'bg-sand-50 text-sand-300 border-sand-100' },
  vote: { label: '投票', emoji: '🗳️', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  video: { label: '视频', emoji: '🎬', color: 'bg-rose-50 text-rose-700 border-rose-100' },
  event: { label: '活动', emoji: '🎉', color: 'bg-violet-50 text-violet-700 border-violet-100' },
};

export function PostTypeBadge({ type, className }: { type: PostType; className?: string }) {
  const m = map[type];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        m.color,
        className
      )}
    >
      <span aria-hidden>{m.emoji}</span>
      {m.label}
    </span>
  );
}
