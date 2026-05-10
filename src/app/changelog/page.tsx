/**
 * 开发者日志 /changelog
 *
 * 给用户看的「我们最近做了啥」时间线。
 *
 * 数据源:
 *   - 内置 BUILTIN_ENTRIES(版本更新里程碑,手工维护)
 *   - DB Announcement 表(enabled + 当前生效),按 createdAt 倒序合并
 */
import type { Metadata } from 'next';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '更新日志 · 肉友社',
  description: '肉友社最近上线了哪些新功能、修复了什么、有什么活动',
};

const LEVEL_STYLE: Record<string, { dot: string; tag: string; label: string }> = {
  info: { dot: 'bg-blue-400', tag: 'bg-blue-50 text-blue-700', label: '更新' },
  warning: { dot: 'bg-amber-400', tag: 'bg-amber-50 text-amber-700', label: '注意' },
  important: { dot: 'bg-rose-500', tag: 'bg-rose-50 text-rose-700', label: '重要' },
};

type Entry = {
  id: string;
  title: string;
  content: string;
  level: string;
  date: Date;
};

/**
 * 内置版本更新条目(用户视角,纯产品语言,不写技术内幕)
 * 添加新条目:在数组开头插入,日期写真实上线日。
 */
const BUILTIN_ENTRIES: Entry[] = [
  {
    id: 'v1-2026-05',
    title: '首页改版 · 新增「快速发现」',
    content:
      '首页右栏整合「热门品种 / 板块 / 养护话题」3 个发现入口,可一键换一换。\n顶部 Banner 全部替换为高清新图。',
    level: 'info',
    date: new Date('2026-05-10'),
  },
  {
    id: 'v1-2026-04',
    title: '邮箱注册登录上线',
    content:
      '现在可以用邮箱+验证码完成注册了。流程改为两步:第一步验证邮箱,第二步设置用户名和密码。\n手机短信注册暂时关闭,微信登录正在等审核。',
    level: 'info',
    date: new Date('2026-04-22'),
  },
  {
    id: 'v1-2026-03',
    title: '交易市场 · 拍卖与求购合并',
    content:
      '商品和拍卖统一在「交易市场」里展示,拍卖卡片左上角有 🔨 标识、右上角有倒计时。\n顶部新增筛选:类目 / 属 / 价格区间 / 排序,支持 4 列或 5 列切换。',
    level: 'info',
    date: new Date('2026-03-15'),
  },
  {
    id: 'v1-2026-02',
    title: '板块导航折叠化',
    content:
      '左侧菜单改成可展开的「科 → 属」两级树,点击属直接进入板块,不再有中间的科页。',
    level: 'info',
    date: new Date('2026-02-28'),
  },
  {
    id: 'v1-2026-01',
    title: '社区上线 🎉',
    content: '肉友社正式开放注册,欢迎来分享你的多肉日常!',
    level: 'important',
    date: new Date('2026-01-01'),
  },
];

export default async function ChangelogPage() {
  const now = new Date();

  let dbItems: Entry[] = [];
  try {
    const rows = await prisma.announcement.findMany({
      where: {
        enabled: true,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gt: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, title: true, content: true, level: true, createdAt: true },
    });
    dbItems = rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      level: r.level,
      date: r.createdAt,
    }));
  } catch {
    // Announcement 表不存在或 DB 异常 — 仅用内置
  }

  const items: Entry[] = [...dbItems, ...BUILTIN_ENTRIES].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-800">📓 更新日志</h1>
        <p className="mt-1 text-sm text-leaf-700/70">
          看看我们最近上线了哪些新功能、修了什么 bug、办了什么活动
        </p>
      </div>

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
                <div className="mt-2 text-[11px] text-leaf-700/50">{fmtDate(a.date)}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </Shell>
  );
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
