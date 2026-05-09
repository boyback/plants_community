/**
 * 微信登录 SDK 封装
 *
 * 支持两套:
 *   1. 开放平台「网站应用」  — PC 扫码登录
 *      - scope: snsapi_login
 *      - 入口:redirectToQrLogin(state)
 *   2. 公众号「网页授权」     — 微信内 H5 一键登录
 *      - scope: snsapi_userinfo (要拿昵称头像)
 *      - 入口:redirectToMpAuth(state)
 *
 * 共用 code → access_token → userinfo 三步链。
 *
 * 关键点:
 *   - state 用 httpOnly cookie 双写防 CSRF
 *   - userinfo 拿 unionid 必备(同主体跨 App 串号)
 *   - 头像 URL 几小时失效,callback 拿到后异步落 OSS(后续步骤实现)
 */
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';

// ============================================================
// 配置
// ============================================================

export type WxLoginScene = 'web' | 'mp';

interface WxConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scope: 'snsapi_login' | 'snsapi_userinfo' | 'snsapi_base';
  /** 微信对应授权页 host */
  authHost: string;
}

function getConfig(scene: WxLoginScene): WxConfig | null {
  if (scene === 'web') {
    const appId = process.env.WECHAT_LOGIN_APP_ID || '';
    const appSecret = process.env.WECHAT_LOGIN_APP_SECRET || '';
    const redirectUri = process.env.WECHAT_LOGIN_REDIRECT_URI || '';
    if (!appId || !appSecret) return null;
    return {
      appId,
      appSecret,
      redirectUri,
      scope: 'snsapi_login',
      authHost: 'https://open.weixin.qq.com',
    };
  }
  // mp
  const appId = process.env.WECHAT_MP_APP_ID || '';
  const appSecret = process.env.WECHAT_MP_APP_SECRET || '';
  const redirectUri = process.env.WECHAT_MP_REDIRECT_URI || '';
  if (!appId || !appSecret) return null;
  return {
    appId,
    appSecret,
    redirectUri,
    scope: 'snsapi_userinfo', // 必须 userinfo 才能拿昵称头像 unionid
    authHost: 'https://open.weixin.qq.com',
  };
}

// ============================================================
// 授权 URL 构造
// ============================================================

const STATE_COOKIE = 'wx_oauth_state';
const STATE_MAX_AGE = 10 * 60; // 10 分钟内必须完成回调,否则失效

/**
 * 生成 state 并写入 cookie,返回授权 URL。
 * 调用方:在 GET /api/auth/wechat/qrcode 中 redirect 到此 URL。
 *
 * 微信网站应用扫码授权 URL:
 *   https://open.weixin.qq.com/connect/qrconnect?appid=xx&redirect_uri=xx&response_type=code&scope=snsapi_login&state=xx#wechat_redirect
 *
 * 公众号 H5 授权 URL:
 *   https://open.weixin.qq.com/connect/oauth2/authorize?appid=xx&redirect_uri=xx&response_type=code&scope=snsapi_userinfo&state=xx#wechat_redirect
 */
export function buildAuthUrl(scene: WxLoginScene, returnTo = '/'): { url: string; state: string } | null {
  const cfg = getConfig(scene);
  if (!cfg) return null;

  const state = randomBytes(16).toString('hex');

  // state cookie 用 httpOnly + 短过期 防 CSRF
  cookies().set(STATE_COOKIE, JSON.stringify({ s: state, scene, returnTo }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: STATE_MAX_AGE,
  });

  const path =
    scene === 'web' ? '/connect/qrconnect' : '/connect/oauth2/authorize';
  const params = new URLSearchParams({
    appid: cfg.appId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: cfg.scope,
    state,
  });

  return {
    url: `${cfg.authHost}${path}?${params.toString()}#wechat_redirect`,
    state,
  };
}

/** 校验 callback 收到的 state 与 cookie 一致;返回 scene + returnTo */
export function verifyState(receivedState: string): {
  scene: WxLoginScene;
  returnTo: string;
} | null {
  const raw = cookies().get(STATE_COOKIE)?.value;
  if (!raw) return null;
  cookies().delete(STATE_COOKIE);
  try {
    const parsed = JSON.parse(raw) as { s: string; scene: WxLoginScene; returnTo: string };
    if (parsed.s !== receivedState) return null;
    return { scene: parsed.scene, returnTo: parsed.returnTo || '/' };
  } catch {
    return null;
  }
}

// ============================================================
// code 换 access_token / 拉用户信息
// ============================================================

