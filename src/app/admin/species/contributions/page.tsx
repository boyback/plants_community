import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSpeciesGalleryUrls } from '@/lib/species-gallery';
import { ContributionReviewActions } from './ContributionReviewActions';

export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
};

const typeLabels: Record<string, string> = {
  image: '图片投稿',
  correction: '资料纠错',
  care_tip: '养护经验',
  morphology: '形态特征',
  growth_image: '成长变化图片',
  gallery_image: '图集图片',
  similar_species: '相似品种建议',
};

export default async function SpeciesContributionsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
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
            genus: { select: { slug: true, board: { select: { slug: true } } } },
          },
        },
      },
    }),
    prisma.speciesContribution.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">图鉴贡献审核</h1>
          <p className="mt-1 text-xs text-ink-500">共 {total} 条 · 第 {page}/{totalPages} 页</p>
          <p className="mt-1 text-xs text-amber-700">“写入并通过”会把图片追加到图集、养护经验追加到 tips、资料纠错按字段白名单写入官方资料；历史相似品种建议仅做审核记录。</p>
        </div>
        <Link href="/admin/species" className="rounded-lg border border-ink-200 px-3 py-2 text-xs hover:bg-ink-50">
          返回品种数据
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {['pending', 'approved', 'rejected', 'all'].map((item) => (
          <Link
            key={item}
            href={{ query: { status: item } }}
            className={`rounded-full border px-3 py-1.5 ${
              status === item ? 'border-leaf-600 bg-leaf-50 text-leaf-800' : 'border-ink-200 text-ink-600 hover:bg-ink-50'
            }`}
          >
            {item === 'all' ? '全部' : statusLabels[item]}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="px-3 py-2 text-left">品种</th>
              <th className="px-3 py-2 text-left">类型</th>
              <th className="px-3 py-2 text-left">内容</th>
              <th className="px-3 py-2 text-left">用户</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-right">操作</th>
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
              const href = item.species.genus.board
                ? `/plants/${item.species.genus.board.slug}/${item.species.genus.slug}/${item.species.slug}`
                : '/plants';
              return (
                <tr key={item.id} className="border-t border-ink-100 align-top hover:bg-ink-50/50">
                  <td className="px-3 py-3">
                    <Link href={href} target="_blank" className="font-medium text-ink-800 hover:underline">
                      {item.species.name}
                    </Link>
                    <div className="mt-1 font-mono text-[10px] text-ink-400">{item.species.id}</div>
                  </td>
                  <td className="px-3 py-3 text-ink-700">{typeLabels[item.type] ?? item.type}</td>
                  <td className="max-w-xl px-3 py-3">
                    <ContributionPayloadView payload={payload} type={item.type} />
                    <div className="mt-1 text-[10px] text-ink-400">{item.createdAt.toLocaleString('zh-CN')}</div>
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/user/${item.user.id}`} target="_blank" className="text-ink-700 hover:underline">
                      {item.user.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{statusLabels[item.status]}</td>
                  <td className="px-3 py-3 text-right">
                    <ContributionReviewActions
                      id={item.id}
                      disabled={item.status !== 'pending'}
                      images={['image', 'growth_image', 'gallery_image'].includes(item.type) ? payload.images : undefined}
                      existingImages={['image', 'growth_image', 'gallery_image'].includes(item.type) ? [item.species.cover, ...getSpeciesGalleryUrls(item.species.gallery)] : undefined}
                    />
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-ink-500">
                  暂无投稿
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-1 text-xs">
        {page > 1 && (
          <Link href={{ query: { ...searchParams, page: String(page - 1) } }} className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50">
            上一页
          </Link>
        )}
        <span className="px-3 py-1 text-ink-500">{page} / {totalPages}</span>
        {page < totalPages && (
          <Link href={{ query: { ...searchParams, page: String(page + 1) } }} className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50">
            下一页
          </Link>
        )}
      </div>
    </div>
  );
}

function ContributionPayloadView({
  payload,
  type,
}: {
  payload: {
    content?: string;
    fieldName?: string;
    suggestedValue?: string;
    reason?: string;
    season?: string;
    images?: string[];
    note?: string;
    stage?: string;
    similarName?: string;
  };
  type: string;
}) {
  if (type === 'image' && payload.images?.length) {
    return (
      <div className="space-y-2 rounded-lg bg-ink-50 px-3 py-2">
        <div className="grid grid-cols-4 gap-2">
          {payload.images.slice(0, 8).map((url) => (
            <a key={url} href={url} target="_blank" className="block overflow-hidden rounded bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-20 w-full object-cover" />
            </a>
          ))}
        </div>
        {payload.note && <div className="whitespace-pre-wrap break-words text-ink-700">{payload.note}</div>}
      </div>
    );
  }

  if ((type === 'growth_image' || type === 'gallery_image') && payload.images?.length) {
    return (
      <div className="space-y-2 rounded-lg bg-ink-50 px-3 py-2">
        {payload.stage && <div className="text-ink-700"><span className="text-ink-500">阶段：</span>{payload.stage}</div>}
        <div className="grid grid-cols-4 gap-2">
          {payload.images.slice(0, 8).map((url) => (
            <a key={url} href={url} target="_blank" className="block overflow-hidden rounded bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-20 w-full object-cover" />
            </a>
          ))}
        </div>
        {payload.note && <div className="whitespace-pre-wrap break-words text-ink-700">{payload.note}</div>}
      </div>
    );
  }

  if (type === 'correction') {
    return (
      <div className="space-y-1 rounded-lg bg-ink-50 px-3 py-2 text-ink-700">
        <div><span className="text-ink-500">字段：</span>{payload.fieldName ?? '-'}</div>
        <div><span className="text-ink-500">建议值：</span>{payload.suggestedValue ?? '-'}</div>
        {payload.reason && <div className="whitespace-pre-wrap break-words"><span className="text-ink-500">原因：</span>{payload.reason}</div>}
      </div>
    );
  }

  if (type === 'care_tip') {
    return (
      <div className="space-y-1 rounded-lg bg-ink-50 px-3 py-2 text-ink-700">
        {payload.season && <div><span className="text-ink-500">场景：</span>{payload.season}</div>}
        <div className="whitespace-pre-wrap break-words">{payload.content ?? '-'}</div>
      </div>
    );
  }

  if (type === 'morphology') {
    return (
      <div className="rounded-lg bg-ink-50 px-3 py-2 text-ink-700">
        <div className="whitespace-pre-wrap break-words">{payload.content ?? '-'}</div>
      </div>
    );
  }

  if (type === 'similar_species') {
    return (
      <div className="space-y-1 rounded-lg bg-ink-50 px-3 py-2 text-ink-700">
        <div><span className="text-ink-500">相似品种：</span>{payload.similarName ?? '-'}</div>
        {payload.reason && <div className="whitespace-pre-wrap break-words"><span className="text-ink-500">理由：</span>{payload.reason}</div>}
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap break-words rounded-lg bg-ink-50 px-3 py-2 text-ink-700">
      {payload.content ?? JSON.stringify(payload)}
    </div>
  );
}
