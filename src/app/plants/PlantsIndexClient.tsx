'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/i18n/I18nContext';
import type { PlantSpecies } from '@/lib/types';

type PlantItem = PlantSpecies & { detailHref?: string };

/**
 * family 过滤键采用 latin-ish key,label 走 i18n:
 * 命中策略:p.family 里若含该 key 去掉 "aceae" 的词根,或直接含该 key,都算命中。
 * 为兼容现有 mock(中文家族名),同时把 zh 家族汉字硬编码作为备胎匹配。
 */
const FAMILY_OPTIONS: Array<{ key: string; zh: string }> = [
  { key: 'all', zh: '' },
  { key: 'Crassulaceae', zh: '景天' },
  { key: 'Aizoaceae', zh: '番杏' },
  { key: 'Liliaceae', zh: '百合' },
  { key: 'Cactaceae', zh: '仙人掌' },
  { key: 'Euphorbiaceae', zh: '大戟' },
];

const DIFFICULTY = [0, 1, 2, 3, 4, 5] as const;

export function PlantsIndexClient({ plants }: { plants: PlantItem[] }) {
  const { t } = useI18n();
  const [familyKey, setFamilyKey] = useState('all');
  const [difficulty, setDifficulty] = useState(0);
  const [q, setQ] = useState('');

  const list = useMemo(
    () =>
      plants.filter((p) => {
        if (familyKey !== 'all') {
          const opt = FAMILY_OPTIONS.find((f) => f.key === familyKey)!;
          // 中文 family 匹配:含 zh 词根;同时 Latin 匹配:family 里含 key 词根
          const hit =
            (opt.zh && p.family.includes(opt.zh)) ||
            (opt.key && p.family.toLowerCase().includes(opt.key.toLowerCase()));
          if (!hit) return false;
        }
        if (difficulty !== 0 && p.difficulty !== difficulty) return false;
        if (q && !(p.name.includes(q) || p.latinName.toLowerCase().includes(q.toLowerCase())))
          return false;
        return true;
      }),
    [plants, familyKey, difficulty, q]
  );

  const familyLabel = (key: string) =>
    key === 'all' ? t('plants.all') : t(`plants.family.${key}`);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('plants.title')}</h1>
          <p className="text-sm text-leaf-700/70">{t('plants.subtitle')}</p>
        </div>
        <div className="relative w-full md:w-64">
          <Icon
            name="search"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-leaf-500"
          />
          <input
            className="input pl-8"
            placeholder={t('plants.searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-leaf-700/70 mr-1">{t('plants.familyLabel')}</span>
          {FAMILY_OPTIONS.map((f) => (
            <Chip key={f.key} active={familyKey === f.key} onClick={() => setFamilyKey(f.key)}>
              {familyLabel(f.key)}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-leaf-700/70 mr-1">{t('plants.difficultyLabel')}</span>
          {DIFFICULTY.map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {d === 0 ? t('plants.all') : '★'.repeat(d)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mb-3 text-xs text-leaf-700/70">{t('plants.totalCount', { n: list.length })}</div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => (
          <Link
            key={p.id}
            href={p.detailHref ?? `/plants/${p.slug}`}
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
          <div className="mt-2 text-sm text-ink-800">{t('plants.empty')}</div>
          <div className="text-xs text-leaf-700/70">{t('plants.emptyDesc')}</div>
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
