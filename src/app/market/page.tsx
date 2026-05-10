import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { I18nText } from '@/components/ui/I18nText';
import { MarketIndexClient } from './MarketIndexClient';

export const dynamic = 'force-dynamic';

export default function MarketPage() {
  return (
    <Shell>
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">交易市场</h1>
          <p className="text-sm text-leaf-700/70">
            一口价闲置 + 拍卖竞价 · 支持支付宝 / 微信 / 官方中介担保
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/addresses" className="btn-outline !text-sm">
            📦 <I18nText k="nav.shippingAddress" fallback="收货地址" />
          </Link>
          <Link href="/orders" className="btn-outline !text-sm">
            <I18nText k="nav.myOrders" fallback="我的订单" />
          </Link>
          <Link href="/market/sell" className="btn-primary !text-sm">
            ✨ 我要出售
          </Link>
        </div>
      </div>

      <MarketIndexClient />
    </Shell>
  );
}
