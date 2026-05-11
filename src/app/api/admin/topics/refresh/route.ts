/**
 * POST /api/admin/topics/refresh
 *
 * 管理员手动触发话题排行榜全量聚合。
 */
import { handler } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { logAdmin } from '@/lib/admin-log';
import { refreshTopicRankings } from '@/lib/topic-aggregate';

export const dynamic = 'force-dynamic';

export const POST = handler(async () => {
  const me = await requireAdmin();
  const count = await refreshTopicRankings();
  await logAdmin({
    actorId: me.id,
    action: 'topics.refresh',
    targetType: 'topic_ranking',
    meta: { count },
  });
  return { count };
});
