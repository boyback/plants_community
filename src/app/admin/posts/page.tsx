import Link from 'next/link';
import { prisma } from '@/lib/db';
import { AdminPostPinActions } from './AdminPostPinActions';
import { cn } from '@/lib/utils';
import { REVIEW_FILTER_ENABLED } from "@/lib/feature-flags";
import { parseJsonArray } from '@/lib/api';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



export const dynamic = "force-dynamic";

type DeleteStatus = 'all' | 'deleted' | 'active';
type ReviewFilter = 'all_review' | 'pending' | 'rejected' | 'published';

const TYPE_LABEL: Record<string, string> = {
  rich: '长文',
  image: '图文',
  short: '短动态',
  vote: '投票',
  video: '视频',
  event: '活动',
  help: '求助',
  journal: '成长日记'
};

export default async function AdminPostsPage({
  searchParams








}: {searchParams: {q?: string;status?: string;type?: string;review?: string;page?: string;};}) {
  const status = searchParams.status as DeleteStatus ?? 'active';
  const type = searchParams.type ?? '';
  const review = searchParams.review as ReviewFilter ?? 'all_review';
  const q = searchParams.q ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (status === 'deleted') where.deleted = true;else
  if (status === 'active') where.deleted = false;
  if (type) where.type = type;
  if (REVIEW_FILTER_ENABLED && review !== 'all_review')
  where.reviewStatus = review;
  if (q) {
    where.OR = [
    { title: { contains: q } },
    { author: { name: { contains: q } } }];

  }

  // 各 tab 计数(忽略当前 type/q 过滤,但锁定 deleted=false 的活跃帖)
  const baseCount = { deleted: false } as const;
  const [pendingCount, rejectedCount, items, total] = await Promise.all([
  REVIEW_FILTER_ENABLED ?
  prisma.post.count({ where: { ...baseCount, reviewStatus: 'pending' } }) :
  Promise.resolve(0),
  REVIEW_FILTER_ENABLED ?
  prisma.post.count({ where: { ...baseCount, reviewStatus: 'rejected' } }) :
  Promise.resolve(0),
  prisma.post.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      type: true,
      title: true,
      tags: true,
      cover: true,
      views: true,
      deleted: true,
      locked: true,
      deleteReason: true,
      ...(REVIEW_FILTER_ENABLED && {
        reviewStatus: true,
        reviewReason: true
      }),
      createdAt: true,
      author: {
        select: { id: true, name: true, avatar: true, level: true }
      },
      board: { select: { id: true, name: true, slug: true } },
      genus: { select: { id: true, name: true, slug: true } },
      species: { select: { id: true, name: true, slug: true } },
      pins: {
        select: { id: true, scope: true, targetId: true },
        orderBy: [{ orderIdx: 'asc' }, { pinnedAt: 'desc' }]
      },
      _count: { select: { comments: true, likes: true } }
    }
  }),
  prisma.post.count({ where })]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buildTabHref = (r: ReviewFilter) => {
    const next: Record<string, string> = {};
    if (q) next.q = q;
    if (type) next.type = type;
    if (status !== 'active') next.status = status;
    next.review = r;
    // 切 tab 重置到第一页
    next.page = '1';
    const qs = new URLSearchParams(next).toString();
    return `/admin/posts?${qs}`;
  };

  return (
    <div className={styles.r_3e7ce58d}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>📝 帖子管理</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>
          共 {total} 篇 · 第 {page}/{totalPages} 页
        </p>
      </div>

      {/* 审核状态 tab */}
      <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_65fdbade, styles.r_88b684d2)}>
        {(
        [
        { key: 'all_review', label: '全部', badge: null },
        {
          key: 'pending',
          label: '🕒 待审核',
          badge: pendingCount > 0 ? pendingCount : null,
          highlight: pendingCount > 0
        },
        { key: 'published', label: '✅ 已发布', badge: null },
        {
          key: 'rejected',
          label: '🚫 已驳回',
          badge: rejectedCount > 0 ? rejectedCount : null
        }] as
        Array<{
          key: ReviewFilter;
          label: string;
          badge: number | null;
          highlight?: boolean;
        }>).
        map((t) => {
          const active = review === t.key;
          return (
            <Link
              key={t.key}
              href={buildTabHref(t.key)}
              className={cn(cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_ceb69a6b),

              active ? cx(styles.r_e83a7042, styles.r_5f6a59f1) : cx(styles.r_5fa66415, styles.r_9825203a),


              t.highlight && !active && styles.r_85d79ebf
              )}>

              {t.label}
              {t.badge !== null &&
              <span
                className={cn(cx(styles.r_ac204c10, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_e83a7042),

                t.highlight ? cx(styles.r_735dd972, styles.r_85d79ebf) : cx(styles.r_f2b23104, styles.r_5f6a59f1)


                )}>

                  {t.badge}
                </span>
              }
              {active &&
              <span className={cx(styles.r_da4dbfbc, styles.r_b6027879, styles.r_189f036c, styles.r_10db0d55, styles.r_ac204c10, styles.r_45499621)} />
              }
            </Link>);

        })}
      </div>

      {/* 过滤器 */}
      <form className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_eb6e8b88, styles.r_359090c2)}>
        <Input
          name="q"
          defaultValue={q}
          placeholder="按标题或作者搜索"
          className={cx(styles.r_74b2435a, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_1bd19725, styles.r_55d048eb)} />

        <select
          name="status"
          defaultValue={status}
          className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee)}>

          <option value="active">仅正常</option>
          <option value="deleted">仅已删</option>
          <option value="all">全部</option>
        </select>
        <select
          name="type"
          defaultValue={type}
          className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee)}>

          <option value="">全部类型</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) =>
          <option key={k} value={k}>
              {v}
            </option>
          )}
        </select>
        {/* 保持 review tab 选中 */}
        <input type="hidden" name="review" value={review} />
        <button className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_72a4c7cd)}>筛选</button>
      </form>

      {/* 表格 */}
      <div className={cx(styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
        <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
          <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
            <tr>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>标题</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>类型</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>作者</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>👁 / 💬 / ❤</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>发布时间</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>审核</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>状态</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>置顶</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) =>
            <tr
              key={p.id}
              className={cn(cx(styles.r_b950dda2, styles.r_358505cf, styles.r_d9a085ef),

              REVIEW_FILTER_ENABLED &&
              p.reviewStatus === 'pending' && styles.r_417110fb

              )}>

                <td className={cx(styles.r_d3e6c6c3, styles.r_f283ea9b, styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  <Link href={`/post/${p.id}`} target="_blank" className={styles.r_f673f4a7}>
                    {p.title}
                  </Link>
                  {p.deleted && p.deleteReason &&
                <div className={cx(styles.r_15e1b1f4, styles.r_1dc571a3, styles.r_595fceba)}>
                      删除原因:{p.deleteReason}
                    </div>
                }
                  {REVIEW_FILTER_ENABLED &&
                p.reviewStatus === 'rejected' &&
                p.reviewReason &&
                <div className={cx(styles.r_15e1b1f4, styles.r_1dc571a3, styles.r_595fceba)}>
                        驳回原因:{p.reviewReason}
                      </div>
                }
                  {REVIEW_FILTER_ENABLED &&
                p.reviewStatus === 'pending' &&
                p.reviewReason &&
                <div className={cx(styles.r_15e1b1f4, styles.r_1dc571a3, styles.r_85d79ebf)}>
                        待审:{p.reviewReason}
                      </div>
                }
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  <span className={cx(styles.r_07389a77, styles.r_febec8f2, styles.r_45d82811, styles.r_465609a2, styles.r_0e65706b, styles.r_1dc571a3)}>
                    {TYPE_LABEL[p.type] ?? p.type}
                  </span>
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  <Link href={`/user/${p.author.id}`} target="_blank" className={styles.r_f673f4a7}>
                    {p.author.name}
                  </Link>
                  <span className={cx(styles.r_f58b0257, styles.r_1dc571a3, styles.r_7b89cd85)}>Lv.{p.author.level}</span>
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0, styles.r_02eb621e)}>
                  {p.views} / {p._count.comments} / {p._count.likes}
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_d058ca6d, styles.r_7b89cd85)}>
                  {new Date(p.createdAt).toLocaleDateString("zh-CN")}
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  {REVIEW_FILTER_ENABLED ?
                <ReviewBadge status={p.reviewStatus ?? 'published'} /> :

                <span className={cx(styles.r_1dc571a3, styles.r_66a36c90)}>—</span>
                }
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  {p.deleted ?
                <span className={cx(styles.r_ac204c10, styles.r_e0467cf5, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_b54428d1)}>
                      已删除
                    </span> :

                <span className={cx(styles.r_ac204c10, styles.r_f2b23104, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_5f6a59f1)}>
                      正常
                    </span>
                }
                </td>
                <AdminPostPinActions
                postId={p.id}
                postTitle={p.title}
                authorName={p.author.name}
                authorHref={`/user/${p.author.id}`}
                initialBoardSelection={buildBoardSelection({
                  board: p.board,
                  genus: p.genus,
                  species: p.species
                })}
                initialBoardLabel={formatBoardLabel({
                  board: p.board,
                  genus: p.genus,
                  species: p.species
                })}
                initialLocked={p.locked}
                deleted={p.deleted}
                reviewStatus={REVIEW_FILTER_ENABLED ? p.reviewStatus : undefined}
                initialPins={p.pins}
                targets={buildPinTargets({
                  board: p.board,
                  genus: p.genus,
                  species: p.species,
                  tags: parseJsonArray(p.tags)
                })} />

              </tr>
            )}
            {items.length === 0 &&
            <tr>
                <td colSpan={9} className={cx(styles.r_0e17f2bd, styles.r_1100bef6, styles.r_ca6bf630, styles.r_7b89cd85)}>
                  没有数据
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      {/* 翻页 */}
      <div className={cx(styles.r_60fbb771, styles.r_86843cf1, styles.r_44ee8ba0, styles.r_359090c2)}>
        {page > 1 &&
        <Link
          href={{ query: { ...searchParams, page: String(page - 1) } }}
          className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5399e21f)}>

            ← 上一页
          </Link>
        }
        <span className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_7b89cd85)}>
          {page} / {totalPages}
        </span>
        {page < totalPages &&
        <Link
          href={{ query: { ...searchParams, page: String(page + 1) } }}
          className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5399e21f)}>

            下一页 →
          </Link>
        }
      </div>
    </div>);

}

