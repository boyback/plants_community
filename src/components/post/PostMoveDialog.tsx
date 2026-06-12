'use client';

import { Dialog } from '@/components/ui/Dialog';
import { BoardSelect, type BoardSelection } from '@/components/editor/BoardSelect';
import styles from './PostMoveDialog.module.scss';
import { cx } from '@/lib/style-utils';



export function PostMoveDialog({
  open,
  onClose,
  postId,
  postTitle,
  authorName,
  authorHref,
  currentBoardLabel,
  selection,
  submitting,
  onSelectionChange,
  onConfirm












}: {open: boolean;onClose: () => void;postId: string;postTitle: string;authorName: string;authorHref: string;currentBoardLabel: string;selection: BoardSelection;submitting: boolean;onSelectionChange: (selection: BoardSelection) => void;onConfirm: () => void;}) {
  const targetBoardLabel = selection.label || currentBoardLabel;
  const disabled =
  submitting || !selection.categorySlug && !selection.genusSlug && !selection.speciesSlug;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="移帖"
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
          disabled={disabled}
          className={cx(styles.r_421ac2be, styles.r_6bceb016, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_2689f395, styles.r_72a4c7cd, styles.r_ceb69a6b, styles.r_e269e58c, styles.r_5f533b3a, styles.r_d463b664)}>

            {submitting ? '移动中...' : '确认移帖'}
          </button>
        </div>
      }>

      <div className={styles.r_3e7ce58d}>
        <div className={cx(styles.r_6f7e013d, styles.r_421ac2be, styles.r_a8a62ca4, styles.r_eb6e8b88, styles.r_fc7473ca)}>
          <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
            <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>发帖人：</span>
            <a
              href={authorHref}
              target="_blank"
              rel="noreferrer"
              className={cx(styles.r_7e0b7cdf, styles.r_2689f395, styles.r_5f6a59f1, styles.r_81be6435, styles.r_f673f4a7)}>

              {authorName}
            </a>
          </div>
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
          <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
            <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>现在的板块：</span>
            <span className={cx(styles.r_7e0b7cdf, styles.r_2689f395, styles.r_399e11a5)}>{currentBoardLabel}</span>
          </div>
          <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
            <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>移动到：</span>
            <span className={cx(styles.r_7e0b7cdf, styles.r_2689f395, styles.r_5f6a59f1)}>{targetBoardLabel}</span>
          </div>
        </div>
        <BoardSelect
          value={selection}
          onChange={onSelectionChange}
          placeholder="搜索并选择目标板块" />

      </div>
    </Dialog>);

}