'use client';

import { Dialog } from '@/components/ui/Dialog';
import { BoardSelect, type BoardSelection } from '@/components/editor/BoardSelect';

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
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  authorName: string;
  authorHref: string;
  currentBoardLabel: string;
  selection: BoardSelection;
  submitting: boolean;
  onSelectionChange: (selection: BoardSelection) => void;
  onConfirm: () => void;
}) {
  const targetBoardLabel = selection.label || currentBoardLabel;
  const disabled =
    submitting || (!selection.categorySlug && !selection.genusSlug && !selection.speciesSlug);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="移帖"
      maxWidth="lg"
      actions={
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className="rounded-md bg-leaf-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-leaf-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '移动中...' : '确认移帖'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2 rounded-md bg-leaf-50/60 p-3 text-sm">
          <div className="flex gap-2">
            <span className="shrink-0 text-ink-500">发帖人：</span>
            <a
              href={authorHref}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 font-medium text-leaf-700 hover:text-leaf-800 hover:underline"
            >
              {authorName}
            </a>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 text-ink-500">帖子标题：</span>
            <span className="min-w-0 break-words font-medium text-ink-800">{postTitle}</span>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 text-ink-500">帖子 ID：</span>
            <a
              href={`/post/${postId}`}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 break-all font-mono text-xs text-leaf-700 hover:text-leaf-800 hover:underline"
            >
              {postId}
            </a>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 text-ink-500">现在的板块：</span>
            <span className="min-w-0 font-medium text-ink-800">{currentBoardLabel}</span>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 text-ink-500">移动到：</span>
            <span className="min-w-0 font-medium text-leaf-700">{targetBoardLabel}</span>
          </div>
        </div>
        <BoardSelect
          value={selection}
          onChange={onSelectionChange}
          placeholder="搜索并选择目标板块"
        />
      </div>
    </Dialog>
  );
}
