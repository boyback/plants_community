'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { BannerItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export function BannerCarousel({ items }: { items: BannerItem[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);

  const item = items[idx];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-leaf-100 bg-white">
      <Link href={item.link} className="relative block aspect-[21/8] md:aspect-[21/7]">
        <Image
          src={item.image}
          alt={item.title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-cover"
          unoptimized
        />
        <div className={cn('absolute inset-0 bg-gradient-to-r to-transparent', item.tint)} />
        <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-10 text-white">
          <span className="mb-2 inline-flex w-fit items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] backdrop-blur">
            精选活动
          </span>
          <h2 className="text-xl font-bold md:text-3xl">{item.title}</h2>
          <p className="mt-1.5 max-w-md text-xs opacity-90 md:text-sm">{item.subtitle}</p>
        </div>
      </Link>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/60'
            )}
            onClick={() => setIdx(i)}
            aria-label={`切换到第 ${i + 1} 张`}
          />
        ))}
      </div>
    </div>
  );
}
