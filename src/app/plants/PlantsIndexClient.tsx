'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import type { PlantSpecies } from '@/lib/types';

const families = ['全部', '景天科', '番杏科', '百合科', '仙人掌科', '大戟科'];
const diffs = [
  { label: '全部', value: 0 },
  { label: '★', value: 1 },
  { label: '★★', value: 2 },
  { label: '★★★', value: 3 },
  { label: '★★★★', value: 4 },
  { label: '★★★★★', value: 5 },
];

export function PlantsIndexClient({ plants }: { plants: PlantSpecies[] }) {
  const [family, setFamily] = useState('全部');
  const [difficulty, setDifficulty] = useState(0);
  const [q, setQ] = useState('');

  const list = useMemo(
    () =>
      plants.filter((p) => {
        if (family !== '全部' && !p.family.includes(family.replace('科', ''))) return false;
        if (difficulty !== 0 && p.difficulty !== difficulty) return false;
        if (q && !(p.name.includes(q) || p.latinName.toLowerCase().includes(q.toLowerCase())))
          return false;
        return true;
      }),
    [plants, family, difficulty, q]
  );

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">多肉图鉴</h1>
          <p className="text-sm text-leaf-700/70">
            收录常见多肉品种,了解它们的习性与养护要点
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Icon
            name="search"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-leaf-500"
          />
          <input
            className="input pl-8"
            placeholder="搜索中文/拉丁名..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-leaf-700/70 mr-1">科属:</span>
          {families.map((f) => (
            <Chip key={f} active={family === f} onClick={() => setFamily(f)}>
              {f}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-leaf-700/70 mr-1">难度:</span>
          {diffs.map((d) => (
            <Chip
              key={d.value}
              active={difficulty === d.value}
              onClick={() => setDifficulty(d.value)}
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mb-3 text-xs text-leaf-700/70">共 {list.length} 种</div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => (
          <Link
            key={p.id}
            href={`/plants/${p.slug}`}
            className="card group overflow-hidden transition-shadow hover:shadow-lg"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-leaf-50">
              <Image
                src={p.cover}
                alt={p.name}
                fill
                sizes="(max-width:768px) 50vw, 300px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                unoptimized
              />
              <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-leaf-700">
                {'★'.repeat(p.difficulty)}
              </div>
            </div>
            <div className="p-3">
              <div className="text-sm font-semibold text-ink-800">{p.name}</div>
              <div className="mt-0.5 truncate text-[11px] italic text-leaf-700/70">
                {p.latinName}
              </div>
              <div className="mt-1.5 truncate text-[11px] text-leaf-600/80">{p.family}</div>
            </div>
          </Link>
        ))}
      </div>

      {list.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-leaf-200 bg-white/60 py-14 text-center">
          <div className="text-4xl">🔍</div>
          <div className="mt-2 text-sm text-ink-800">没有找到匹配的品种</div>
          <div className="text-xs text-leaf-700/70">换个关键词试试?</div>
        </div>
      )}
    </>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-leaf-500 bg-leaf-500 text-white'
          : 'border-leaf-200 bg-white text-ink-700 hover:bg-leaf-50'
      )}
    >
      {children}
    </button>
  );
}
