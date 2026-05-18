'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DiscoverySpecies {
  id: string;
  name: string;
  url: string;
}

export function SidebarQuickDiscovery() {
  const [species, setSpecies] = useState<DiscoverySpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [speciesBusy, setSpeciesBusy] = useState(false);

  useEffect(() => {
    fetch('/api/home/quick-discovery?n=12')
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.species) setSpecies(data.data.species);
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

  if (loading || species.length === 0) return null;

  return (
    <div className="rounded-none border border-leaf-100 bg-white overflow-hidden">
      {/* 热门品种 */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-ink-800">🌱 热门品种</span>
          <button
            type="button"
            onClick={refreshSpecies}
            disabled={speciesBusy}
            className={cn(
              'text-xs text-leaf-700/70 hover:text-leaf-700',
              speciesBusy && 'opacity-50',
            )}
          >
            换一换 ↻
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {species
            .filter((s) => s.url)
            .map((s) => (
              <Link
                key={s.id}
                href={s.url}
                className="inline-flex items-center rounded-full bg-leaf-50 px-2.5 py-1 text-[10px] text-leaf-700 hover:bg-leaf-100 transition-colors"
              >
                {s.name}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
