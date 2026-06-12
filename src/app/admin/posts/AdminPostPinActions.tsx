'use client';

import { useState } from 'react';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import type { Post } from '@/lib/types';
import type { BoardSelection } from '@/components/editor/BoardSelect';
import { PostAdminActions } from './PostAdminActions';
import { PostMoveDialog } from '@/components/post/PostMoveDialog';
import { PostLockDialog } from '@/components/post/PostLockDialog';
import {
  isPostPinned,
  pinScopeLabel,
  PostPinDialog,
  type PostPinLike,
  type PostPinTarget } from
'@/components/post/PostPinDialog';
import styles from './AdminPostPinActions.module.scss';
import { cx } from '@/lib/style-utils';



export function AdminPostPinActions({
  postId,
  postTitle,
  authorName,
  authorHref,
  initialBoardSelection,
  initialBoardLabel,
  initialLocked,
  deleted,
  reviewStatus,
  initialPins,
  targets












}: {postId: string;postTitle: string;authorName?: string;authorHref?: string;initialBoardSelection: BoardSelection;initialBoardLabel: string;initialLocked: boolean;deleted: boolean;reviewStatus?: string;initialPins: PostPinLike[];targets: PostPinTarget[];}) {
  const [pins, setPins] = useState<PostPinLike[]>(initialPins);
  const [open, setOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [locked, setLocked] = useState(initialLocked);
  const [moveSelection, setMoveSelection] = useState<BoardSelection>(initialBoardSelection);
  const [currentBoardLabel, setCurrentBoardLabel] = useState(initialBoardLabel);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [moveSubmitting, setMoveSubmitting] = useState(false);
  const [lockSubmitting, setLockSubmitting] = useState(false);

  const togglePin = async (target: PostPinTarget) => {
    const pinned = isPostPinned(pins, target);
    setBusyKey(target.key);
    try {
      const updated = await api.post<Post>(`/api/posts/${postId}/admin`, {
        action: pinned ? 'unpin' : 'pin',
        scope: target.scope,
        targetId: target.targetId
      });
      setPins(updated.pins ?? []);
      toast.success(pinned ? '取消置顶成功' : '置顶成功');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '操作失败');
    } finally {
      setBusyKey(null);
    }
  };

  const confirmMove = async () => {
    if (!moveSelection.categorySlug && !moveSelection.genusSlug && !moveSelection.speciesSlug) {
      toast.error('请选择目标板块');
      return;
    }
    setMoveSubmitting(true);
    try {
      await api.post<Post>(`/api/posts/${postId}/admin`, {
        action: 'move',
        categorySlug: moveSelection.categorySlug || undefined,
        genusSlug: moveSelection.genusSlug || undefined,
        speciesSlug: moveSelection.speciesSlug || undefined
      });
      toast.success('移帖成功');
      setCurrentBoardLabel(moveSelection.label || currentBoardLabel);
      setMoveOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '移帖失败');
    } finally {
      setMoveSubmitting(false);
    }
  };

  const confirmLock = async () => {
    setLockSubmitting(true);
    try {
      const updated = await api.post<Post>(`/api/posts/${postId}/admin`, {
        action: locked ? 'unlock' : 'lock'
      });
      setLocked(updated.locked === true);
      toast.success(locked ? '解锁成功' : '锁定成功');
      setLockOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : '操作失败');
    } finally {
      setLockSubmitting(false);
    }
  };

  return (
    <>
      <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_44ee8ba0)}>
          {pins.length > 0 ?
          pins.map((pin) =>
          <span
            key={pin.id}
            className={cx(styles.r_ac204c10, styles.r_735dd972, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_85d79ebf)}>

                {pinScopeLabel(pin.scope)}
              </span>
          ) :

          <span className={cx(styles.r_1dc571a3, styles.r_66a36c90)}>-</span>
          }
        </div>
      </td>
      <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77c08e01, styles.r_44ee8ba0)}>
          {!deleted &&
          <button
            type="button"
            onClick={() => setMoveOpen(true)}
            disabled={moveSubmitting}
            className={cx(styles.r_07389a77, styles.r_febec8f2, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_eb6abb1f, styles.r_1e172434, styles.r_5f533b3a, styles.r_d463b664)}>

              移帖
            </button>
          }
          {!deleted &&
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={Boolean(busyKey)}
            className={cx(styles.r_07389a77, styles.r_f2b23104, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_5f6a59f1, styles.r_d8a68f7c, styles.r_5f533b3a, styles.r_d463b664)}>

              置顶管理
            </button>
          }
          {!deleted &&
          <button
            type="button"
            onClick={() => setLockOpen(true)}
            disabled={lockSubmitting}
            className={cx(styles.r_07389a77, styles.r_735dd972, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_85d79ebf, styles.r_bfa526ce, styles.r_5f533b3a, styles.r_d463b664)}>

              {locked ? '解锁' : '锁定'}
            </button>
          }
          <PostAdminActions postId={postId} deleted={deleted} reviewStatus={reviewStatus} />
        </div>
      </td>

      <PostPinDialog
        open={open}
        onClose={() => {
          if (!busyKey) setOpen(false);
        }}
        postId={postId}
        postTitle={postTitle}
        authorName={authorName}
        authorHref={authorHref}
        pins={pins}
        targets={targets}
        busyKey={busyKey}
        onToggle={togglePin} />


      <PostMoveDialog
        open={moveOpen}
        onClose={() => {
          if (!moveSubmitting) setMoveOpen(false);
        }}
        postId={postId}
        postTitle={postTitle}
        authorName={authorName ?? "-"}
        authorHref={authorHref ?? `/post/${postId}`}
        currentBoardLabel={currentBoardLabel}
        selection={moveSelection}
        submitting={moveSubmitting}
        onSelectionChange={setMoveSelection}
        onConfirm={confirmMove} />


      <PostLockDialog
        open={lockOpen}
        onClose={() => {
          if (!lockSubmitting) setLockOpen(false);
        }}
        postId={postId}
        postTitle={postTitle}
        authorName={authorName}
        authorHref={authorHref}
        locked={locked}
        submitting={lockSubmitting}
        onConfirm={confirmLock} />

    </>);

}