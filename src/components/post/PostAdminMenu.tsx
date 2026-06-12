'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';
import type { Post, PostAdminPermissions, PostPinScope } from '@/lib/types';
import { api } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { BoardSelect, type BoardSelection } from '@/components/editor/BoardSelect';
import { PostMoveDialog } from '@/components/post/PostMoveDialog';
import { PostLockDialog } from '@/components/post/PostLockDialog';
import {
  isPostPinned,
  PostPinDialog,
  type PostPinTarget } from
'@/components/post/PostPinDialog';
import styles from './PostAdminMenu.module.scss';
import { cx } from '@/lib/style-utils';



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
  canReview: false
};

function fallbackPermissions(post: Post, user?: PostAdminMenuProps['user']): PostAdminPermissions {
  if (!user) return EMPTY_PERMISSIONS;
  const isAuthor = user.id === post.author.id;
  const isSuperAdmin = user.isSuperAdmin === true;
  const isModerator = user.role === 'moderator';
  const isAdmin = user.role === 'admin';
  const canEdit = isAuthor && ['rich', 'image', 'short', 'video', 'vote', 'event', 'journal', 'help'].includes(post.type);
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
    canReview
  };
}

export function PostAdminMenu({
  post,
  user,
  align = 'right',
  buttonSize = 'sm',
  onChanged,
  onPostChanged,
  onPostDeleted
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
      await api.post<{deletedId: string;}>(`/api/posts/${post.id}/admin`, {
        action: 'delete',
        reason
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
        reason
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
        action: post.locked ? 'unlock' : 'lock'
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
        targetId: target.targetId
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
        speciesSlug: moveSelection.speciesSlug || undefined
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
  align === 'center' ? cx(styles.r_ad109e29, styles.r_a3869832) :

  styles.menuAlignRight;
  const arrowClass =
  align === 'center' ? cx(styles.r_e632769a, styles.r_efaa0701) :

  styles.menuArrowRight;
  const buttonClass =
  buttonSize === 'md' ? cx(styles.r_ed8a5df7, styles.r_2bbcfc3b) : cx(styles.r_d0a52b31, styles.r_cbbf90f9);
  const currentBoardLabel = formatCurrentBoardLabel(post);
  const targetBoardLabel = moveSelection.label || currentBoardLabel;
  const pinTargets = buildPinTargets(post, user?.isSuperAdmin === true);

  return (
    <>
      <div
        className={styles.r_d89972fe}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}>

        <button
          type='button'
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={() => setOpen((value) => !value)}
          className={cn(cx(styles.r_f3c543ad, styles.r_67d66567, styles.r_0c5e9137, styles.r_66a36c90, styles.r_ceb69a6b, styles.r_9cab05a6, styles.r_3364420b),

          buttonClass
          )}
          title='管理'
          aria-label='管理'>

          <Icon name='settings' size={buttonSize === 'md' ? 18 : 16} />
        </button>

        {open &&
        <div
          role='menu'
          className={cn(cx(styles.r_da4dbfbc, styles.r_5e8a03e0, styles.r_181b2866, styles.r_f46b61a9), menuAlignClass)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}>

            <div className={cx(styles.r_d89972fe, styles.r_2f935d2e, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_660d2eff, styles.r_a739868a)}>
              <div
              className={cn(cx(styles.r_da4dbfbc, styles.r_b770696a, styles.r_6a60c09e, styles.r_9cea0567, styles.r_c74901da, styles.r_dd8ce13a, styles.r_d4f78465, styles.r_b950dda2, styles.r_88b684d2, styles.r_5e10cdb8),

              arrowClass
              )} />


              {permissions.canEdit &&
            <MenuItem onClick={handleEdit}>编辑</MenuItem>
            }

              {permissions.canMove &&
            <MenuItem onClick={handleMove}>移帖</MenuItem>
            }

              {permissions.canPin &&
            <MenuItem onClick={handlePinManage}>置顶管理</MenuItem>
            }

              {permissions.canLock &&
            <MenuItem onClick={handleLockManage}>
                  {post.locked ? '解锁' : '锁定'}
                </MenuItem>
            }

              {permissions.canBan &&
            <MenuItem onClick={handleBanUser}>封禁用户</MenuItem>
            }

              {permissions.canDelete && <div className={cx(styles.r_7bd3b5ea, styles.r_b950dda2, styles.r_5ff6a729)} />}

              {permissions.canDelete &&
            <MenuItem danger onClick={handleDelete}>删除</MenuItem>
            }
            </div>
          </div>
        }
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
        onConfirm={confirmMove} />


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
        onConfirm={confirmLock} />


      <Dialog
        open={false}
        onClose={() => {
          if (!moveSubmitting) setMoveOpen(false);
        }}
        title='移帖'
        maxWidth='lg'
        actions={
        <div className={cx(styles.r_fb56d9cf, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
            <button
            type='button'
            onClick={() => setMoveOpen(false)}
            disabled={moveSubmitting}
            className={cx(styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_ceb69a6b, styles.r_5399e21f, styles.r_5f533b3a, styles.r_d463b664)}>

              取消
            </button>
            <button
            type='button'
            onClick={confirmMove}
            disabled={moveSubmitting || !moveSelection.categorySlug && !moveSelection.genusSlug && !moveSelection.speciesSlug}
            className={cx(styles.r_421ac2be, styles.r_6bceb016, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_2689f395, styles.r_72a4c7cd, styles.r_ceb69a6b, styles.r_e269e58c, styles.r_5f533b3a, styles.r_d463b664)}>

              {moveSubmitting ? '移动中...' : '确认移帖'}
            </button>
          </div>
        }>

        <div className={styles.r_3e7ce58d}>
          <div className={cx(styles.r_6f7e013d, styles.r_421ac2be, styles.r_a8a62ca4, styles.r_eb6e8b88, styles.r_fc7473ca)}>
            <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
              <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>发帖人：</span>
              <a
                href={`/user/${post.author.id}`}
                target='_blank'
                rel='noreferrer'
                className={cx(styles.r_7e0b7cdf, styles.r_2689f395, styles.r_5f6a59f1, styles.r_81be6435, styles.r_f673f4a7)}>

                {post.author.name}
              </a>
            </div>
            <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
              <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>帖子标题：</span>
              <span className={cx(styles.r_7e0b7cdf, styles.r_170cee3f, styles.r_2689f395, styles.r_399e11a5)}>{post.title}</span>
            </div>
            <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
              <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>帖子 ID：</span>
              <a
                href={`/post/${post.id}`}
                target='_blank'
                rel='noreferrer'
                className={cx(styles.r_7e0b7cdf, styles.r_451f34ab, styles.r_0e65706b, styles.r_359090c2, styles.r_5f6a59f1, styles.r_81be6435, styles.r_f673f4a7)}>

                {post.id}
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
            value={moveSelection}
            onChange={setMoveSelection}
            placeholder='搜索并选择目标板块' />

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
        onToggle={togglePin} />


      <Dialog
        open={false}
        onClose={() => {
          if (!pinSubmittingKey) setPinOpen(false);
        }}
        title='置顶管理'
        maxWidth='lg'>

        <div className={styles.r_3e7ce58d}>
          <div className={cx(styles.r_6f7e013d, styles.r_421ac2be, styles.r_a8a62ca4, styles.r_eb6e8b88, styles.r_fc7473ca)}>
            <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
              <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>发帖人：</span>
              <a
                href={`/user/${post.author.id}`}
                target='_blank'
                rel='noreferrer'
                className={cx(styles.r_7e0b7cdf, styles.r_2689f395, styles.r_5f6a59f1, styles.r_81be6435, styles.r_f673f4a7)}>

                {post.author.name}
              </a>
            </div>
            <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
              <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>帖子标题：</span>
              <span className={cx(styles.r_7e0b7cdf, styles.r_170cee3f, styles.r_2689f395, styles.r_399e11a5)}>{post.title}</span>
            </div>
            <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
              <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>帖子 ID：</span>
              <a
                href={`/post/${post.id}`}
                target='_blank'
                rel='noreferrer'
                className={cx(styles.r_7e0b7cdf, styles.r_451f34ab, styles.r_0e65706b, styles.r_359090c2, styles.r_5f6a59f1, styles.r_81be6435, styles.r_f673f4a7)}>

                {post.id}
              </a>
            </div>
          </div>

          <div className={styles.r_6f7e013d}>
            {pinTargets.map((target) => {
              const pinned = isPinned(post, target);
              const loading = pinSubmittingKey === target.key;
              return (
                <div
                  key={target.key}
                  className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3, styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0e17f2bd, styles.r_03b4dd7f)}>

                  <div className={styles.r_7e0b7cdf}>
                    <div className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{target.label}</div>
                    <div className={cx(styles.r_15e1b1f4, styles.r_359090c2, styles.r_7b89cd85)}>{target.description}</div>
                  </div>
                  <button
                    type='button'
                    onClick={() => togglePin(target)}
                    disabled={Boolean(pinSubmittingKey)}
                    className={cn(cx(styles.r_012fbd12, styles.r_421ac2be, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_2689f395, styles.r_ceb69a6b, styles.r_5f533b3a, styles.r_d463b664),

                    pinned ? cx(styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_5e10cdb8, styles.r_eb6abb1f, styles.r_5399e21f) : cx(styles.r_6bceb016, styles.r_72a4c7cd, styles.r_e269e58c)


                    )}>

                    {loading ? '处理中...' : pinned ? '取消置顶' : '置顶'}
                  </button>
                </div>);

            })}
          </div>
        </div>
      </Dialog>
    </>);

}

function getInitialBoardSelection(post: Post): BoardSelection {
  const path = post.board.path ?? [];
  return {
    categorySlug:
    path.find((item) => item.level === 'category')?.slug ?? (
    post.board.level === 'category' ? post.board.slug : ''),
    genusSlug:
    path.find((item) => item.level === 'genus')?.slug ?? (
    post.board.level === 'genus' ? post.board.slug : ''),
    speciesSlug:
    path.find((item) => item.level === 'species')?.slug ?? (
    post.board.level === 'species' ? post.board.slug : ''),
    label: formatCurrentBoardLabel(post)
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
      key: "global:",
      scope: 'global',
      targetId: '',
      label: '全局置顶',
      description: '只在首页/全站推荐类列表中优先展示。'
    });
  }

  targets.push({
    key: `${boardScope}:${post.board.id}`,
    scope: boardScope,
    targetId: post.board.id,
    label: `${levelLabel(post.board.level)}置顶`,
    description: `只在 ${formatCurrentBoardLabel(post)} 范围内置顶。`
  });

  for (const tag of post.tags.slice(0, 10)) {
    targets.push({
      key: `topic:${tag}`,
      scope: 'topic',
      targetId: tag,
      label: `话题置顶：#${tag}`,
      description: `只在 #${tag} 话题页内置顶。`
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
  onClick




}: {children: React.ReactNode;danger?: boolean;onClick: () => void;}) {
  return (
    <button
      type='button'
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={cn(cx(styles.r_0214b4b3, styles.r_6da6a3c3, styles.r_e82ae8be, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_ca6bf630, styles.r_359090c2, styles.r_5756b7b4),

      danger ? cx(styles.r_595fceba, styles.r_85cfcc24) : styles.r_eb6abb1f
      )}>

      {children}
    </button>);

}
