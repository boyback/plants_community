'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client-api';
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
  type PostPinTarget,
} from '@/components/post/PostPinDialog';

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
  targets,
}: {
  postId: string;
  postTitle: string;
  authorName?: string;
  authorHref?: string;
  initialBoardSelection: BoardSelection;
  initialBoardLabel: string;
  initialLocked: boolean;
  deleted: boolean;
  reviewStatus?: string;
  initialPins: PostPinLike[];
  targets: PostPinTarget[];
}) {
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
        targetId: target.targetId,
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
        speciesSlug: moveSelection.speciesSlug || undefined,
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
        action: locked ? 'unlock' : 'lock',
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
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {pins.length > 0 ? (
            pins.map((pin) => (
              <span
                key={pin.id}
                className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700"
              >
                {pinScopeLabel(pin.scope)}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-ink-400">-</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex flex-wrap justify-end gap-1">
          {!deleted && (
            <button
              type="button"
              onClick={() => setMoveOpen(true)}
              disabled={moveSubmitting}
              className="rounded bg-ink-100 px-2 py-1 text-[10px] text-ink-700 hover:bg-ink-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              移帖
            </button>
          )}
          {!deleted && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              disabled={Boolean(busyKey)}
              className="rounded bg-leaf-100 px-2 py-1 text-[10px] text-leaf-700 hover:bg-leaf-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              置顶管理
            </button>
          )}
          {!deleted && (
            <button
              type="button"
              onClick={() => setLockOpen(true)}
              disabled={lockSubmitting}
              className="rounded bg-amber-100 px-2 py-1 text-[10px] text-amber-700 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locked ? '解锁' : '锁定'}
            </button>
          )}
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
        onToggle={togglePin}
      />

      <PostMoveDialog
        open={moveOpen}
        onClose={() => {
          if (!moveSubmitting) setMoveOpen(false);
        }}
        postId={postId}
        postTitle={postTitle}
        authorName={authorName ?? '-'}
        authorHref={authorHref ?? `/post/${postId}`}
        currentBoardLabel={currentBoardLabel}
        selection={moveSelection}
        submitting={moveSubmitting}
        onSelectionChange={setMoveSelection}
        onConfirm={confirmMove}
      />

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
        onConfirm={confirmLock}
      />
    </>
  );
}
