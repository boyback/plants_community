/**
 * GET /api/auth/wechat/h5
 *
 * 微信内 H5 一键登录入口。重定向到公众号网页授权页。
 *
 * 可选 query:
 *   ?returnTo=/some/path
 */
import { NextResponse, type NextRequest } from 'next/server';
import { buildAuthUrl, isInWechat } from '@/lib/wechat-login';
import { WECHAT_LOGIN_MP_ENABLED } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!WECHAT_LOGIN_MP_ENABLED) {
    return NextResponse.json({ error: '微信公众号登录未启用' }, { status: 503 });
  }

  // 非微信内访问,引导到普通登录页
  const ua = req.headers.get('user-agent') || '';
  if (!isInWechat(ua)) {
    return NextResponse.redirect(
      new URL('/login?error=wx_h5_only_in_wechat', req.nextUrl.origin),
    );
  }

  const returnTo = req.nextUrl.searchParams.get('returnTo') || '/';
  const built = buildAuthUrl('mp', returnTo);
  if (!built) {
    return NextResponse.json({ error: '微信登录配置缺失' }, { status: 500 });
  }
  return NextResponse.redirect(built.url);
}
