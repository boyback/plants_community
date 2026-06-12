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
import styles from './MarketShowcase.module.scss';
import { cx } from '@/lib/style-utils';



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
  auctions



}: {products: ProductCard[];auctions: AuctionCard[];}) {
  if (products.length === 0 && auctions.length === 0) return null;

  return (
    <div className={styles.r_2cd02d11}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_65fdbade, styles.r_38748e06, styles.r_f0faeb26, styles.r_e7ee55ac)}>
        <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>🛒 市场橱窗</div>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_d058ca6d)}>
          <Link href="/market" className={cx(styles.r_5f6a59f1, styles.r_f673f4a7)}>
            全部商品 →
          </Link>
          <Link href="/auction" className={cx(styles.r_b54428d1, styles.r_f673f4a7)}>
            拍卖会 →
          </Link>
        </div>
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_eb6e8b88, styles.r_9a638cfe, styles.r_4558bce6)}>
        {auctions.map((a) =>
        <AuctionItem key={a.id} a={a} />
        )}
        {products.map((p) =>
        <ProductItem key={p.id} p={p} />
        )}
      </div>
    </div>);

}

function ProductItem({ p }: {p: ProductCard;}) {
  const yuan = (p.price / 100).toFixed(p.price % 100 === 0 ? 0 : 2);
  const orig = p.originalPrice ? (p.originalPrice / 100).toFixed(p.originalPrice % 100 === 0 ? 0 : 2) : null;
  return (
    <Link href={`/market/${p.id}`} className={cx(styles.r_64292b1c, styles.r_2cd02d11, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0fe7d7d8, styles.r_a5c39c39, styles.r_6705344e)}>
      <div className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_7ebecbb6)}>
        <Image src={p.cover} alt={p.title} fill className={styles.r_7d85d0c2} unoptimized />
      </div>
      <div className={styles.r_7660b450}>
        <div className={cx(styles.r_f50e2015, styles.r_359090c2, styles.r_399e11a5, styles.r_0eb80431)}>
          {p.title}
        </div>
        <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_b7012bb2, styles.r_44ee8ba0)}>
          <span className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_595fceba)}>¥{yuan}</span>
          {orig &&
          <span className={cx(styles.r_1dc571a3, styles.r_4d094717, styles.r_093ca562)}>¥{orig}</span>
          }
        </div>
      </div>
    </Link>);

}

function AuctionItem({ a }: {a: AuctionCard;}) {
  const yuan = (a.startPrice / 100).toFixed(a.startPrice % 100 === 0 ? 0 : 2);
  return (
    <Link href={`/auction/${a.id}`} className={cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_2cd02d11, styles.r_0c5e9137, styles.r_65935df5, styles.r_3b7f9781, styles.r_e0957073, styles.r_0fe7d7d8, styles.r_79fb1b08, styles.r_6705344e)}>
      <span className={cx(styles.r_da4dbfbc, styles.r_5dee17e1, styles.r_b1044d86, styles.r_236812d6, styles.r_07389a77, styles.r_45a732a4, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395, styles.r_72a4c7cd, styles.r_ed9d3d83)}>
        🔨 拍卖中
      </span>
      <div className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_7ebecbb6)}>
        <Image src={a.cover} alt={a.title} fill className={styles.r_7d85d0c2} unoptimized />
      </div>
      <div className={styles.r_7660b450}>
        <div className={cx(styles.r_f50e2015, styles.r_359090c2, styles.r_399e11a5, styles.r_412183fb)}>
          {a.title}
        </div>
        <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_b7012bb2, styles.r_44ee8ba0)}>
          <span className={cx(styles.r_1dc571a3, styles.r_6c4cc49e)}>起拍</span>
          <span className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_595fceba)}>¥{yuan}</span>
        </div>
      </div>
    </Link>);

}