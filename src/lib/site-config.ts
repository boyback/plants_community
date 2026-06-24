/**
 * 站点全局配置读写。
 *
 * - 数据存在 SiteConfig 表 (key/value JSON 字符串)
 * - 内存缓存 60s,避免每个请求都 hit DB
 * - 不存在时回退到 DEFAULTS
 */
import { prisma } from './db';

/** 全部已知 key 的默认值 + 类型 */
export interface SiteConfigShape {
  /** 上传现场照所需最低用户等级(1-10) */
  photoUploadMinLevel: number;
  /** 'auto' 上传即发布;'manual' 上传后需管理员审核 */
  photoModeration: 'auto' | 'manual';
}

export const SITE_CONFIG_DEFAULTS: SiteConfigShape = {
  photoUploadMinLevel: 3,
  photoModeration: 'auto',
};

const TTL_MS = 60_000;
let cache: { at: number; value: SiteConfigShape } | null = null;

/** 读取一份完整配置(已合并默认值) */
export async function getSiteConfig(force = false): Promise<SiteConfigShape> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const rows = await prisma.siteConfig.findMany().catch(() => [] as { key: string; value: string }[]);
  const merged: SiteConfigShape = { ...SITE_CONFIG_DEFAULTS };
  for (const r of rows) {
    if (!(r.key in merged)) continue;
    try {
      const v = JSON.parse(r.value);
      // 简单类型校验
      if (
        r.key === 'photoUploadMinLevel' &&
        typeof v === 'number' &&
        v >= 1 &&
        v <= 10
      ) {
        merged.photoUploadMinLevel = v;
      } else if (
        r.key === 'photoModeration' &&
        (v === 'auto' || v === 'manual')
      ) {
        merged.photoModeration = v;
      }
    } catch {
      // ignore
    }
  }
  cache = { at: Date.now(), value: merged };
  return merged;
}

/** 批量更新配置(管理员)*/
export async function setSiteConfig(
  patch: Partial<SiteConfigShape>
): Promise<SiteConfigShape> {
  const entries = Object.entries(patch);
  for (const [k, v] of entries) {
    if (v === undefined) continue;
    await prisma.siteConfig.upsert({
      where: { key: k },
      create: { key: k, value: JSON.stringify(v) },
      update: { value: JSON.stringify(v) },
    });
  }
  cache = null;
  return getSiteConfig(true);
}

/** 用于权限判断:当前用户是否有上传现场照的资格 */
export function canUploadSpeciesPhoto(
  user: { level: number } | null,
  cfg: SiteConfigShape
): { ok: true } | { ok: false; reason: string } {
  if (!user) return { ok: false, reason: '请先登录' };
  if (user.level < cfg.photoUploadMinLevel) {
    return {
      ok: false,
      reason: `等级 Lv.${cfg.photoUploadMinLevel} 才能上传现场照`,
    };
  }
  return { ok: true };
}
