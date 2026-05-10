/**
 * GET /api/home/quick-discovery?n=12&shuffle=1
 * 给「快速发现」组件刷新数据用
 */
import { NextResponse } from 'next/server';
import { loadQuickDiscoveryData } from '@/components/home/QuickDiscovery';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const n = Math.min(50, Math.max(1, Number(url.searchParams.get('n') || 12)));
  const shuffle = url.searchParams.get('shuffle') === '1';

  const data = await loadQuickDiscoveryData({ n, shuffle });
  return NextResponse.json({ ok: true, data });
}
