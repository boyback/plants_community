import Link from 'next/link';
import Image from 'next/image';
import type { Board } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

export function BoardCard({ board }: { board: Board }) {
  return (
    <Link
      href={`/board/${board.slug}`}
      className="card group overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[16/7] overflow-hidden bg-leaf-50">
        <Image
          src={board.cover}
          alt={board.name}
          fill
          sizes="(max-width:768px) 100vw, 400px"
          className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/10 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white">
          <span className="text-2xl">{board.icon}</span>
          <span className="text-lg font-semibold">{board.name}</span>
        </div>
      </div>
      <div className="p-4">
        <p className="line-clamp-2 text-xs text-leaf-700/80">{board.description}</p>
        <div className="mt-3 flex items-center justify-between text-[11px] text-leaf-700/70">
          <span>👥 {formatNumber(board.members)} 成员</span>
          <span>📝 {formatNumber(board.posts)} 贴</span>
        </div>
      </div>
    </Link>
  );
}
