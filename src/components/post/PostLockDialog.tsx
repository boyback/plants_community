'use client';

import { Dialog } from '@/components/ui/Dialog';
import styles from './PostLockDialog.module.scss';
import { cx } from '@/lib/style-utils';



export function PostLockDialog({
  open,
  onClose,
  postId,
  postTitle,
  authorName,
  authorHref,
  locked,
  submitting,
  onConfirm










}: {open: boolean;onClose: () => void;postId: string;postTitle: string;authorName?: string;authorHref?: string;locked: boolean;submitting: boolean;onConfirm: () => void;}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={locked ? '确认解锁' : '确认锁定'}
      maxWidth="lg"
      actions={
      <div className={cx(styles.r_fb56d9cf, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className={cx(styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_ceb69a6b, styles.r_5399e21f, styles.r_5f533b3a, styles.r_d463b664)}>

            取消
          </button>
          <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className={cx(styles.r_421ac2be, styles.r_6bceb016, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_2689f395, styles.r_72a4c7cd, styles.r_ceb69a6b, styles.r_e269e58c, styles.r_5f533b3a, styles.r_d463b664)}>

            {submitting ? '处理中...' : locked ? '确认解锁' : '确认锁定'}
          </button>
        </div>
      }>

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
        <p className={cx(styles.r_fc7473ca, styles.r_02eb621e)}>
          {locked ?
          '解锁后用户可以继续回复和互动。' :
          '锁定后该帖子将不能继续回复或进行受限互动。'}
        </p>
      </div>
    </Dialog>);

}