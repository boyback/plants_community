/**
 * GET /api/auth/wechat/qrcode
 *
 * PC 扫码登录入口:重定向到微信开放平台 qrconnect 页。
 * 用户扫码并确认后,微信会回调 WECHAT_LOGIN_REDIRECT_URI(即 /api/auth/wechat/callback)。
 *
 * 可选 query:
 *   ?returnTo=/some/path  — 登录成功后重定向到该路径(默认 /)
 */
import { NextResponse, type NextRequest } from 'next/server';
import { buildAuthUrl } from '@/lib/wechat-login';
import { WECHAT_LOGIN_WEB_ENABLED } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!WECHAT_LOGIN_WEB_ENABLED) {
    return NextResponse.json(
      { error: '微信扫码登录未启用' },
      { status: 503 },
    );
  }

  const returnTo = req.nextUrl.searchParams.get('returnTo') || '/';
  const built = buildAuthUrl('web', returnTo);
  if (!built) {
    return NextResponse.json({ error: '微信登录配置缺失' }, { status: 500 });
  }
  return NextResponse.redirect(built.url);
}
