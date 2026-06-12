import type { ReactNode } from 'react';
import styles from './Empty.module.scss';
import { cx } from '@/lib/style-utils';



export function Empty({
  icon = '🌵',
  title = '暂无内容',
  desc,
  action





}: {icon?: string;title?: ReactNode;desc?: ReactNode;action?: ReactNode;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_68f2db62, styles.r_24a9e3ad, styles.r_4e2225b7, styles.r_0d13093a, styles.r_02cafd38, styles.r_ca6bf630)}>
      {/* 图标容器 */}
      <div className={cx(styles.r_b6777c6d, styles.r_60fbb771, styles.r_0a769880, styles.r_ed831a4d, styles.r_3960ffc2, styles.r_86843cf1, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_66691b5f, styles.r_5e10cdb8, styles.r_438b2237)}>
        <div className={styles.r_a95699d9}>{icon}</div>
      </div>

      {/* 标题 */}
      <div className={cx(styles.r_1bb88326, styles.r_4ee73492, styles.r_2689f395, styles.r_399e11a5)}>{title}</div>

      {/* 分隔线 */}
      <div className={cx(styles.r_1bb88326, styles.r_aea61608, styles.r_69da7e4f, styles.r_6ae7db2c, styles.r_bbb26aaf, styles.r_a4cf77bd, styles.r_0fe2b3da)}></div>

      {/* 描述文字 */}
      {desc && <div className={cx(styles.r_b6777c6d, styles.r_3acf64d5, styles.r_fc7473ca, styles.r_69335b95)}>{desc}</div>}

      {/* 操作按钮 */}
      {action && <div className={styles.r_50d0d216}>{action}</div>}
    </div>);

}