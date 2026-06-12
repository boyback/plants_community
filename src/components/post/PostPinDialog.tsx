'use client';

import { Dialog } from '@/components/ui/Dialog';
import type { PostPinScope } from '@/lib/types';
import { cn } from '@/lib/utils';
import styles from './PostPinDialog.module.scss';
import { cx } from '@/lib/style-utils';



export type PostPinTarget = {
  key: string;
  scope: PostPinScope;
  targetId: string;
  label: string;
  description: string;
};

export type PostPinLike = {
  id: string;
  scope: PostPinScope | string;
  targetId: string;
};

export function PostPinDialog({
  open,
  onClose,
  postId,
  postTitle,
  authorName,
  authorHref,
  pins,
  targets,
  busyKey,
  onToggle











}: {open: boolean;onClose: () => void;postId: string;postTitle: string;authorName?: string;authorHref?: string;pins: PostPinLike[];targets: PostPinTarget[];busyKey: string | null;onToggle: (target: PostPinTarget) => void;}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="置顶管理"
      maxWidth="lg">

      <div className={styles.r_3e7ce58d}>
        <div className={cx(styles.r_6f7e013d, styles.r_421ac2be, styles.r_a8a62ca4, styles.r_eb6e8b88, styles.r_fc7473ca)}>
          {authorName &&
          <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
              <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>发帖人：</span>
              {authorHref ?
            <a
              href={authorHref}
              target="_blank"
              rel="noreferrer"
              className={cx(styles.r_7e0b7cdf, styles.r_2689f395, styles.r_5f6a59f1, styles.r_81be6435, styles.r_f673f4a7)}>

                  {authorName}
                </a> :

            <span className={cx(styles.r_7e0b7cdf, styles.r_2689f395, styles.r_399e11a5)}>{authorName}</span>
            }
            </div>
          }
          <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
            <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>帖子标题：</span>
            <span className={cx(styles.r_7e0b7cdf, styles.r_170cee3f, styles.r_2689f395, styles.r_399e11a5)}>{postTitle}</span>
          </div>
          <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
            <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>帖子 ID：</span>
            <a
              href={`/post/${postId}`}
              target="_blank"
              rel="noreferrer"
              className={cx(styles.r_7e0b7cdf, styles.r_451f34ab, styles.r_0e65706b, styles.r_359090c2, styles.r_5f6a59f1, styles.r_81be6435, styles.r_f673f4a7)}>

              {postId}
            </a>
          </div>
        </div>

        <div className={styles.r_6f7e013d}>
          {targets.map((target) => {
            const pinned = isPostPinned(pins, target);
            const loading = busyKey === target.key;
            return (
              <div
                key={target.key}
                className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3, styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0e17f2bd, styles.r_03b4dd7f)}>

                <div className={styles.r_7e0b7cdf}>
                  <div className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{target.label}</div>
                  <div className={cx(styles.r_15e1b1f4, styles.r_359090c2, styles.r_7b89cd85)}>{target.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggle(target)}
                  disabled={Boolean(busyKey)}
                  className={cn(cx(styles.r_012fbd12, styles.r_421ac2be, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_2689f395, styles.r_ceb69a6b, styles.r_5f533b3a, styles.r_d463b664),

                  pinned ? cx(styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_5e10cdb8, styles.r_eb6abb1f, styles.r_5399e21f) : cx(styles.r_6bceb016, styles.r_72a4c7cd, styles.r_e269e58c)


                  )}>

                  {loading ? '处理中...' : pinned ? '取消置顶' : '置顶'}
                </button>
              </div>);

          })}
        </div>
      </div>
    </Dialog>);

}

export function isPostPinned(pins: PostPinLike[], target: PostPinTarget): boolean {
  return pins.some((pin) => pin.scope === target.scope && pin.targetId === target.targetId);
}

export function pinScopeLabel(scope: string) {
  switch (scope) {
    case 'global':
      return '全局';
    case 'topic':
      return '话题';
    case 'board':
      return '板块';
    case 'genus':
      return '属';
    case 'species':
      return '品种';
    default:
      return '置顶';
  }
}