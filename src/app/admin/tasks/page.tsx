import { prisma } from '@/lib/db';
import { TaskRow } from './TaskRow';

export const dynamic = 'force-dynamic';

export default async function AdminTasksPage() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ kind: 'asc' }, { orderIdx: 'asc' }],
  });
  const grouped: Record<string, typeof tasks> = {};
  for (const t of tasks) {
    (grouped[t.kind] ??= []).push(t);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">🎯 任务配置</h1>
        <p className="mt-1 text-xs text-ink-600">
          编辑奖励与目标 · 停用的任务不在前台显示
        </p>
      </div>

      {(['daily', 'monthly', 'achievement'] as const).map((kind) => {
        const list = grouped[kind] ?? [];
        if (list.length === 0) return null;
        const label = kind === 'daily' ? '每日' : kind === 'monthly' ? '月度' : '成就';
        return (
          <section key={kind}>
            <h2 className="mb-2 text-sm font-semibold text-ink-700">
              {label} <span className="text-[11px] font-normal text-ink-500">({list.length})</span>
            </h2>
            <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-ink-50 text-ink-600">
                  <tr>
                    <th className="px-3 py-2 text-left w-16">状态</th>
                    <th className="px-3 py-2 text-left">标题</th>
                    <th className="px-3 py-2 text-left">触发事件</th>
                    <th className="px-3 py-2 text-right">目标</th>
                    <th className="px-3 py-2 text-right">积分</th>
                    <th className="px-3 py-2 text-right">EXP</th>
                    <th className="px-3 py-2 text-right">活跃度</th>
                    <th className="px-3 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => <TaskRow key={t.id} task={t} />)}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {tasks.length === 0 && (
        <div className="rounded-xl border border-ink-100 bg-white p-10 text-center text-sm text-ink-500">
          还没有任务(请先在 Prisma Studio / seed 脚本创建)
        </div>
      )}
    </div>
  );
}
