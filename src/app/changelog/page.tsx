/**
 * 开发者日志 /changelog
 *
 * 复用 Announcement 表的「已启用 + 当前生效」公告作为更新条目。
 * 时间倒序展示。
 */
import type { Metadata } from 'next';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '开发者日志 · 肉友社',
  description: '肉友社的产品迭代、版本更新、社区公告',
};

const LEVEL_STYLE: Record<string, { dot: string; tag: string; label: string }> = {
  info: {
    dot: 'bg-blue-400',
    tag: 'bg-blue-50 text-blue-700',
    label: '更新',
  },
  warning: {
    dot: 'bg-amber-400',
    tag: 'bg-amber-50 text-amber-700',
    label: '注意',
  },
  important: {
    dot: 'bg-rose-500',
    tag: 'bg-rose-50 text-rose-700',
    label: '重要',
  },
};

export default async function ChangelogPage() {
  const now = new Date();
  const items = await prisma.announcement.findMany({
    where: {
      enabled: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gt: now } }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      title: true,
      content: true,
      level: true,
      createdAt: true,
    },
  });

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-800">📓 开发者日志</h1>
        <p className="mt-1 text-sm text-leaf-700/70">
          肉友社的产品迭代、版本更新与社区公告
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center text-sm text-leaf-700/60">
          还没有任何更新
        </div>
      ) : (
        <ol className="card overflow-hidden">
          {items.map((a, i) => {
            const style = LEVEL_STYLE[a.level] ?? LEVEL_STYLE.info;
            return (
              <li
                key={a.id}
                className={cn(
                  'group relative flex gap-4 px-5 py-4',
                  i !== items.length - 1 && 'border-b border-leaf-100/60',
                )}
              >
                {/* 时间线圆点 */}
                <div className="flex flex-col items-center pt-1">
                  <span className={cn('h-2 w-2 rounded-full', style.dot)} />
                  {i !== items.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-leaf-100/60" />
                  )}
                </div>

                <div className="flex-1 pb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-medium',
                        style.tag,
                      )}
                    >
                      {style.label}
                    </span>
                    <h2 className="text-sm font-semibold text-ink-800">{a.title}</h2>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink-700/80">
                    {a.content}
                  </p>
                  <div className="mt-2 text-[11px] text-leaf-700/50">
                    {fmtDate(a.createdAt)}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Shell>
  );
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
