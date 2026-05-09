/**
 * GET /api/auth/wechat/status
 *
 * 返回当前微信登录两个 scene 是否启用,前端用来决定是否渲染按钮。
 */
import { NextResponse } from 'next/server';
import {
  WECHAT_LOGIN_WEB_ENABLED,
  WECHAT_LOGIN_MP_ENABLED,
} from '@/lib/feature-flags';

export async function GET() {
  return NextResponse.json({
    web: WECHAT_LOGIN_WEB_ENABLED,
    mp: WECHAT_LOGIN_MP_ENABLED,
  });
}