function ReviewBadge({ status }: {status: string;}) {
  if (status === 'pending') {
    return (
      <span className={cx(styles.r_ac204c10, styles.r_735dd972, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_85d79ebf)}>
        🕒 待审
      </span>);

  }
  if (status === 'rejected') {
    return (
      <span className={cx(styles.r_ac204c10, styles.r_e0467cf5, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_b54428d1)}>
        🚫 已驳
      </span>);

  }
  return (
    <span className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_5f6a59f1)}>
      ✅ 已发
    </span>);

}

function buildPinTargets({
  board,
  genus,
  species,
  tags





}: {board: {id: string;name: string;} | null;genus: {id: string;name: string;} | null;species: {id: string;name: string;} | null;tags: string[];}) {
  return [
  {
    key: "global:",
    scope: 'global' as const,
    targetId: '',
    label: '全局置顶',
    description: '在首页和全站推荐列表优先展示'
  },
  board ?
  {
    key: `board:${board.id}`,
    scope: 'board' as const,
    targetId: board.id,
    label: `板块置顶：${board.name}`,
    description: '只在该板块列表优先展示'
  } :
  null,
  genus ?
  {
    key: `genus:${genus.id}`,
    scope: 'genus' as const,
    targetId: genus.id,
    label: `属置顶：${genus.name}`,
    description: '只在该属列表优先展示'
  } :
  null,
  species ?
  {
    key: `species:${species.id}`,
    scope: 'species' as const,
    targetId: species.id,
    label: `品种置顶：${species.name}`,
    description: '只在该品种列表优先展示'
  } :
  null,
  ...tags.slice(0, 10).map((tag) => ({
    key: `topic:${tag}`,
    scope: 'topic' as const,
    targetId: tag,
    label: `话题置顶：#${tag}`,
    description: '只在该话题页优先展示'
  }))].
  filter((target): target is NonNullable<typeof target> => target !== null);
}

function buildBoardSelection({
  board,
  genus,
  species




}: {board: {slug: string;name: string;} | null;genus: {slug: string;name: string;} | null;species: {slug: string;name: string;} | null;}) {
  return {
    categorySlug: board?.slug ?? '',
    genusSlug: genus?.slug ?? '',
    speciesSlug: species?.slug ?? '',
    label: formatBoardLabel({ board, genus, species })
  };
}

function formatBoardLabel({
  board,
  genus,
  species




}: {board: {name: string;} | null;genus: {name: string;} | null;species: {name: string;} | null;}) {
  return [board?.name, genus?.name, species?.name].filter(Boolean).join(' / ') || "-";
}
