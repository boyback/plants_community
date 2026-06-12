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
import { api } from "@/lib/client-api";
import styles from './SidebarMarket.module.scss';
import { cx } from '@/lib/style-utils';



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
      const data = await api.get<{auctions: AuctionItem[];}>(
        `/api/home/sidebar-market?only=auctions${shuffle ? '&shuffle=1' : ''}`
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
      const data = await api.get<{products: ProductItem[];}>(
        `/api/home/sidebar-market?only=products${shuffle ? '&shuffle=1' : ''}`
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
    <div className={cx(styles.r_31f25533, styles.r_3e7ce58d)}>
      {showAuction &&
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
        }}>

          {auctions!.map((a) =>
        <Row
          key={a.id}
          href={`/auction/${a.id}`}
          cover={a.cover}
          title={a.title}
          price={a.startPrice}
          priceLabel="起拍" />

        )}
        </Block>
      }

      {showProduct &&
      <Block
        title="商品推荐"
        icon="🛒"
        moreHref="/market"
        refreshing={productRefreshing}
        onRefresh={() => void loadProducts(true)}
        onDismiss={() => {
          dismiss(KEY_PRODUCT);
          setProductHidden(true);
        }}>

          {products!.map((p) =>
        <Row
          key={p.id}
          href={`/market/${p.id}`}
          cover={p.cover}
          title={p.title}
          price={p.price} />

        )}
        </Block>
      }
    </div>);

}

function Block({
  title,
  icon,
  moreHref,
  accent,
  refreshing,
  onRefresh,
  onDismiss,
  children









}: {title: string;icon: string;moreHref: string;accent?: 'rose';refreshing: boolean;onRefresh: () => void;onDismiss: () => void;children: React.ReactNode;}) {
  return (
    <div>
      <div className={cx(styles.r_d7c1392c, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_0e17f2bd, styles.r_d058ca6d)}>
        <span className={styles.r_a1a0ad0b}>
          {icon} {title}
        </span>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={cx(styles.r_69335b95, styles.r_9825203a, styles.r_b29d8adb)}
            title="换一换">

            {refreshing ? '换…' : '换 ↻'}
          </button>
          <Link
            href={moreHref}
            className={
            accent === 'rose' ? cx(styles.r_b54428d1, styles.r_f673f4a7) : cx(styles.r_5f6a59f1, styles.r_f673f4a7)


            }>

            全部 →
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className={cx(styles.r_4d094717, styles.r_744ff542)}
            title="关闭(6 小时内不再显示)">

            ✕
          </button>
        </div>
      </div>
      <div className={styles.r_e2eedc57}>{children}</div>
    </div>);

}

function Row({
  href,
  cover,
  title,
  price,
  priceLabel






}: {href: string;cover: string;title: string;price: number;priceLabel?: string;}) {
  const yuan = (price / 100).toFixed(price % 100 === 0 ? 0 : 2);
  return (
    <Link
      href={href}
      className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_0c5e9137, styles.r_cd009d7d, styles.r_ceb69a6b, styles.r_5756b7b4)}>

      <div className={cx(styles.r_d89972fe, styles.r_426b8b75, styles.r_d854e569, styles.r_012fbd12, styles.r_2cd02d11, styles.r_421ac2be, styles.r_7ebecbb6)}>
        <Image src={cover} alt={title} fill className={styles.r_7d85d0c2} unoptimized />
      </div>
      <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
        <div className={cx(styles.r_f50e2015, styles.r_69cdf25a, styles.r_399e11a5)}>{title}</div>
        <div className={cx(styles.r_15e1b1f4, styles.r_60fbb771, styles.r_b7012bb2, styles.r_44ee8ba0, styles.r_d058ca6d)}>
          {priceLabel && <span className={styles.r_3353f144}>{priceLabel}</span>}
          <span className={cx(styles.r_e83a7042, styles.r_595fceba)}>¥{yuan}</span>
        </div>
      </div>
    </Link>);

}