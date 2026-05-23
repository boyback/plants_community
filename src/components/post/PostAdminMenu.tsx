'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';
import type { Post, PostAdminPermissions, PostPinScope } from '@/lib/types';
import { api } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { BoardSelect, type BoardSelection } from '@/components/editor/BoardSelect';
import { PostMoveDialog } from '@/components/post/PostMoveDialog';
import { PostLockDialog } from '@/components/post/PostLockDialog';
import {
  isPostPinned,
  PostPinDialog,
  type PostPinTarget,
} from '@/components/post/PostPinDialog';

interface PostAdminMenuProps {
  post: Post;
  user?: {
    id: string;
    role?: 'user' | 'moderator' | 'admin';
    isSuperAdmin?: boolean;
  } | null;
  align?: 'right' | 'center';
  buttonSize?: 'sm' | 'md';
  onChanged?: () => void;
  onPostChanged?: (post: Post) => void;
  onPostDeleted?: (postId: string) => void;
}

const EMPTY_PERMISSIONS: PostAdminPermissions = {
  canManage: false,
  canEdit: false,
  canDelete: false,
  canMove: false,
  canPin: false,
  canLock: false,
  canBan: false,
  canReview: false,
};

function fallbackPermissions(post: Post, user?: PostAdminMenuProps['user']): PostAdminPermissions {
  if (!user) return EMPTY_PERMISSIONS;
  const isAuthor = user.id === post.author.id;
  const isSuperAdmin = user.isSuperAdmin === true;
  const isModerator = user.role === 'moderator';
  const isAdmin = user.role === 'admin';
  const canEdit = isAuthor && ['rich', 'short', 'video', 'vote', 'event', 'journal', 'help'].includes(post.type);
  const canDelete = isAuthor || isModerator || isAdmin || isSuperAdmin;
  const canMove = isModerator || isAdmin || isSuperAdmin;
  const canPin = isModerator || isAdmin || isSuperAdmin;
  const canLock = isModerator || isAdmin || isSuperAdmin;
  const canBan = isSuperAdmin && !isAuthor;
  const canReview = isSuperAdmin;
  return {
    canManage: canEdit || canDelete || canMove || canPin || canLock || canBan || canReview,
    canEdit,
    canDelete,
    canMove,
    canPin,
    canLock,
    canBan,
    canReview,
  };
}

