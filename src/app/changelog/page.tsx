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
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: '更新日志 · 植友圈',
  description: '植友圈最近上线了哪些新功能、修复了什么、有什么活动'
};

const LEVEL_STYLE: Record<string, {dot: string;tag: string;label: string;}> = {
  info: { dot: styles.r_c77bbf4a, tag: cx(styles.r_3cc00fe7, styles.r_65b7dd19), label: '更新' },
  warning: { dot: styles.r_a5a0d879, tag: cx(styles.r_67d2289d, styles.r_85d79ebf), label: '注意' },
  important: { dot: styles.r_45a732a4, tag: cx(styles.r_0759a0f1, styles.r_b54428d1), label: '重要' }
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
  id: "v1-2026-05b",
  title: '话题页上线 · 意见反馈页',
  content:
  '点击帖子标签或首页热门话题,会进入新的话题页,集中查看相关帖子。\n新增「意见反馈」入口(Footer 可见),提交后管理员会在私信里回复。',
  level: 'info',
  date: new Date("2026-05-11")
},
{
  id: "v1-2026-05",
  title: '首页改版 · 新增「快速发现」',
  content:
  '首页右栏新增「热门话题」+「板块」入口,可一键换一换。\n顶部 Banner 全部替换为高清新图。',
  level: 'info',
  date: new Date("2026-05-10")
},
{
  id: "v1-2026-04",
  title: '邮箱注册登录上线',
  content:
  "现在可以用邮箱+验证码完成注册了。流程改为两步:第一步验证邮箱,第二步设置用户名和密码。 手机短信注册暂时关闭,微信登录正在等审核。",
  level: 'info',
  date: new Date("2026-04-22")
},
{
  id: "v1-2026-03",
  title: '交易市场 · 拍卖与求购合并',
  content:
  "商品和拍卖统一在「交易市场」里展示,拍卖卡片左上角有 🔨 标识、右上角有倒计时。 顶部新增筛选:类目 / 属 / 价格区间 / 排序,支持 4 列或 5 列切换。",
  level: 'info',
  date: new Date("2026-03-15")
},
{
  id: "v1-2026-02",
  title: '板块导航折叠化',
  content:
  '左侧菜单改成可展开的「科 → 属」两级树,点击属直接进入板块,不再有中间的科页。',
  level: 'info',
  date: new Date("2026-02-28")
},
{
  id: "v1-2026-01",
  title: '社区上线 🎉',
  content: "植友圈正式开放注册,欢迎来分享你的多肉日常!",
  level: 'important',
  date: new Date("2026-01-01")
}];


export default async function ChangelogPage() {
  const now = new Date();

  let dbItems: Entry[] = [];
  try {
    const rows = await prisma.announcement.findMany({
      where: {
        enabled: true,
        AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gt: now } }] }]

      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, title: true, content: true, level: true, createdAt: true }
    });
    dbItems = rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      level: r.level,
      date: r.createdAt
    }));
  } catch {










    // Announcement 表不存在或 DB 异常 — 仅用内置
  }const items: Entry[] = [...dbItems, ...BUILTIN_ENTRIES].sort((a, b) => b.date.getTime() - a.date.getTime());return <Shell>
      <div className={styles.r_b6777c6d}>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)}>📓 更新日志</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_69335b95)}>
          看看我们最近上线了哪些新功能、修了什么 bug、办了什么活动
        </p>
      </div>

      <ol className={styles.r_2cd02d11}>
        {items.map((a, i) => {const style = LEVEL_STYLE[a.level] ?? LEVEL_STYLE.info;return <li
            key={a.id}
            className={cn(cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_60fbb771, styles.r_0c3bc985, styles.r_d139dd09, styles.r_cb11fec3),

            i !== items.length - 1 && cx(styles.r_65fdbade, styles.r_38748e06)
            )}>

              <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_6b7d6e21)}>
                <span className={cn(cx(styles.r_2f2a842e, styles.r_940924b6, styles.r_ac204c10), style.dot)} />
                {i !== items.length - 1 &&
              <span className={cx(styles.r_b6b02c0e, styles.r_47a69140, styles.r_36e579c0, styles.r_e9128c9d)} />
              }
              </div>

              <div className={cx(styles.r_36e579c0, styles.r_569eb162)}>
                <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                  <span
                  className={cn(cx(styles.r_07389a77, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395),

                  style.tag
                  )}>

                    {style.label}
                  </span>
                  <h2 className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{a.title}</h2>
                </div>
                <p className={cx(styles.r_aac62f0e, styles.r_a2edcb1a, styles.r_fc7473ca, styles.r_18550d59, styles.r_b85c981b)}>
                  {a.content}
                </p>
                <div className={cx(styles.r_50d0d216, styles.r_d058ca6d, styles.r_3353f144)}>{fmtDate(a.date)}</div>
              </div>
            </li>;

        })}
      </ol>
    </Shell>;

}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}