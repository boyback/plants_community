import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { parseJsonArray } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PlantArchiveClient, type PlantArchiveItem, type PlantArchiveStats, type PlantArchiveStatus } from './PlantArchiveClient';

export const dynamic = 'force-dynamic';

const STAGE_LABELS: Record<string, string> = {
  germinate: '发芽',
  growing: '成长',
  flowering: '开花',
  fruiting: '结果',
  withering: '枯萎',
  repot: '换盆',
  cutting: '扦插',
  summer: '度夏',
  winter: '越冬',
  pest: '病虫害',
  watering: '浇水',
  other: '其他',
};

export default async function PlantArchivesPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?redirect=/plant-archives');

  const plants = await prisma.userPlant.findMany({
    where: { ownerId: me.id },
    include: {
      species: {
        include: {
          genus: {
            include: {
              board: true,
            },
          },
        },
      },
      journal: {
        include: {
          post: {
            select: {
              id: true,
              title: true,
              cover: true,
              images: true,
              updatedAt: true,
              deleted: true,
            },
          },
          entries: {
            orderBy: [
              { entryDate: 'desc' },
              { orderIdx: 'desc' },
            ],
          },
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  const items: PlantArchiveItem[] = plants.map((plant) => {
    const journals = plant.journal && !plant.journal.post.deleted ? [plant.journal] : [];
    const entries = journals.flatMap((journal) =>
      journal.entries.map((entry) => ({ entry, journal })),
    );
    const latest = entries.sort((a, b) => {
      const byDate = b.entry.entryDate.getTime() - a.entry.entryDate.getTime();
      return byDate !== 0 ? byDate : b.entry.orderIdx - a.entry.orderIdx;
    })[0] ?? null;
    const allImages = entries.flatMap((item) => parseJsonArray(item.entry.images));
    const postImages = journals.flatMap((journal) => parseJsonArray(journal.post.images));
    const latestImages = latest ? parseJsonArray(latest.entry.images) : [];
    const cover = latestImages[0] ?? plant.cover ?? postImages[0] ?? plant.species.cover ?? null;
    const stageLabel = latest
      ? latest.entry.stage === 'other'
        ? latest.entry.stageLabel || STAGE_LABELS.other
        : STAGE_LABELS[latest.entry.stage] ?? STAGE_LABELS.other
      : '暂无记录';
    const lastUpdatedAt = latest?.entry.entryDate ?? plant.updatedAt;

    return {
      id: plant.id,
      code: plant.code,
      speciesId: plant.speciesId,
      nickname: plant.nickname,
      speciesName: plant.species.name,
      latinName: plant.species.latinName,
      familyName: plant.species.genus.board?.name ?? '未分类',
      genusName: plant.species.genus.name,
      cover,
      status: plant.status as PlantArchiveStatus,
      statusLabel: plant.currentStage === 'other'
        ? plant.currentStageLabel || STAGE_LABELS.other
        : STAGE_LABELS[plant.currentStage] ?? STAGE_LABELS.other,
      currentStage: plant.currentStage,
      currentStageLabel: plant.currentStageLabel ?? '',
      durationLabel: formatDuration(plant.acquiredAt, new Date()),
      lastUpdateLabel: formatRelativeDate(lastUpdatedAt),
      latestStageLabel: stageLabel,
      latestNote: latest?.entry.note?.trim() ?? '',
      journalCount: journals.length,
      journalPostId: journals[0]?.post.id ?? null,
      recordCount: entries.length,
      imageCount: allImages.length,
      updatedAt: lastUpdatedAt.toISOString(),
      acquiredAt: plant.acquiredAt.toISOString(),
      note: plant.note ?? '',
    };
  });

  const stats: PlantArchiveStats = {
    total: items.length,
    healthy: items.filter((item) => item.status === 'healthy').length,
    watching: items.filter((item) => item.status === 'watching').length,
    needs: items.filter((item) => item.status === 'needs_attention').length,
    dormant: items.filter((item) => item.status === 'dormant').length,
  };

  return (
    <AppShell showFloatingAi={false} className="!max-w-[1280px] pt-4">
      <PlantArchiveClient items={items} stats={stats} />
    </AppShell>
  );
}

function statusLabel(status: PlantArchiveStatus) {
  switch (status) {
    case 'healthy':
      return '健康';
    case 'watching':
      return '关注中';
    case 'needs_attention':
      return '需要关注';
    case 'dormant':
      return '休眠中';
    case 'ended':
      return '已结束';
  }
}

function formatDuration(start: Date, end: Date) {
  const days = Math.max(0, daysBetween(start, end));
  if (days < 31) return `${Math.max(days, 1)}天`;
  if (days < 365) return `${Math.max(1, Math.round(days / 30))}个月`;
  const years = Math.floor(days / 365);
  const months = Math.round((days % 365) / 30);
  return months > 0 ? `${years}年${months}个月` : `${years}年`;
}

function formatRelativeDate(date: Date) {
  const days = daysBetween(date, new Date());
  if (days <= 0) return '今天更新';
  if (days === 1) return '昨天更新';
  if (days < 30) return `${days}天前更新`;
  if (days < 365) return `${Math.round(days / 30)}个月前更新`;
  return `${Math.round(days / 365)}年前更新`;
}

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}