export function PostAdminMenu({
  post,
  user,
  align = 'right',
  buttonSize = 'sm',
  onChanged,
  onPostChanged,
  onPostDeleted,
}: PostAdminMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveSubmitting, setMoveSubmitting] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [lockSubmitting, setLockSubmitting] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinSubmittingKey, setPinSubmittingKey] = useState<string | null>(null);
  const [moveSelection, setMoveSelection] = useState<BoardSelection>(() => getInitialBoardSelection(post));
  const permissions = post.adminPermissions ?? fallbackPermissions(post, user);

  if (!permissions.canManage) return null;

  const refresh = () => {
    if (onChanged) {
      onChanged();
      return;
    }
    router.refresh();
  };

  const runAdminAction = async (action: string, body?: Record<string, unknown>) => {
    try {
      const updatedPost = await api.post<Post>(`/api/posts/${post.id}/admin`, { action, ...body });
      toast.success('操作成功');
      setOpen(false);
      if (onPostChanged) {
        onPostChanged(updatedPost);
      } else {
        refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleEdit = () => {
    setOpen(false);
    router.push(`/post/${post.id}/edit`);
  };

  const handleDelete = async () => {
    if (!window.confirm('确定删除这篇帖子吗？此操作无法撤销。')) return;
    const reason = window.prompt('删除原因（可选）：') || '管理员删除';
    try {
      await api.post<{ deletedId: string }>(`/api/posts/${post.id}/admin`, {
        action: 'delete',
        reason,
      });
      toast.success('删除成功');
      setOpen(false);
      if (onPostDeleted) {
        onPostDeleted(post.id);
      } else {
        router.push('/');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleBanUser = async () => {
    const reason = window.prompt(`封禁用户 ${post.author.name} 的原因：`);
    if (!reason) return;
    const days = window.prompt('封禁天数：', '7');
    if (!days) return;
    try {
      await api.post(`/api/posts/${post.id}/admin`, {
        action: 'ban_user',
        userId: post.author.id,
        duration: Number(days),
        reason,
      });
      toast.success('封禁成功');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '封禁失败');
    }
  };

  const handleMove = () => {
    setOpen(false);
    setMoveSelection(getInitialBoardSelection(post));
    setMoveOpen(true);
  };

  const handlePinManage = () => {
    setOpen(false);
    setPinOpen(true);
  };

  const handleLockManage = () => {
    setOpen(false);
    setLockOpen(true);
  };

  const confirmLock = async () => {
    setLockSubmitting(true);
    try {
      const updatedPost = await api.post<Post>(`/api/posts/${post.id}/admin`, {
        action: post.locked ? 'unlock' : 'lock',
      });
      toast.success(post.locked ? '解锁成功' : '锁定成功');
      setLockOpen(false);
      if (onPostChanged) {
        onPostChanged(updatedPost);
      } else {
        refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setLockSubmitting(false);
    }
  };

  const togglePin = async (target: PostPinTarget) => {
    const pinned = isPostPinned(post.pins ?? [], target);
    setPinSubmittingKey(target.key);
    try {
      const updatedPost = await api.post<Post>(`/api/posts/${post.id}/admin`, {
        action: pinned ? 'unpin' : 'pin',
        scope: target.scope,
        targetId: target.targetId,
      });
      toast.success(pinned ? '取消置顶成功' : '置顶成功');
      if (onPostChanged) {
        onPostChanged(updatedPost);
      } else {
        refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setPinSubmittingKey(null);
    }
  };

  const confirmMove = async () => {
    if (!moveSelection.categorySlug && !moveSelection.genusSlug && !moveSelection.speciesSlug) {
      toast.error('请选择目标板块');
      return;
    }
    setMoveSubmitting(true);
    try {
      const movedPost = await api.post<Post>(`/api/posts/${post.id}/admin`, {
        action: 'move',
        categorySlug: moveSelection.categorySlug || undefined,
        genusSlug: moveSelection.genusSlug || undefined,
        speciesSlug: moveSelection.speciesSlug || undefined,
      });
      toast.success('移帖成功');
      setMoveOpen(false);
      if (onPostChanged) {
        onPostChanged(movedPost);
      } else {
        refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '移帖失败');
    } finally {
      setMoveSubmitting(false);
    }
  };

  const menuAlignClass =
    align === 'center'
      ? 'right-1/2 translate-x-1/2'
      : 'right-0';
  const arrowClass =
    align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'right-3';
  const buttonClass =
    buttonSize === 'md' ? 'h-8 w-8' : 'h-7 w-7';
  const currentBoardLabel = formatCurrentBoardLabel(post);
  const targetBoardLabel = moveSelection.label || currentBoardLabel;
  const pinTargets = buildPinTargets(post, user?.isSuperAdmin === true);

  return (
    <>
      <div
        className='relative'
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          type='button'
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'grid place-items-center rounded-none text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700',
            buttonClass,
          )}
          title='管理'
          aria-label='管理'
        >
          <Icon name='settings' size={buttonSize === 'md' ? 18 : 16} />
        </button>

        {open && (
          <div
            role='menu'
            className={cn('absolute top-full z-50 pt-2', menuAlignClass)}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            <div className='relative w-max rounded-none border border-leaf-100 bg-white py-1 shadow-xl'>
              <div
                className={cn(
                  'absolute -top-[6px] h-3 w-3 rotate-45 transform border-l border-t border-leaf-100 bg-white',
                  arrowClass,
                )}
              />

              {permissions.canEdit && (
                <MenuItem onClick={handleEdit}>编辑</MenuItem>
              )}

              {permissions.canMove && (
                <MenuItem onClick={handleMove}>移帖</MenuItem>
              )}

              {permissions.canPin && (
                <MenuItem onClick={handlePinManage}>置顶管理</MenuItem>
              )}

              {permissions.canLock && (
                <MenuItem onClick={handleLockManage}>
                  {post.locked ? '解锁' : '锁定'}
                </MenuItem>
              )}

              {permissions.canBan && (
                <MenuItem onClick={handleBanUser}>封禁用户</MenuItem>
              )}

              {permissions.canDelete && <div className='my-0.5 border-t border-leaf-50' />}

              {permissions.canDelete && (
                <MenuItem danger onClick={handleDelete}>删除</MenuItem>
              )}
            </div>
          </div>
        )}
      </div>

      <PostMoveDialog
        open={moveOpen}
        onClose={() => {
          if (!moveSubmitting) setMoveOpen(false);
        }}
        postId={post.id}
        postTitle={post.title}
        authorName={post.author.name}
        authorHref={`/user/${post.author.id}`}
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
        postId={post.id}
        postTitle={post.title}
        authorName={post.author.name}
        authorHref={`/user/${post.author.id}`}
        locked={post.locked === true}
        submitting={lockSubmitting}
        onConfirm={confirmLock}
      />

      <Dialog
        open={false}
        onClose={() => {
          if (!moveSubmitting) setMoveOpen(false);
        }}
        title='移帖'
        maxWidth='lg'
        actions={
          <div className='ml-auto flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setMoveOpen(false)}
              disabled={moveSubmitting}
              className='rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-60'
            >
              取消
            </button>
            <button
              type='button'
              onClick={confirmMove}
              disabled={moveSubmitting || (!moveSelection.categorySlug && !moveSelection.genusSlug && !moveSelection.speciesSlug)}
              className='rounded-md bg-leaf-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-leaf-700 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {moveSubmitting ? '移动中...' : '确认移帖'}
            </button>
          </div>
        }
      >
        <div className='space-y-4'>
          <div className='space-y-2 rounded-md bg-leaf-50/60 p-3 text-sm'>
            <div className='flex gap-2'>
              <span className='shrink-0 text-ink-500'>发帖人：</span>
              <a
                href={`/user/${post.author.id}`}
                target='_blank'
                rel='noreferrer'
                className='min-w-0 font-medium text-leaf-700 hover:text-leaf-800 hover:underline'
              >
                {post.author.name}
              </a>
            </div>
            <div className='flex gap-2'>
              <span className='shrink-0 text-ink-500'>帖子标题：</span>
              <span className='min-w-0 break-words font-medium text-ink-800'>{post.title}</span>
            </div>
            <div className='flex gap-2'>
              <span className='shrink-0 text-ink-500'>帖子 ID：</span>
              <a
                href={`/post/${post.id}`}
                target='_blank'
                rel='noreferrer'
                className='min-w-0 break-all font-mono text-xs text-leaf-700 hover:text-leaf-800 hover:underline'
              >
                {post.id}
              </a>
            </div>
            <div className='flex gap-2'>
              <span className='shrink-0 text-ink-500'>现在的板块：</span>
              <span className='min-w-0 font-medium text-ink-800'>{currentBoardLabel}</span>
            </div>
            <div className='flex gap-2'>
              <span className='shrink-0 text-ink-500'>移动到：</span>
              <span className='min-w-0 font-medium text-leaf-700'>{targetBoardLabel}</span>
            </div>
          </div>
          <BoardSelect
            value={moveSelection}
            onChange={setMoveSelection}
            placeholder='搜索并选择目标板块'
          />
        </div>
      </Dialog>

      <PostPinDialog
        open={pinOpen}
        onClose={() => {
          if (!pinSubmittingKey) setPinOpen(false);
        }}
        postId={post.id}
        postTitle={post.title}
        authorName={post.author.name}
        authorHref={`/user/${post.author.id}`}
        pins={post.pins ?? []}
        targets={pinTargets}
        busyKey={pinSubmittingKey}
        onToggle={togglePin}
      />

      <Dialog
        open={false}
        onClose={() => {
          if (!pinSubmittingKey) setPinOpen(false);
        }}
        title='置顶管理'
        maxWidth='lg'
      >
        <div className='space-y-4'>
          <div className='space-y-2 rounded-md bg-leaf-50/60 p-3 text-sm'>
            <div className='flex gap-2'>
              <span className='shrink-0 text-ink-500'>发帖人：</span>
              <a
                href={`/user/${post.author.id}`}
                target='_blank'
                rel='noreferrer'
                className='min-w-0 font-medium text-leaf-700 hover:text-leaf-800 hover:underline'
              >
                {post.author.name}
              </a>
            </div>
            <div className='flex gap-2'>
              <span className='shrink-0 text-ink-500'>帖子标题：</span>
              <span className='min-w-0 break-words font-medium text-ink-800'>{post.title}</span>
            </div>
            <div className='flex gap-2'>
              <span className='shrink-0 text-ink-500'>帖子 ID：</span>
              <a
                href={`/post/${post.id}`}
                target='_blank'
                rel='noreferrer'
                className='min-w-0 break-all font-mono text-xs text-leaf-700 hover:text-leaf-800 hover:underline'
              >
                {post.id}
              </a>
            </div>
          </div>

          <div className='space-y-2'>
            {pinTargets.map((target) => {
              const pinned = isPinned(post, target);
              const loading = pinSubmittingKey === target.key;
              return (
                <div
                  key={target.key}
                  className='flex items-center justify-between gap-3 rounded-md border border-leaf-100 px-3 py-2'
                >
                  <div className='min-w-0'>
                    <div className='text-sm font-medium text-ink-800'>{target.label}</div>
                    <div className='mt-0.5 text-xs text-ink-500'>{target.description}</div>
                  </div>
                  <button
                    type='button'
                    onClick={() => togglePin(target)}
                    disabled={Boolean(pinSubmittingKey)}
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
    </>
  );
}

function getInitialBoardSelection(post: Post): BoardSelection {
  const path = post.board.path ?? [];
  return {
    categorySlug:
      path.find((item) => item.level === 'category')?.slug ??
      (post.board.level === 'category' ? post.board.slug : ''),
    genusSlug:
      path.find((item) => item.level === 'genus')?.slug ??
      (post.board.level === 'genus' ? post.board.slug : ''),
    speciesSlug:
      path.find((item) => item.level === 'species')?.slug ??
      (post.board.level === 'species' ? post.board.slug : ''),
    label: formatCurrentBoardLabel(post),
  };
}

function formatCurrentBoardLabel(post: Post): string {
  const path = post.board.path ?? [];
  if (path.length > 0) return path.map((item) => item.name).join(' / ');
  return post.board.name;
}

type PinTarget = {
  key: string;
  scope: PostPinScope;
  targetId: string;
  label: string;
  description: string;
};

function buildPinTargets(post: Post, canGlobalPin: boolean): PinTarget[] {
  const targets: PinTarget[] = [];
  const boardScope: PostPinScope = post.board.level === 'category' ? 'board' : post.board.level;
  if (canGlobalPin) {
    targets.push({
      key: 'global:',
      scope: 'global',
      targetId: '',
      label: '全局置顶',
      description: '只在首页/全站推荐类列表中优先展示。',
    });
  }

  targets.push({
    key: `${boardScope}:${post.board.id}`,
    scope: boardScope,
    targetId: post.board.id,
    label: `${levelLabel(post.board.level)}置顶`,
    description: `只在 ${formatCurrentBoardLabel(post)} 范围内置顶。`,
  });

  for (const tag of post.tags.slice(0, 10)) {
    targets.push({
      key: `topic:${tag}`,
      scope: 'topic',
      targetId: tag,
      label: `话题置顶：#${tag}`,
      description: `只在 #${tag} 话题页内置顶。`,
    });
  }

  return targets;
}

function isPinned(post: Post, target: PinTarget): boolean {
  return (post.pins ?? []).some((pin) => pin.scope === target.scope && pin.targetId === target.targetId);
}

function levelLabel(level: Post['board']['level']): string {
  switch (level) {
    case 'category':
      return '板块';
    case 'genus':
      return '属';
    case 'species':
      return '品种';
    default:
      return '板块';
  }
}

function MenuItem({
  children,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'block w-full whitespace-nowrap px-3 py-1.5 text-center text-xs hover:bg-leaf-50',
        danger ? 'text-rose-600 hover:bg-rose-50' : 'text-ink-700',
      )}
    >
      {children}
    </button>
  );
}
