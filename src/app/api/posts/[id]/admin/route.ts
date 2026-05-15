import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function extractId(url: string): string {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  // /api/posts/[id]/admin → id is at index 2
  return parts[2] || '';
}

// 检查用户对帖子的权限
async function checkPermission(userId: string, postId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isSuperAdmin: true },
  });
  if (!user) return null;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { 
      id: true, 
      authorId: true, 
      categoryId: true, 
      genusId: true,
      speciesId: true,
      boardId: true,
    },
  });
  if (!post) return null;

  const isAuthor = user.id === post.authorId;
  const isSuperAdmin = user.isSuperAdmin;
  const isModerator = user.role === 'moderator';
  const isAdmin = user.role === 'admin';

  // TODO: 板块管理员需要验证板块归属
  // 当前版本：moderator/admin 对所有板块有权限
  // 未来版本：需要在 User 表添加 managedBoards 关系，验证用户是否管理该板块
  // const isBoardModerator = isModerator && await checkUserManagesBoard(userId, post.categoryId || post.genusId || post.speciesId);

  return { user, post, isAuthor, isSuperAdmin, isModerator, isAdmin };
}

// POST /api/posts/[id]/admin
// action: pin | unpin | lock | unlock | move | ban_user | review
export const POST = handler(async (req) => {
  const me = await requireUser();
  const postId = extractId(req.url);
  const body = await req.json();
  const action = body.action as string;

  const perm = await checkPermission(me.id, postId);
  if (!perm) return fail(404, '帖子不存在');

  const { user, post, isAuthor, isSuperAdmin, isModerator, isAdmin } = perm;

  // 权限检查
  switch (action) {
    case 'pin':
    case 'unpin': {
      // 板块管理员 + 超管可置顶
      if (!isModerator && !isAdmin && !isSuperAdmin) {
        return fail(403, '没有权限');
      }
      break;
    }
    case 'lock':
    case 'unlock': {
      // 板块管理员 + 超管可锁定
      if (!isModerator && !isAdmin && !isSuperAdmin) {
        return fail(403, '没有权限');
      }
      break;
    }
    case 'move': {
      // 板块管理员 + 超管可移贴
      if (!isModerator && !isAdmin && !isSuperAdmin) {
        return fail(403, '没有权限');
      }
      break;
    }
    case 'delete': {
      // 作者本人 + 管理员可删除
      if (!isAuthor && !isModerator && !isAdmin && !isSuperAdmin) {
        return fail(403, '没有权限');
      }
      break;
    }
    case 'ban_user': {
      // 仅超管可封禁用户
      if (!isSuperAdmin) {
        return fail(403, '没有权限');
      }
      break;
    }
    case 'review': {
      // 仅超管可审核
      if (!isSuperAdmin) {
        return fail(403, '没有权限');
      }
      break;
    }
    default:
      return fail(400, '未知操作');
  }

  // 执行操作
  switch (action) {
    case 'pin': {
      await prisma.post.update({
        where: { id: postId },
        data: { pinned: true, pinnedAt: new Date(), pinnedBy: me.id },
      });
      return { ok: true, action: 'pinned' };
    }
    case 'unpin': {
      await prisma.post.update({
        where: { id: postId },
        data: { pinned: false, pinnedAt: null, pinnedBy: null },
      });
      return { ok: true, action: 'unpinned' };
    }
    case 'lock': {
      await prisma.post.update({
        where: { id: postId },
        data: { locked: true, lockedAt: new Date(), lockedBy: me.id },
      });
      return { ok: true, action: 'locked' };
    }
    case 'unlock': {
      await prisma.post.update({
        where: { id: postId },
        data: { locked: false, lockedAt: null, lockedBy: null },
      });
      return { ok: true, action: 'unlocked' };
    }
    case 'move': {
      const targetCategoryId = body.categoryId as string | undefined;
      const targetGenusId = body.genusId as string | undefined;
      const targetSpeciesId = body.speciesId as string | undefined;
      
      // 至少需要指定一个板块
      if (!targetCategoryId && !targetGenusId && !targetSpeciesId) {
        return fail(400, '请选择目标板块');
      }
      
      // 根据优先级设置板块：species > genus > category
      const updateData: any = {};
      if (targetSpeciesId) {
        updateData.speciesId = targetSpeciesId;
        updateData.genusId = null;
        updateData.categoryId = null;
        updateData.boardId = null;
      } else if (targetGenusId) {
        updateData.genusId = targetGenusId;
        updateData.speciesId = null;
        updateData.categoryId = null;
        updateData.boardId = null;
      } else if (targetCategoryId) {
        updateData.categoryId = targetCategoryId;
        updateData.genusId = null;
        updateData.speciesId = null;
        updateData.boardId = null;
      }
      
      await prisma.post.update({
        where: { id: postId },
        data: updateData,
      });
      return { ok: true, action: 'moved' };
    }
    case 'delete': {
      await prisma.post.update({
        where: { id: postId },
        data: {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: me.id,
          deleteReason: body.reason || '管理员删除',
        },
      });
      return { ok: true, action: 'deleted' };
    }
    case 'ban_user': {
      const userId = body.userId as string;
      const duration = body.duration as number; // 天数
      const reason = body.reason as string;
      if (!userId) return fail(400, '用户ID必填');

      const banUntil = new Date();
      banUntil.setDate(banUntil.getDate() + (duration || 7));

      await prisma.user.update({
        where: { id: userId },
        data: {
          bannedUntil: banUntil,
          banReason: reason || '违规',
        },
      });
      return { ok: true, action: 'banned', bannedUntil: banUntil };
    }
    case 'review': {
      const status = body.status as 'published' | 'rejected';
      const reason = body.reason as string;
      await prisma.post.update({
        where: { id: postId },
        data: {
          reviewStatus: status,
          reviewReason: reason,
          reviewedAt: new Date(),
          reviewedBy: me.id,
        },
      });
      return { ok: true, action: 'reviewed', status };
    }
    default:
      return fail(400, '未知操作');
  }
});
