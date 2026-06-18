import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { I18nText } from '@/components/ui/I18nText';
import styles from './ProductCard.module.scss';
import { cx } from '@/lib/style-utils';



export function ProductCard({ product }: {product: Product;}) {
  const discount = product.originalPrice ?
  Math.round((1 - product.price / product.originalPrice) * 100) :
  0;

  return (
    <Link
      href={`/market/${product.id}`}
      className={cx(styles.r_64292b1c, styles.r_60fbb771, styles.r_8dddea07, styles.r_2cd02d11, styles.r_b8627687, styles.r_9c02094c)}>

      <div className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_2cd02d11, styles.r_7ebecbb6)}>
        <Image
          src={product.cover}
          alt={product.title}
          fill
          sizes="(max-width:768px) 50vw, 280px"
          className={cx(styles.r_7d85d0c2, styles.r_eadef238, styles.r_84432211, styles.r_1a9195e1)}
          unoptimized />

        <div className={cx(styles.r_da4dbfbc, styles.r_d83be576, styles.r_9a2db8f9, styles.r_60fbb771, styles.r_8dddea07, styles.r_44ee8ba0)}>
          <span
            className={cn(cx(styles.r_ac204c10, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395),

            product.source === 'official' ? cx(styles.r_45499621, styles.r_72a4c7cd) : cx(styles.r_735dd972, styles.r_5c6230d2)


            )}>

            <I18nText
              k={product.source === 'official' ? 'market.hero.officialLabel' : 'market.hero.c2cLabel'}
              fallback={product.source === 'official' ? '官方' : '肉友'} />

          </span>
          {discount > 0 &&
          <span className={cx(styles.r_ac204c10, styles.r_45a732a4, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395, styles.r_72a4c7cd)}>
              -{discount}%
            </span>
          }
        </div>
        {product.status === 'sold_out' &&
        <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_f3c543ad, styles.r_67d66567, styles.r_094a9df0)}>
            <span className={cx(styles.r_ac204c10, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_399e11a5)}>
              <I18nText k="market.card.soldOut" fallback="已售罄" />
            </span>
          </div>
        }
      </div>

      <div className={cx(styles.r_60fbb771, styles.r_36e579c0, styles.r_8dddea07, styles.r_58284b4e, styles.r_eb6e8b88)}>
        <h3 className={cx(styles.r_054cb4e3, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{product.title}</h3>
        <div className={cx(styles.r_9953408a, styles.r_60fbb771, styles.r_b7012bb2, styles.r_58284b4e)}>
          <span className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_595fceba)}>{formatPrice(product.price)}</span>
          {product.originalPrice &&
          <span className={cx(styles.r_d058ca6d, styles.r_3353f144, styles.r_093ca562)}>
              {formatPrice(product.originalPrice)}
            </span>
          }
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1dc571a3, styles.r_69335b95)}>
          <span>
            <I18nText
              k="market.hero.ordersCount"
              vars={{ n: product.ordersCount ?? 0 }}
              fallback={`📦 ${product.ordersCount ?? 0} 笔订单`} />

          </span>
          {product.pointsBack > 0 &&
          <span className={cx(styles.r_07389a77, styles.r_7ebecbb6, styles.r_45d82811, styles.r_c6e52cdb, styles.r_5f6a59f1)}>
              <I18nText
              k="market.hero.pointsBack"
              vars={{ n: product.pointsBack }}
              fallback={`返 ${product.pointsBack} 钻石`} />

            </span>
          }
        </div>
        {product.source === 'c2c' && product.seller &&
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_1dc571a3, styles.r_69335b95)}>
            <span>
              <I18nText
              k="market.hero.sellerName"
              vars={{ name: product.seller.name }}
              fallback={`卖家:${product.seller.name}`} />

            </span>
            {product.shipFrom && <span>· {product.shipFrom}</span>}
          </div>
        }
      </div>
    </Link>);

}
