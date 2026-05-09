/**
 * 品种现场照集合接口:
 *   GET  /api/species/:id/photos      列出 approved(管理员可看 ?status=pending|rejected)
 *   POST /api/species/:id/photos      上传(权限受 SiteConfig 控制)
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { getCurrentUser, requireUser, isVipActive } from '@/lib/auth';
import { getSiteConfig, canUploadSpeciesPhoto } from '@/lib/site-config';
import type { SpeciesPhoto } from '@/lib/types';

export const dynamic = 'force-dynamic';

function pickSpeciesId(req: Request) {
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  // /api/species/<id>/photos
  return segs[segs.length - 2]!;
}

function fmt(
  p: any,
  myId: string | null,
  votedSet: Set<string>
): SpeciesPhoto {
  return {
    id: p.id,
    speciesId: p.speciesId,
    url: p.url,
    caption: p.caption ?? undefined,
    status: p.status,
    votes: p.votes,
    pinned: p.pinned,
    myVoted: myId ? votedSet.has(p.id) : false,
    uploader: {
      id: p.uploader.id,
      name: p.uploader.name,
      avatar: p.uploader.avatar,
      level: p.uploader.level,
    },
    createdAt: p.createdAt.toISOString(),
    rejectReason: p.rejectReason ?? undefined,
  };
}

export const GET = handler(async (req) => {
  const speciesId = pickSpeciesId(req);
  const me = await getCurrentUser();

  // 默认仅 approved;管理员/作者本人看自己上传可以放宽
  const list = await prisma.speciesPhoto.findMany({
    where: { speciesId, status: 'approved' },
    orderBy: [
      { pinned: 'desc' },
      { votes: 'desc' },
      { createdAt: 'desc' },
    ],
    include: { uploader: true },
    take: 60,
  });

  let votedSet = new Set<string>();
  if (me && list.length > 0) {
    const my = await prisma.speciesPhotoVote.findMany({
      where: { userId: me.id, photoId: { in: list.map((p) => p.id) } },
      select: { photoId: true },
    });
    votedSet = new Set(my.map((v) => v.photoId));
  }

  const cfg = await getSiteConfig();
  const canUpload = me
    ? canUploadSpeciesPhoto(
        { level: me.level, isVip: isVipActive(me) },
        cfg
      )
    : { ok: false as const, reason: '请先登录' };

  return {
    items: list.map((p) => fmt(p, me?.id ?? null, votedSet)),
    canUpload: canUpload.ok,
    uploadReason: canUpload.ok ? null : canUpload.reason,
    moderation: cfg.photoModeration,
  };
});

const UploadBody = z.object({
  url: z.string().min(1).max(1000),
  caption: z.string().max(200).optional(),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const speciesId = pickSpeciesId(req);

  const cfg = await getSiteConfig();
  const can = canUploadSpeciesPhoto(
    { level: me.level, isVip: isVipActive(me) },
    cfg
  );
  if (!can.ok) return fail(403, can.reason);

  const sp = await prisma.species.findUnique({ where: { id: speciesId } });
  if (!sp) return fail(404, '品种不存在');

  const body = UploadBody.parse(await req.json());

  const status = cfg.photoModeration === 'auto' ? 'approved' : 'pending';
  const photo = await prisma.speciesPhoto.create({
    data: {
      speciesId,
      uploaderId: me.id,
      url: body.url,
      caption: body.caption ?? null,
      status,
    },
    include: { uploader: true },
  });

  return {
    photo: fmt(photo, me.id, new Set()),
    needReview: status === 'pending',
  };
});
