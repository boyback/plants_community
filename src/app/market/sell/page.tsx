import { Shell } from '@/components/layout/Shell';
import { MarketListingForm } from '@/components/market/MarketListingForm';

export const dynamic = 'force-dynamic';

export default function SellPage() {
  return (
    <Shell withSidebar={false}>
      <MarketListingForm mode="create" />
    </Shell>
  );
}
