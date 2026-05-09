/**
 * 管理员:上传 driver 健康检查
 *
 * GET /api/admin/upload-driver/ping
 *
 * 返回:
 *   {
 *     driver: 'local' | 'qiniu',
 *     ok: boolean,
 *     details: {...}, // local: 路径是否可写;qiniu: 上传一个 1 字节文件再删
 *     error?: string
 *   }
 */
import { promises as fs } from 'fs';
import path from 'path';
import { handler } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import {
  getUploadDriver,
  isRemoteDriver,
} from '@/lib/upload';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  await requireAdmin({ allowModerator: true });

  const driverName = (process.env.UPLOAD_DRIVER ?? 'local').toLowerCase();
  const remote = isRemoteDriver();

  if (!remote) {
    // 本地驱动:测试 public/uploads 是否可写
    const testKey = `_health_${Date.now()}.txt`;
    try {
      const driver = getUploadDriver();
      const url = await driver.put(testKey, Buffer.from('ok'), 'text/plain');
      // 立刻删掉
      await driver.delete?.(testKey).catch(() => null);
      // 同时 fs 检查
      const root = path.join(process.cwd(), 'public', 'uploads');
      const stat = await fs.stat(root).catch(() => null);
      return {
        driver: 'local' as const,
        ok: true,
        details: {
          rootDir: root,
          rootExists: !!stat,
          testWriteUrl: url,
        },
      };
    } catch (e) {
      return {
        driver: 'local' as const,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // 远程(七牛)驱动:env 完整性检查 + put/delete 一个测试对象
  const requiredEnv = [
    'QINIU_ACCESS_KEY',
    'QINIU_SECRET_KEY',
    'QINIU_BUCKET',
    'QINIU_DOMAIN',
  ] as const;
  const missing = requiredEnv.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return {
      driver: driverName,
      ok: false,
      error: `缺少环境变量:${missing.join(', ')}`,
    };
  }

  const testKey = `_health/${Date.now()}_ping.txt`;
  try {
    const driver = getUploadDriver();
    const url = await driver.put(testKey, Buffer.from('ok'), 'text/plain');
    // 验证下载得到内容
    const verifyOk = await fetch(url).then(async (r) => {
      if (!r.ok) return false;
      const t = await r.text();
      return t === 'ok';
    }).catch(() => false);
    // 清理
    await driver.delete?.(testKey).catch(() => null);
    return {
      driver: driverName,
      ok: verifyOk,
      details: {
        bucket: process.env.QINIU_BUCKET,
        domain: process.env.QINIU_DOMAIN,
        region: process.env.QINIU_REGION ?? 'z0',
        testUrl: url,
        downloadVerified: verifyOk,
      },
      ...(verifyOk
        ? {}
        : { error: '上传成功但 URL 不可访问 — 请检查域名 CNAME / SSL / 是否已绑定到 bucket' }),
    };
  } catch (e) {
    return {
      driver: driverName,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
});
