/**
 * GET /api/auth/wechat/h5/callback
 *
 * 公众号网页授权回调。
 */
import { NextResponse, type NextRequest } from 'next/server';
import { handleWechatCallback, upsertUserFromWechat, verifyState } from '@/lib/wechat-login';
import { setAuthCookie, signToken } from '@/lib/auth';
import { WECHAT_LOGIN_MP_ENABLED } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!WECHAT_LOGIN_MP_ENABLED) {
    return NextResponse.json({ error: '微信公众号登录未启用' }, { status: 503 });
  }

  const code = req.nextUrl.searchParams.get('code') || '';
  const state = req.nextUrl.searchParams.get('state') || '';
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/login?error=wx_invalid_callback', req.nextUrl.origin),
    );
  }

  const stateInfo = verifyState(state);
  if (!stateInfo || stateInfo.scene !== 'mp') {
    return NextResponse.redirect(
      new URL('/login?error=wx_state_invalid', req.nextUrl.origin),
    );
  }

  try {
    const result = await handleWechatCallback('mp', code);
    const userId = await upsertUserFromWechat(result);
    const token = await signToken({ userId });
    setAuthCookie(token);
    return NextResponse.redirect(new URL(stateInfo.returnTo, req.nextUrl.origin));
  } catch (e) {
    console.error('[wechat h5 callback] failed:', e);
    return NextResponse.redirect(
      new URL('/login?error=wx_exchange_failed', req.nextUrl.origin),
    );
  }
}
