import type { PostType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { I18nText } from '@/components/ui/I18nText';

const META: Record<PostType, { emoji: string; color: string; zh: string }> = {
  rich: { emoji: '📝', color: 'bg-leaf-50 text-leaf-700 border-leaf-100', zh: '富文本' },
  short: { emoji: '💬', color: 'bg-sand-50 text-sand-300 border-sand-100', zh: '短内容' },
  vote: { emoji: '🗳️', color: 'bg-amber-50 text-amber-700 border-amber-100', zh: '投票' },
  video: { emoji: '🎬', color: 'bg-rose-50 text-rose-700 border-rose-100', zh: '视频' },
  event: { emoji: '🎉', color: 'bg-violet-50 text-violet-700 border-violet-100', zh: '活动' },
  help: { emoji: '🆘', color: 'bg-blue-50 text-blue-700 border-blue-100', zh: '求助' },
};

const FALLBACK = { emoji: '📄', color: 'bg-leaf-50 text-leaf-700 border-leaf-100', zh: '' };

export function PostTypeBadge({ type, className }: { type: PostType; className?: string }) {
  const m = META[type] ?? FALLBACK;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        m.color,
        className
      )}
    >
      <span aria-hidden>{m.emoji}</span>
      <I18nText k={`post.typeShort.${type}`} fallback={m.zh} />
    </span>
  );
}
