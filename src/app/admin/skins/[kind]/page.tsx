import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { SkinItemsManager, type SkinAdminConfig, type SkinAdminRow } from './SkinItemsManager';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

type AdminSkinKind = 'bubble' | 'reaction' | 'sticker';

const CONFIGS: Record<AdminSkinKind, SkinAdminConfig> = {
  bubble: {
    kind: 'bubble',
    title: '评论气泡配置',
    description: '维护 SkinItem(kind=bubble)，前台评论气泡从数据库读取。',
    createLabel: '新增气泡',
    itemLabel: '气泡',
  },
  reaction: {
    kind: 'reaction',
    title: '点赞按钮配置',
    description: '维护 SkinItem(kind=reaction)，前台点赞按钮从数据库读取。',
    createLabel: '新增点赞按钮',
    itemLabel: '点赞按钮',
  },
  sticker: {
    kind: 'sticker',
    title: '表情包配置',
    description: '维护 SkinItem(kind=sticker)，前台表情包从数据库读取。',
    createLabel: '新增表情包',
    itemLabel: '表情包',
  },
};

async function requireAdmin() {
  const me = await getCurrentUser();
  const adminUser = me as { role?: string; isSuperAdmin?: boolean } | null;
  if (adminUser?.role !== 'admin' && !adminUser?.isSuperAdmin) redirect('/');
  return me;
}

function normalizedKind(value: string): AdminSkinKind | null {
  return value === 'bubble' || value === 'reaction' || value === 'sticker' ? value : null;
}

async function loadSkinRows(kind: AdminSkinKind): Promise<SkinAdminRow[]> {
  const rows = await prisma.skinItem.findMany({
    where: { kind },
    include: {
      _count: { select: { owners: true } },
    },
    orderBy: [{ orderIdx: 'asc' }, { createdAt: 'desc' }],
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    kind: row.kind as AdminSkinKind,
    name: row.name,
    preview: row.preview,
    description: row.description,
    pricePoints: row.pricePoints,
    rarity: row.rarity as SkinAdminRow['rarity'],
    enabled: row.enabled,
    orderIdx: row.orderIdx,
    meta: row.meta,
    ownerCount: row._count.owners,
    createdAt: row.createdAt.toISOString(),
  }));
}

export default async function AdminSkinKindPage({ params }: { params: { kind: string } }) {
  await requireAdmin();
  const kind = normalizedKind(params.kind);
  if (!kind) notFound();

  const rows = await loadSkinRows(kind);

  return (
    <div className={styles.page}>
      <SkinItemsManager
        config={CONFIGS[kind]}
        rows={rows}
      />
    </div>
  );
}
