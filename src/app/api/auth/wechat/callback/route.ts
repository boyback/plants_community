/**
 * GET /api/auth/wechat/callback
 *
 * PC 扫码登录回调。微信会带 ?code=xx&state=xx 跳回。
 * 流程:
 *   1. 校验 state 防 CSRF
 *   2. code → access_token → userinfo
 *   3. upsert User(unionid 优先,scene openid 回退)
 *   4. 签 JWT cookie
 *   5. 跳回 returnTo
 */
import { NextResponse, type NextRequest } from 'next/server';
import { handleWechatCallback, upsertUserFromWechat, verifyState } from '@/lib/wechat-login';
import { setAuthCookie, signToken } from '@/lib/auth';
import { WECHAT_LOGIN_WEB_ENABLED } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!WECHAT_LOGIN_WEB_ENABLED) {
    return NextResponse.json({ error: '微信扫码登录未启用' }, { status: 503 });
  }

  const code = req.nextUrl.searchParams.get('code') || '';
  const state = req.nextUrl.searchParams.get('state') || '';
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/login?error=wx_invalid_callback', req.nextUrl.origin),
    );
  }

  const stateInfo = verifyState(state);
  if (!stateInfo || stateInfo.scene !== 'web') {
    return NextResponse.redirect(
      new URL('/login?error=wx_state_invalid', req.nextUrl.origin),
    );
  }

  try {
    const result = await handleWechatCallback('web', code);
    const userId = await upsertUserFromWechat(result);
    const token = await signToken({ userId });
    setAuthCookie(token);
    return NextResponse.redirect(new URL(stateInfo.returnTo, req.nextUrl.origin));
  } catch (e) {
    console.error('[wechat callback] failed:', e);
    return NextResponse.redirect(
      new URL('/login?error=wx_exchange_failed', req.nextUrl.origin),
    );
  }
}
