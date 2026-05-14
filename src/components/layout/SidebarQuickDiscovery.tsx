'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DiscoverySpecies {
  id: string;
  name: string;
  url: string;
}

interface DiscoveryCategory {
  id: string;
  slug: string;
  name: string;
}

export function SidebarQuickDiscovery() {
  const [species, setSpecies] = useState<DiscoverySpecies[]>([]);
  const [categories, setCategories] = useState<DiscoveryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [speciesBusy, setSpeciesBusy] = useState(false);
  const [boardsBusy, setBoardsBusy] = useState(false);

  useEffect(() => {
    fetch('/api/home/quick-discovery?n=12')
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.species) setSpecies(data.data.species);
        if (data?.data?.categories) setCategories(data.data.categories);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refreshSpecies = async () => {
    setSpeciesBusy(true);
    try {
      const r = await fetch('/api/home/quick-discovery?n=12&shuffle=1');
      const data = await r.json();
      if (data?.data?.species) setSpecies(data.data.species);
    } finally {
      setSpeciesBusy(false);
    }
  };

  const refreshBoards = () => {
    setBoardsBusy(true);
    setCategories((arr) => [...arr].sort(() => Math.random() - 0.5));
    setTimeout(() => setBoardsBusy(false), 200);
  };

  if (loading || (species.length === 0 && categories.length === 0)) return null;

  return (
    <div className="rounded-xl border border-leaf-100 bg-white overflow-hidden">
      {/* 热门品种 */}
      {species.length > 0 && (
        <div className="px-3 py-2.5 border-b border-leaf-100/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-ink-800">🌱 热门品种</span>
            <button
              type="button"
              onClick={refreshSpecies}
              disabled={speciesBusy}
              className={cn(
                'text-[10px] text-leaf-700/70 hover:text-leaf-700',
                speciesBusy && 'opacity-50',
              )}
            >
              换一换 ↻
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {species.map((s) => (
              <Link
                key={s.id}
                href={s.url}
                className="inline-flex items-center rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] text-leaf-700 hover:bg-leaf-100"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 板块 */}
      {categories.length > 0 && (
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-ink-800">🏷️ 热门板块</span>
            <button
              type="button"
              onClick={refreshBoards}
              disabled={boardsBusy}
              className={cn(
                'text-[10px] text-leaf-700/70 hover:text-leaf-700',
                boardsBusy && 'opacity-50',
              )}
            >
              换一换 ↻
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/board/${c.slug}`}
                className="inline-flex items-center rounded-full border border-leaf-200 px-2 py-0.5 text-[10px] text-ink-700/80 hover:border-leaf-400 hover:text-leaf-700"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
