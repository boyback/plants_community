import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getLevelExpConfigs } from '@/lib/permissions';
import { LevelExpManager } from './LevelExpManager';

export const dynamic = 'force-dynamic';

export default async function AdminPointsPage() {
  const me = await getCurrentUser();
  if (!me?.isSuperAdmin) {
    redirect('/');
  }

  const levelConfigs = await getLevelExpConfigs();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink-800">积分调整</h1>
        <p className="mt-1 text-sm text-ink-600">
          管理经验等级阈值，并说明积分余额与经验值的用途边界。
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <div className="text-sm font-semibold text-ink-800">积分余额</div>
          <p className="mt-1 text-xs text-ink-500">
            用户可消费的余额，用于兑换皮肤、会员或交易相关抵扣。单个用户加减积分在“用户权限”列表的“积分”按钮里操作。
          </p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <div className="text-sm font-semibold text-ink-800">经验 EXP</div>
          <p className="mt-1 text-xs text-ink-500">
            用户成长等级依据。签到、发帖、任务奖励等会增加经验，达到下方阈值后升级。
          </p>
        </div>
        <div className="rounded-xl border border-ink-100 bg-white p-4">
          <div className="text-sm font-semibold text-ink-800">功能权限</div>
          <p className="mt-1 text-xs text-ink-500">
            等级解锁哪些功能在“权限管理”里配置；这里配置的是升到某一级需要多少经验。
          </p>
        </div>
      </div>

      <LevelExpManager rows={levelConfigs} />
    </div>
  );
}
