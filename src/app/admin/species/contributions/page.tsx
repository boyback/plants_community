import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSpeciesGalleryUrls } from "@/lib/species-gallery";
import { ContributionReviewActions } from './ContributionReviewActions';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝'
};

const typeLabels: Record<string, string> = {
  image: '图片投稿',
  correction: '资料纠错',
  care_tip: '养护经验',
  morphology: '形态特征',
  growth_image: '成长变化图片',
  gallery_image: '图集图片',
  similar_species: '相似品种建议'
};

export default async function SpeciesContributionsPage({
  searchParams


}: {searchParams: {status?: string;page?: string;};}) {
  const status = searchParams.status ?? 'pending';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 30;
  const where = status === 'all' ? {} : { status: status as 'pending' | 'approved' | 'rejected' };

  const [items, total] = await Promise.all([
  prisma.speciesContribution.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      user: { select: { id: true, name: true } },
      species: {
        select: {
          id: true,
          name: true,
          slug: true,
          cover: true,
          gallery: true,
          genus: { select: { slug: true, board: { select: { slug: true } } } }
        }
      }
    }
  }),
  prisma.speciesContribution.count({ where })]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={styles.r_3e7ce58d}>
      <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_8ef2268e, styles.r_0c3bc985)}>
        <div>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_4ddaa618)}>图鉴贡献审核</h1>
          <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>共 {total} 条 · 第 {page}/{totalPages} 页</p>
          <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_85d79ebf)}>“写入并通过”会把图片追加到图集、养护经验追加到 tips、资料纠错按字段白名单写入官方资料；历史相似品种建议仅做审核记录。</p>
        </div>
        <Link href="/admin/species" className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_5399e21f)}>
          返回品种数据
        </Link>
      </div>

      <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e, styles.r_359090c2)}>
        {['pending', 'approved', 'rejected', 'all'].map((item) =>
        <Link
          key={item}
          href={{ query: { status: item } }}
          className={cx(styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_ec0091ee, `${
          status === item ? cx(styles.r_3bd65fe8, styles.r_7ebecbb6, styles.r_e7eab4cb) : cx(styles.r_7ae4c063, styles.r_02eb621e, styles.r_5399e21f)}`)
          }>

            {item === 'all' ? '全部' : statusLabels[item]}
          </Link>
        )}
      </div>

      <div className={cx(styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
        <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
          <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
            <tr>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>品种</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>类型</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>内容</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>用户</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>状态</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const payload = item.payload as {
                content?: string;
                fieldName?: string;
                suggestedValue?: string;
                reason?: string;
                season?: string;
                images?: string[];
                note?: string;
                stage?: string;
                similarName?: string;
                similarSpeciesId?: string;
              };
              const href = item.species.genus.board ?
              `/plants/${item.species.genus.board.slug}/${item.species.genus.slug}/${item.species.slug}` :
              '/plants';
              return (
                <tr key={item.id} className={cx(styles.r_b950dda2, styles.r_358505cf, styles.r_10e0e527, styles.r_d9a085ef)}>
                  <td className={cx(styles.r_0e17f2bd, styles.r_1b2d54a3)}>
                    <Link href={href} target="_blank" className={cx(styles.r_2689f395, styles.r_399e11a5, styles.r_f673f4a7)}>
                      {item.species.name}
                    </Link>
                    <div className={cx(styles.r_b6b02c0e, styles.r_0e65706b, styles.r_1dc571a3, styles.r_66a36c90)}>{item.species.id}</div>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_1b2d54a3, styles.r_eb6abb1f)}>{typeLabels[item.type] ?? item.type}</td>
                  <td className={cx(styles.r_9ef2b581, styles.r_0e17f2bd, styles.r_1b2d54a3)}>
                    <ContributionPayloadView payload={payload} type={item.type} />
                    <div className={cx(styles.r_b6b02c0e, styles.r_1dc571a3, styles.r_66a36c90)}>{item.createdAt.toLocaleString("zh-CN")}</div>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_1b2d54a3)}>
                    <Link href={`/user/${item.user.id}`} target="_blank" className={cx(styles.r_eb6abb1f, styles.r_f673f4a7)}>
                      {item.user.name}
                    </Link>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_1b2d54a3)}>{statusLabels[item.status]}</td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_1b2d54a3, styles.r_308fc069)}>
                    <ContributionReviewActions
                      id={item.id}
                      disabled={item.status !== 'pending'}
                      images={['image', "growth_image", 'gallery_image'].includes(item.type) ? payload.images : undefined}
                      existingImages={['image', "growth_image", 'gallery_image'].includes(item.type) ? [item.species.cover, ...getSpeciesGalleryUrls(item.species.gallery)] : undefined} />

                  </td>
                </tr>);

            })}
            {items.length === 0 &&
            <tr>
                <td colSpan={6} className={cx(styles.r_0e17f2bd, styles.r_61357c0c, styles.r_ca6bf630, styles.r_7b89cd85)}>
                  暂无投稿
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div className={cx(styles.r_60fbb771, styles.r_86843cf1, styles.r_44ee8ba0, styles.r_359090c2)}>
        {page > 1 &&
        <Link href={{ query: { ...searchParams, page: String(page - 1) } }} className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5399e21f)}>
            上一页
          </Link>
        }
        <span className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_7b89cd85)}>{page} / {totalPages}</span>
        {page < totalPages &&
        <Link href={{ query: { ...searchParams, page: String(page + 1) } }} className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5399e21f)}>
            下一页
          </Link>
        }
      </div>
    </div>);

}

