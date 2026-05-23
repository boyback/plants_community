import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializePost } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';

export const dynamic = 'force-dynamic';

type PinScope = 'global' | 'board' | 'genus' | 'species' | 'topic';

const PIN_SCOPES = new Set(['global', 'board', 'genus', 'species', 'topic']);

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
      boardId: true,
      genusId: true,
      speciesId: true,
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
  // const isBoardModerator = isModerator && await checkUserManagesBoard(userId, post.boardId || post.genusId || post.speciesId);

  return { user, post, isAuthor, isSuperAdmin, isModerator, isAdmin };
}

async function loadSerializedPost(postId: string, viewer: { id: string; role?: 'user' | 'moderator' | 'admin' | null; isSuperAdmin?: boolean | null }) {
  const fresh = await prisma.post.findUnique({
    where: { id: postId },
    include: postInclude(),
  });
  if (!fresh) return null;
  return serializePost(fresh as any, undefined, undefined, viewer);
}

function parsePinTarget(body: any): { scope: PinScope; targetId: string } | null {
  const scope = String(body.scope ?? '');
  if (!PIN_SCOPES.has(scope)) return null;
  const targetId = scope === 'global' ? '' : String(body.targetId ?? '').trim();
  if (scope !== 'global' && !targetId) return null;
  return { scope: scope as PinScope, targetId };
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
      const target = parsePinTarget(body);
      if (!target) return fail(400, '请选择置顶范围');
      if (target.scope === 'global' && !isSuperAdmin) return fail(403, '只有超级管理员可以全局置顶');
      await prisma.postPin.upsert({
        where: {
          postId_scope_targetId: {
            postId,
            scope: target.scope,
            targetId: target.targetId,
          },
        },
        create: {
          postId,
          scope: target.scope,
          targetId: target.targetId,
          pinnedBy: me.id,
        },
        update: {
          pinnedAt: new Date(),
          pinnedBy: me.id,
        },
      });
      const updated = await loadSerializedPost(postId, me);
      if (!updated) return fail(404, '帖子不存在');
      return updated;
    }
    case 'unpin': {
      const target = parsePinTarget(body);
      if (!target) return fail(400, '请选择取消置顶范围');
      if (target.scope === 'global' && !isSuperAdmin) return fail(403, '只有超级管理员可以取消全局置顶');
      await prisma.postPin.deleteMany({
        where: {
          postId,
          scope: target.scope,
          targetId: target.targetId,
        },
      });
      const updated = await loadSerializedPost(postId, me);
      if (!updated) return fail(404, '帖子不存在');
      return updated;
    }
    case 'lock': {
      await prisma.post.update({
        where: { id: postId },
        data: { locked: true, lockedAt: new Date(), lockedBy: me.id },
      });
      const updated = await loadSerializedPost(postId, me);
      if (!updated) return fail(404, '帖子不存在');
      return updated;
    }
    case 'unlock': {
      await prisma.post.update({
        where: { id: postId },
        data: { locked: false, lockedAt: null, lockedBy: null },
      });
      const updated = await loadSerializedPost(postId, me);
      if (!updated) return fail(404, '帖子不存在');
      return updated;
    }
    case 'move': {
      const targetCategoryId = body.boardId as string | undefined;
      const targetGenusId = body.genusId as string | undefined;
      const targetSpeciesId = body.speciesId as string | undefined;
      const targetCategorySlug = body.categorySlug as string | undefined;
      const targetGenusSlug = body.genusSlug as string | undefined;
      const targetSpeciesSlug = body.speciesSlug as string | undefined;

      // 至少需要指定一个板块
      if (
        !targetCategoryId &&
        !targetGenusId &&
        !targetSpeciesId &&
        !targetCategorySlug &&
        !targetGenusSlug &&
        !targetSpeciesSlug
      ) {
        return fail(400, '请选择目标板块');
      }

      const updateData: { boardId: string | null; genusId: string | null; speciesId: string | null } = {
        boardId: null,
        genusId: null,
        speciesId: null,
      };

      if (targetSpeciesSlug || targetSpeciesId) {
        const species = await prisma.species.findFirst({
          where: targetSpeciesSlug ? { slug: targetSpeciesSlug } : { id: targetSpeciesId },
          include: { genus: true },
        });
        if (!species) return fail(400, '指定的品种不存在');
        updateData.boardId = species.genus.boardId;
        updateData.genusId = species.genusId;
        updateData.speciesId = species.id;
      } else if (targetGenusSlug || targetGenusId) {
        const genus = await prisma.genus.findFirst({
          where: targetGenusSlug ? { slug: targetGenusSlug } : { id: targetGenusId },
        });
        if (!genus) return fail(400, '指定的属不存在');
        updateData.boardId = genus.boardId;
        updateData.genusId = genus.id;
      } else if (targetCategorySlug || targetCategoryId) {
        const board = await prisma.board.findFirst({
          where: targetCategorySlug ? { slug: targetCategorySlug } : { id: targetCategoryId },
        });
        if (!board) return fail(400, '指定的板块不存在');
        updateData.boardId = board.id;
      }

      await prisma.post.update({
        where: { id: postId },
        data: updateData,
      });
      const updated = await loadSerializedPost(postId, me);
      if (!updated) return fail(404, '帖子不存在');
      return updated;
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
      return { deletedId: postId };
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
