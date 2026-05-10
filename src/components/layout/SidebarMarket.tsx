/**
 * 左侧 Sidebar · 商品/拍卖推荐
 *
 * 两个独立卡片(拍卖会 / 商品推荐):
 *  - 各自有独立的「换一换 ↻」按钮(只刷新本卡)
 *  - 各自有「×」关闭按钮,关闭后 6 小时内不再出现(localStorage 存 dismissedAt)
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

const DISMISS_TTL_MS = 6 * 60 * 60 * 1000; // 6 小时
const KEY_AUCTION = 'sidebar.dismissAuctionAt';
const KEY_PRODUCT = 'sidebar.dismissProductAt';

function isDismissed(key: string): boolean {
  if (typeof window === 'undefined') return false;
  const v = Number(localStorage.getItem(key) || '0');
  if (!v) return false;
  return Date.now() - v < DISMISS_TTL_MS;
}

function dismiss(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {}
}

export function SidebarMarket() {
  const [products, setProducts] = useState<ProductItem[] | null>(null);
  const [auctions, setAuctions] = useState<AuctionItem[] | null>(null);
  const [auctionRefreshing, setAuctionRefreshing] = useState(false);
  const [productRefreshing, setProductRefreshing] = useState(false);
  // dismiss 状态需要在 mount 后读 localStorage,避免 SSR/CSR 不一致
  const [auctionHidden, setAuctionHidden] = useState(false);
  const [productHidden, setProductHidden] = useState(false);

  // 拉取拍卖(独立)
  const loadAuctions = async (shuffle = false) => {
    setAuctionRefreshing(true);
    try {
      const data = await api.get<{ auctions: AuctionItem[] }>(
        `/api/home/sidebar-market?only=auctions${shuffle ? '&shuffle=1' : ''}`,
      );
      setAuctions(data?.auctions ?? []);
    } catch {
      setAuctions([]);
    } finally {
      setAuctionRefreshing(false);
    }
  };

  // 拉取商品(独立)
  const loadProducts = async (shuffle = false) => {
    setProductRefreshing(true);
    try {
      const data = await api.get<{ products: ProductItem[] }>(
        `/api/home/sidebar-market?only=products${shuffle ? '&shuffle=1' : ''}`,
      );
      setProducts(data?.products ?? []);
    } catch {
      setProducts([]);
    } finally {
      setProductRefreshing(false);
    }
  };

  useEffect(() => {
    setAuctionHidden(isDismissed(KEY_AUCTION));
    setProductHidden(isDismissed(KEY_PRODUCT));
  }, []);

  // 只在没被隐藏时才拉数据,省请求
  useEffect(() => {
    if (!auctionHidden) void loadAuctions(false);
  }, [auctionHidden]);

  useEffect(() => {
    if (!productHidden) void loadProducts(false);
  }, [productHidden]);

  const showAuction = !auctionHidden && auctions !== null && auctions.length > 0;
  const showProduct = !productHidden && products !== null && products.length > 0;

  // 两块都不展示时整段不渲染(包括标题)
  if (!showAuction && !showProduct) return null;

  return (
    <div className="mt-6 space-y-4">
      {showAuction && (
        <Block
          title="拍卖会"
          icon="🔨"
          moreHref="/auction"
          accent="rose"
          refreshing={auctionRefreshing}
          onRefresh={() => void loadAuctions(true)}
          onDismiss={() => {
            dismiss(KEY_AUCTION);
            setAuctionHidden(true);
          }}
        >
          {auctions!.map((a) => (
            <Row
              key={a.id}
              href={`/auction/${a.id}`}
              cover={a.cover}
              title={a.title}
              price={a.startPrice}
              priceLabel="起拍"
            />
          ))}
        </Block>
      )}

      {showProduct && (
        <Block
          title="商品推荐"
          icon="🛒"
          moreHref="/market"
          refreshing={productRefreshing}
          onRefresh={() => void loadProducts(true)}
          onDismiss={() => {
            dismiss(KEY_PRODUCT);
            setProductHidden(true);
          }}
        >
          {products!.map((p) => (
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
  accent,
  refreshing,
  onRefresh,
  onDismiss,
  children,
}: {
  title: string;
  icon: string;
  moreHref: string;
  accent?: 'rose';
  refreshing: boolean;
  onRefresh: () => void;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between px-3 text-[11px]">
        <span className="text-leaf-600/70">
          {icon} {title}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="text-leaf-700/70 hover:text-leaf-700 disabled:opacity-50"
            title="换一换"
          >
            {refreshing ? '换…' : '换 ↻'}
          </button>
          <Link
            href={moreHref}
            className={
              accent === 'rose'
                ? 'text-rose-700 hover:underline'
                : 'text-leaf-700 hover:underline'
            }
          >
            全部 →
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="text-leaf-700/40 hover:text-rose-600"
            title="关闭(6 小时内不再显示)"
          >
            ✕
          </button>
        </div>
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
}: {
  href: string;
  cover: string;
  title: string;
  price: number;
  priceLabel?: string;
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
          {priceLabel && <span className="text-leaf-700/50">{priceLabel}</span>}
          <span className="font-semibold text-rose-600">¥{yuan}</span>
        </div>
      </div>
    </Link>
  );
}
