import styles from './PostCardSkeleton.module.scss';
import { cx } from '@/lib/style-utils';

/**
 * PostCard 骨架屏占位
 * 高度随机化,模拟瀑布流真实卡片不同高度,避免加载时视觉抖动太明显
 */
export function PostCardSkeleton({ variant }: {variant?: number;}) {
  // 用 variant 决定图片高度;不传时按一组循环高度避免全相同
  const idx =
  typeof variant === 'number' ?
  variant :
  Math.floor(Math.random() * HEIGHTS.length);
  const h = HEIGHTS[idx % HEIGHTS.length];
  return (
    <div className={cx(styles.r_d59b9794, styles.r_2cd02d11)}>
      <div className={cx(styles.r_6da6a3c3, styles.r_794f0116, `${h}`)} />
      <div className={cx(styles.r_6f7e013d, styles.r_eb6e8b88)}>
        {/* 标题占位 */}
        <div className={cx(styles.r_6a60c09e, styles.r_1e2af6a1, styles.r_07389a77, styles.r_794f0116)} />
        <div className={cx(styles.r_6a60c09e, styles.r_7b76aeaa, styles.r_07389a77, styles.r_e9128c9d)} />
        {/* journal 类型的小图片骨架占位 - 使用与实际相同的布局 + journal-entry-image */}
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_44ee8ba0, styles.r_6b7d6e21)}>
          <div className={cx("journal-entry-image", styles.r_07389a77, styles.r_e9128c9d)} />
          <div className={cx("journal-entry-image", styles.r_07389a77, styles.r_e9128c9d)} />
          <div className={cx("journal-entry-image", styles.r_07389a77, styles.r_e9128c9d)} />
          <div className={cx("journal-entry-image", styles.r_07389a77, styles.r_e9128c9d)} />
          <div className={cx("journal-entry-image", styles.r_07389a77, styles.r_e9128c9d)} />
        </div>
        {/* meta 占位 */}
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_6b7d6e21)}>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e)}>
            <div className={cx(styles.r_cd0d9c51, styles.r_72470489, styles.r_ac204c10, styles.r_794f0116)} />
            <div className={cx(styles.r_9b3d0721, styles.r_baceed34, styles.r_07389a77, styles.r_e9128c9d)} />
          </div>
          <div className={cx(styles.r_9b3d0721, styles.r_e7e37107, styles.r_07389a77, styles.r_03da3658)} />
        </div>
      </div>
    </div>);

}

const HEIGHTS = ["h-44", "h-52", "h-60", "h-48", "h-56", "h-64", "h-40", "h-72"];