function ContributionPayloadView({
  payload,
  type













}: {payload: {content?: string;fieldName?: string;suggestedValue?: string;reason?: string;season?: string;images?: string[];note?: string;stage?: string;similarName?: string;};type: string;}) {
  if (type === 'image' && payload.images?.length) {
    return (
      <div className={cx(styles.r_6f7e013d, styles.r_5f22e64f, styles.r_ce27a834, styles.r_0e17f2bd, styles.r_03b4dd7f)}>
        <div className={cx(styles.r_f3c543ad, styles.r_32aac21b, styles.r_77a2a20e)}>
          {payload.images.slice(0, 8).map((url) =>
          <a key={url} href={url} target="_blank" className={cx(styles.r_0214b4b3, styles.r_2cd02d11, styles.r_07389a77, styles.r_5e10cdb8)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className={cx(styles.r_0a769880, styles.r_6da6a3c3, styles.r_7d85d0c2)} />
            </a>
          )}
        </div>
        {payload.note && <div className={cx(styles.r_a2edcb1a, styles.r_170cee3f, styles.r_eb6abb1f)}>{payload.note}</div>}
      </div>);

  }

  if ((type === "growth_image" || type === 'gallery_image') && payload.images?.length) {
    return (
      <div className={cx(styles.r_6f7e013d, styles.r_5f22e64f, styles.r_ce27a834, styles.r_0e17f2bd, styles.r_03b4dd7f)}>
        {payload.stage && <div className={styles.r_eb6abb1f}><span className={styles.r_7b89cd85}>阶段：</span>{payload.stage}</div>}
        <div className={cx(styles.r_f3c543ad, styles.r_32aac21b, styles.r_77a2a20e)}>
          {payload.images.slice(0, 8).map((url) =>
          <a key={url} href={url} target="_blank" className={cx(styles.r_0214b4b3, styles.r_2cd02d11, styles.r_07389a77, styles.r_5e10cdb8)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className={cx(styles.r_0a769880, styles.r_6da6a3c3, styles.r_7d85d0c2)} />
            </a>
          )}
        </div>
        {payload.note && <div className={cx(styles.r_a2edcb1a, styles.r_170cee3f, styles.r_eb6abb1f)}>{payload.note}</div>}
      </div>);

  }

  if (type === 'correction') {
    return (
      <div className={cx(styles.r_da7c36cd, styles.r_5f22e64f, styles.r_ce27a834, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_eb6abb1f)}>
        <div><span className={styles.r_7b89cd85}>字段：</span>{payload.fieldName ?? "-"}</div>
        <div><span className={styles.r_7b89cd85}>建议值：</span>{payload.suggestedValue ?? "-"}</div>
        {payload.reason && <div className={cx(styles.r_a2edcb1a, styles.r_170cee3f)}><span className={styles.r_7b89cd85}>原因：</span>{payload.reason}</div>}
      </div>);

  }

  if (type === 'care_tip') {
    return (
      <div className={cx(styles.r_da7c36cd, styles.r_5f22e64f, styles.r_ce27a834, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_eb6abb1f)}>
        {payload.season && <div><span className={styles.r_7b89cd85}>场景：</span>{payload.season}</div>}
        <div className={cx(styles.r_a2edcb1a, styles.r_170cee3f)}>{payload.content ?? "-"}</div>
      </div>);

  }

  if (type === 'morphology') {
    return (
      <div className={cx(styles.r_5f22e64f, styles.r_ce27a834, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_eb6abb1f)}>
        <div className={cx(styles.r_a2edcb1a, styles.r_170cee3f)}>{payload.content ?? "-"}</div>
      </div>);

  }

  if (type === 'similar_species') {
    return (
      <div className={cx(styles.r_da7c36cd, styles.r_5f22e64f, styles.r_ce27a834, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_eb6abb1f)}>
        <div><span className={styles.r_7b89cd85}>相似品种：</span>{payload.similarName ?? "-"}</div>
        {payload.reason && <div className={cx(styles.r_a2edcb1a, styles.r_170cee3f)}><span className={styles.r_7b89cd85}>理由：</span>{payload.reason}</div>}
      </div>);

  }

  return (
    <div className={cx(styles.r_a2edcb1a, styles.r_170cee3f, styles.r_5f22e64f, styles.r_ce27a834, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_eb6abb1f)}>
      {payload.content ?? JSON.stringify(payload)}
    </div>);

}