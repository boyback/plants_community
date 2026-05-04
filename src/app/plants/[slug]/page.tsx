import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PostCard } from '@/components/post/PostCard';
import { Icon } from '@/components/ui/Icon';
import { prisma } from '@/lib/db';
import { serializePlant, serializePost } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';

export const dynamic = 'force-dynamic';

export default async function PlantDetailPage({ params }: { params: { slug: string } }) {
  const raw = await prisma.plant.findUnique({ where: { slug: params.slug } });
  if (!raw) notFound();
  const plant = serializePlant(raw);

  // 相关帖子:标签含品种名
  const all = await prisma.post.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: postInclude(),
  });
  const relatedRaw = all.filter((p) => (p.tags ?? '').includes(plant.name)).slice(0, 4);
  let related = relatedRaw.map(serializePost);
  if (related.length === 0) related = all.slice(0, 4).map(serializePost);

  const otherRaw = await prisma.plant.findMany({
    where: { slug: { not: plant.slug } },
    take: 6,
    orderBy: { name: 'asc' },
  });
  const otherPlants = otherRaw.map(serializePlant);

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-1.5 text-xs text-leaf-700/70">
        <Link href="/" className="hover:text-leaf-700">
          首页
        </Link>
        <Icon name="arrow-right" size={12} />
        <Link href="/plants" className="hover:text-leaf-700">
          多肉图鉴
        </Link>
        <Icon name="arrow-right" size={12} />
        <span className="text-ink-700">{plant.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="relative aspect-[16/10] w-full bg-leaf-50">
              <Image src={plant.cover} alt={plant.name} fill className="object-cover" unoptimized />
            </div>
            <div className="p-6">
              <h1 className="flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-bold text-ink-800 md:text-3xl">{plant.name}</span>
                <span className="text-sm italic text-leaf-700/70">{plant.latinName}</span>
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="chip">{plant.family}</span>
                <span className="chip">难度 {'★'.repeat(plant.difficulty)}</span>
                <span className="chip">耐寒 {plant.hardiness}</span>
              </div>
              <p className="mt-4 text-[15px] leading-7 text-ink-800">{plant.description}</p>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-3 text-lg font-semibold text-ink-800">🪴 养护要点</h2>
            <ul className="space-y-2.5">
              {plant.tips.map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-leaf-500 text-[11px] text-white">
                    {i + 1}
                  </span>
                  <span className="text-ink-800">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {plant.gallery.length > 1 && (
            <div className="card p-6">
              <h2 className="mb-3 text-lg font-semibold text-ink-800">📸 图集</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {plant.gallery.map((g, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-leaf-50">
                    <Image src={g} alt="" fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-lg font-semibold text-ink-800">💬 相关讨论</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {related.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold">养护数据</h3>
            <div className="space-y-2.5 text-sm">
              <InfoRow icon="☀️" label="光照" value={plant.light} />
              <InfoRow icon="💧" label="浇水" value={plant.watering} />
              <InfoRow icon="❄️" label="耐寒度" value={plant.hardiness} />
              <InfoRow icon="🎯" label="养护难度" value={'★'.repeat(plant.difficulty)} />
            </div>
          </div>

          <div className="card p-4">
            <h3 className="mb-3 text-sm font-semibold">相关品种</h3>
            <ul className="space-y-2">
              {otherPlants.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/plants/${p.slug}`}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-leaf-50"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-leaf-50">
                      <Image src={p.cover} alt="" fill className="object-cover" unoptimized />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="truncate text-[11px] text-leaf-700/70">{p.family}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-leaf-700/70">
        <span className="mr-1.5">{icon}</span>
        {label}
      </span>
      <span className="font-medium text-ink-800">{value}</span>
    </div>
  );
}
