import { handler } from '@/lib/api';
import { VIP_PLANS } from '@/lib/vip-plans';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => VIP_PLANS);
