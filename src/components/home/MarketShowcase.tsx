/**
 * 首页 feed 下方「市场橱窗」 — 商品 + 拍卖混合展示
 *
 * 6 张卡:
 *   - 4 个热销商品(on_sale,按销量/创建时间)
 *   - 2 个进行中拍卖(live)
 *
 * 视觉:
 *   - 顶部条:左标题 + 右「全部商品 →」「拍卖会 →」两个入口
 *   - 卡片栅格:m=2 / md=3 / lg=4
 *   - 拍卖卡有「🔨 拍卖中」红色 chip
 */
import Link from 'next/link';
import Image from 'next/image';

interface ProductCard {
  id: string;
  title: string;
  cover: string;
  price: number;
  originalPrice: number | null;
}

interface AuctionCard {
  id: string;
  title: string;
  cover: string;
  startPrice: number;
  endAt: string;
}

export function MarketShowcase({
  products,
  auctions,
}: {
  products: ProductCard[];
  auctions: AuctionCard[];
}) {
  if (products.length === 0 && auctions.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-leaf-100/60 px-4 py-2.5">
        <div className="text-sm font-semibold text-ink-800">🛒 市场橱窗</div>
        <div className="flex items-center gap-3 text-[11px]">
          <Link href="/market" className="text-leaf-700 hover:underline">
            全部商品 →
          </Link>
          <Link href="/auction" className="text-rose-700 hover:underline">
            拍卖会 →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-3 lg:grid-cols-4">
        {auctions.map((a) => (
          <AuctionItem key={a.id} a={a} />
        ))}
        {products.map((p) => (
          <ProductItem key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

function ProductItem({ p }: { p: ProductCard }) {
  const yuan = (p.price / 100).toFixed(p.price % 100 === 0 ? 0 : 2);
  const orig = p.originalPrice ? (p.originalPrice / 100).toFixed(p.originalPrice % 100 === 0 ? 0 : 2) : null;
  return (
    <Link href={`/market/${p.id}`} className="group overflow-hidden rounded-lg border border-leaf-100 transition-all hover:border-leaf-300 hover:shadow-card">
      <div className="relative aspect-square bg-leaf-50">
        <Image src={p.cover} alt={p.title} fill className="object-cover" unoptimized />
      </div>
      <div className="p-2">
        <div className="line-clamp-1 text-xs text-ink-800 group-hover:text-leaf-700">
          {p.title}
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-sm font-semibold text-rose-600">¥{yuan}</span>
          {orig && (
            <span className="text-[10px] text-leaf-700/40 line-through">¥{orig}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function AuctionItem({ a }: { a: AuctionCard }) {
  const yuan = (a.startPrice / 100).toFixed(a.startPrice % 100 === 0 ? 0 : 2);
  return (
    <Link href={`/auction/${a.id}`} className="group relative overflow-hidden rounded-lg border-2 border-rose-300 bg-rose-50/40 transition-all hover:border-rose-400 hover:shadow-card">
      <span className="absolute left-1.5 top-1.5 z-10 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
        🔨 拍卖中
      </span>
      <div className="relative aspect-square bg-leaf-50">
        <Image src={a.cover} alt={a.title} fill className="object-cover" unoptimized />
      </div>
      <div className="p-2">
        <div className="line-clamp-1 text-xs text-ink-800 group-hover:text-rose-700">
          {a.title}
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-[10px] text-leaf-700/60">起拍</span>
          <span className="text-sm font-semibold text-rose-600">¥{yuan}</span>
        </div>
      </div>
    </Link>
  );
}
