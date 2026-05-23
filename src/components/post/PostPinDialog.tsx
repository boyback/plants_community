'use client';

import { Dialog } from '@/components/ui/Dialog';
import type { PostPinScope } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  postTitle: string;
  authorName?: string;
  authorHref?: string;
  pins: PostPinLike[];
  targets: PostPinTarget[];
  busyKey: string | null;
  onToggle: (target: PostPinTarget) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="置顶管理"
      maxWidth="lg"
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

        <div className="space-y-2">
          {targets.map((target) => {
            const pinned = isPostPinned(pins, target);
            const loading = busyKey === target.key;
            return (
              <div
                key={target.key}
                className="flex items-center justify-between gap-3 rounded-md border border-leaf-100 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink-800">{target.label}</div>
                  <div className="mt-0.5 text-xs text-ink-500">{target.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggle(target)}
                  disabled={Boolean(busyKey)}
                  className={cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    pinned
                      ? 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
                      : 'bg-leaf-600 text-white hover:bg-leaf-700',
                  )}
                >
                  {loading ? '处理中...' : pinned ? '取消置顶' : '置顶'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
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
