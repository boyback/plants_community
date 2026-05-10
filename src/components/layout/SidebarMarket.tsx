/**
 * 左侧 Sidebar · 商品/拍卖推荐(紧凑列表版)
 *
 * 4 个商品 + 4 个拍卖,小图小字适配 Sidebar 56 宽度。
 * 客户端组件,挂载后异步拉数据(Sidebar 整体已是 'use client')。
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';

interface ProductItem {
  id: string;
  title: string;
  cover: string;
  price: number;
}

interface AuctionItem {
  id: string;
  title: string;
  cover: string;
  startPrice: number;
}

export function SidebarMarket() {
  const [products, setProducts] = useState<ProductItem[] | null>(null);
  const [auctions, setAuctions] = useState<AuctionItem[] | null>(null);

  useEffect(() => {
    api
      .get<{ products: ProductItem[]; auctions: AuctionItem[] }>(
        '/api/home/sidebar-market',
      )
      .then((data) => {
        setProducts(data?.products ?? []);
        setAuctions(data?.auctions ?? []);
      })
      .catch(() => {
        setProducts([]);
        setAuctions([]);
      });
  }, []);

  // 加载中 / 都为空时不渲染
  if (products === null || auctions === null) return null;
  if (products.length === 0 && auctions.length === 0) return null;

  return (
    <div className="mt-6 space-y-4">
      {auctions.length > 0 && (
        <Block
          title="拍卖会"
          icon="🔨"
          moreHref="/auction"
          moreLabel="全部"
          accent="rose"
        >
          {auctions.map((a) => (
            <Row
              key={a.id}
              href={`/auction/${a.id}`}
              cover={a.cover}
              title={a.title}
              price={a.startPrice}
              priceLabel="起拍"
              accent="rose"
            />
          ))}
        </Block>
      )}

      {products.length > 0 && (
        <Block
          title="商品推荐"
          icon="🛒"
          moreHref="/market"
          moreLabel="全部"
        >
          {products.map((p) => (
            <Row
              key={p.id}
              href={`/market/${p.id}`}
              cover={p.cover}
              title={p.title}
              price={p.price}
            />
          ))}
        </Block>
      )}
    </div>
  );
}

function Block({
  title,
  icon,
  moreHref,
  moreLabel,
  accent,
  children,
}: {
  title: string;
  icon: string;
  moreHref: string;
  moreLabel: string;
  accent?: 'rose';
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between px-3 text-[11px] uppercase tracking-wider text-leaf-600/70">
        <span>
          {icon} {title}
        </span>
        <Link
          href={moreHref}
          className={
            accent === 'rose'
              ? 'text-rose-700 hover:underline'
              : 'text-leaf-700 hover:underline'
          }
        >
          {moreLabel} →
        </Link>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  href,
  cover,
  title,
  price,
  priceLabel,
  accent,
}: {
  href: string;
  cover: string;
  title: string;
  price: number;
  priceLabel?: string;
  accent?: 'rose';
}) {
  const yuan = (price / 100).toFixed(price % 100 === 0 ? 0 : 2);
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-leaf-50"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-leaf-50">
        <Image src={cover} alt={title} fill className="object-cover" unoptimized />
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-1 text-[12px] text-ink-800">{title}</div>
        <div className="mt-0.5 flex items-baseline gap-1 text-[11px]">
          {priceLabel && (
            <span className="text-leaf-700/50">{priceLabel}</span>
          )}
          <span
            className={
              accent === 'rose'
                ? 'font-semibold text-rose-600'
                : 'font-semibold text-rose-600'
            }
          >
            ¥{yuan}
          </span>
        </div>
      </div>
    </Link>
  );
}