interface WxAccessToken {
  access_token: string;
  expires_in: number; // 秒
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WxUserInfo {
  openid: string;
  unionid?: string;
  nickname: string;
  sex: number;
  language?: string;
  city?: string;
  province?: string;
  country?: string;
  headimgurl: string;
  privilege?: string[];
  errcode?: number;
  errmsg?: string;
}

export interface WxLoginResult {
  scene: WxLoginScene;
  openid: string;
  unionid?: string;
  nickname: string;
  avatarUrl: string;
  raw: WxUserInfo;
}

/** 用 code 换 access_token + openid */
async function exchangeCode(scene: WxLoginScene, code: string): Promise<WxAccessToken> {
  const cfg = getConfig(scene);
  if (!cfg) throw new Error(`微信登录(${scene})未配置`);

  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${cfg.appId}&secret=${cfg.appSecret}&code=${encodeURIComponent(code)}&grant_type=authorization_code`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = (await res.json()) as WxAccessToken;
  if (data.errcode) {
    throw new Error(`exchange code failed: [${data.errcode}] ${data.errmsg}`);
  }
  return data;
}

/** 用 access_token + openid 拉 userinfo */
async function fetchUserInfo(token: string, openid: string): Promise<WxUserInfo> {
  const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${token}&openid=${openid}&lang=zh_CN`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = (await res.json()) as WxUserInfo;
  if (data.errcode) {
    throw new Error(`fetch userinfo failed: [${data.errcode}] ${data.errmsg}`);
  }
  return data;
}

/**
 * callback 主函数:code → access_token → userinfo,
 * 返回标准化字段供路由层 upsert User
 */
export async function handleWechatCallback(
  scene: WxLoginScene,
  code: string
): Promise<WxLoginResult> {
  const token = await exchangeCode(scene, code);
  // PC 扫码 scope 默认 snsapi_login,无 unionid,得拉 userinfo
  // H5 scope=snsapi_userinfo 同样拉 userinfo
  const info = await fetchUserInfo(token.access_token, token.openid);
  return {
    scene,
    openid: info.openid,
    unionid: info.unionid || token.unionid,
    nickname: info.nickname || '微信用户',
    avatarUrl: info.headimgurl || '',
    raw: info,
  };
}

// ============================================================
// 工具
// ============================================================

/** 微信内 UA 检测(后端用,Header User-Agent) */
export function isInWechat(userAgent: string): boolean {
  return /micromessenger/i.test(userAgent);
}

// ============================================================
// upsert 用户
// ============================================================

import { prisma } from './db';

/**
 * 根据微信回调结果 upsert 用户。
 * 优先按 unionid 查;无 unionid 时按当前 scene 的 openid 查;
 * 找不到则创建新用户(自动生成不冲突的 name)。
 *
 * 返回 user.id 供签 JWT。
 */
export async function upsertUserFromWechat(result: WxLoginResult): Promise<string> {
  const { scene, openid, unionid, nickname, avatarUrl } = result;
  const openidField = scene === 'web' ? 'wxOpenidWebsite' : 'wxOpenidMp';

  // 1) 按 unionid 查(最优先,跨 App 统一身份)
  if (unionid) {
    const byUnion = await prisma.user.findUnique({ where: { wxUnionId: unionid } });
    if (byUnion) {
      // 顺便回填本次 scene 的 openid
      if (!(byUnion as Record<string, unknown>)[openidField]) {
        await prisma.user.update({
          where: { id: byUnion.id },
          data: { [openidField]: openid },
        });
      }
      return byUnion.id;
    }
  }

  // 2) 按当前 scene openid 查
  const byOpenid = await prisma.user.findFirst({
    where: { [openidField]: openid },
  });
  if (byOpenid) {
    if (unionid && !byOpenid.wxUnionId) {
      await prisma.user.update({
        where: { id: byOpenid.id },
        data: { wxUnionId: unionid },
      });
    }
    return byOpenid.id;
  }

  // 3) 新建
  const name = await generateUniqueName(nickname);
  const created = await prisma.user.create({
    data: {
      name,
      passwordHash: null,
      avatar: avatarUrl, // 先落原微信 URL,后台异步抓存到 OSS
      bio: '',
      wxUnionId: unionid || null,
      [openidField]: openid,
    },
  });

  // fire-and-forget 抓头像 → OSS,不阻塞登录链路
  if (avatarUrl) {
    void persistWechatAvatarAsync(created.id, avatarUrl).catch((err) => {
      console.warn('[wechat] persist avatar failed:', err);
    });
  }
  return created.id;
}

/**
 * 抓取微信头像到 OSS,更新用户 avatar 字段。
 * 微信原 URL 几小时后失效,必须落库。
 */
async function persistWechatAvatarAsync(userId: string, srcUrl: string): Promise<void> {
  // 动态 import 避免在登录路径下引入 sharp/qiniu 等大依赖的冷启动
  const { getUploadDriver } = await import('./upload');
  const res = await fetch(srcUrl, { cache: 'no-store' });
  if (!res.ok) return;
  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  // 微信头像通常是 jpeg
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  const key = `avatars/wx/${userId}-${Date.now()}.${ext}`;
  const driver = getUploadDriver();
  const url = await driver.put(key, buf, contentType);
  await prisma.user.update({
    where: { id: userId },
    data: { avatar: url },
  });
}

/** 生成不冲突的 name:优先用昵称,冲突则追加随机 4 位 */
async function generateUniqueName(nickname: string): Promise<string> {
  // 微信昵称可能含 emoji + 特殊字符,清洗一下
  let base = (nickname || '').trim().slice(0, 16) || '微信用户';
  // 先尝试原样
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}_${randomBytes(2).toString('hex')}`;
    const exist = await prisma.user.findUnique({ where: { name: candidate } });
    if (!exist) return candidate;
  }
  // 兜底
  return `wx_${randomBytes(5).toString('hex')}`;
}
