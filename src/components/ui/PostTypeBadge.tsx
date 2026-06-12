import type { PostType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { I18nText } from '@/components/ui/I18nText';
import styles from './PostTypeBadge.module.scss';
import { cx } from '@/lib/style-utils';



const META: Record<PostType, {emoji: string;color: string;zh: string;}> = {
  rich: { emoji: '📝', color: cx(styles.r_7ebecbb6, styles.r_5f6a59f1, styles.r_88b684d2), zh: '长文' },
  image: { emoji: '🖼️', color: cx(styles.r_03bc2b4a, styles.r_4c52c236, styles.r_042063d7), zh: '图文' },
  short: { emoji: '💬', color: cx(styles.r_c1ebae4b, styles.r_4a8233d4, styles.r_26e27727), zh: '短内容' },
  vote: { emoji: '🗳️', color: cx(styles.r_67d2289d, styles.r_85d79ebf, styles.r_d85e2a6f), zh: '投票' },
  video: { emoji: '🎬', color: cx(styles.r_0759a0f1, styles.r_b54428d1, styles.r_3d496065), zh: '视频' },
  event: { emoji: '🎉', color: cx(styles.r_3b5cf6c0, styles.r_06fd2bc1, styles.r_5650c76d), zh: '活动' },
  help: { emoji: '🆘', color: cx(styles.r_3cc00fe7, styles.r_65b7dd19, styles.r_59b06075), zh: '求助' },
  journal: { emoji: '📖', color: cx(styles.r_d01e7232, styles.r_cf2c3db6, styles.r_38fd2470), zh: '记录贴' }
};

const FALLBACK = { emoji: '📄', color: cx(styles.r_7ebecbb6, styles.r_5f6a59f1, styles.r_88b684d2), zh: '' };

export function PostTypeBadge({ type, className }: {type: PostType;className?: string;}) {
  const m = META[type] ?? FALLBACK;
  return (
    <span
      className={cn(cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_2689f395),

      m.color,
      className
      )}>

      <span aria-hidden>{m.emoji}</span>
      <I18nText k={`post.typeShort.${type}`} fallback={m.zh} />
    </span>);

}