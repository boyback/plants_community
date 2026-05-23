'use client';

import { Dialog } from '@/components/ui/Dialog';

export function PostLockDialog({
  open,
  onClose,
  postId,
  postTitle,
  authorName,
  authorHref,
  locked,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  authorName?: string;
  authorHref?: string;
  locked: boolean;
  submitting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={locked ? '确认解锁' : '确认锁定'}
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
            disabled={submitting}
            className="rounded-md bg-leaf-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-leaf-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '处理中...' : locked ? '确认解锁' : '确认锁定'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2 rounded-md bg-leaf-50/60 p-3 text-sm">
          {authorName && (
            <div className="flex gap-2">
              <span className="shrink-0 text-ink-500">发帖人：</span>
              {authorHref ? (
                <a
                  href={authorHref}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 font-medium text-leaf-700 hover:text-leaf-800 hover:underline"
                >
                  {authorName}
                </a>
              ) : (
                <span className="min-w-0 font-medium text-ink-800">{authorName}</span>
              )}
            </div>
          )}
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
        </div>
        <p className="text-sm text-ink-600">
          {locked
            ? '解锁后用户可以继续回复和互动。'
            : '锁定后该帖子将不能继续回复或进行受限互动。'}
        </p>
      </div>
    </Dialog>
  );
}
