/**
 * 服务端:直接从磁盘读取翻译 JSON,供 SSR 使用。
 *
 * 客户端请走 /api/i18n/:locale 接口(本文件不能在浏览器里运行,因为用了 fs)。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { namespaces, type Locale } from './config';

type Messages = Record<string, unknown>;

// 进程内缓存 — Next.js dev 的 hot-reload 会清掉模块,无需额外 TTL
const cache = new Map<Locale, Messages>();

export async function loadLocaleMessagesServer(locale: Locale): Promise<Messages> {
  const cached = cache.get(locale);
  if (cached) return cached;

  const merged: Record<string, unknown> = {};
  for (const ns of namespaces) {
    const file = path.join(process.cwd(), 'src', 'i18n', 'messages', locale, `${ns}.json`);
    try {
      const text = await fs.readFile(file, 'utf-8');
      const json = JSON.parse(text) as Record<string, unknown>;
      // JSON 文件顶级本身就以 namespace 名起头(如 nav.json 里是 {"nav": {...}}),
      // 直接 spread 展开到 merged,避免双层包装导致 t('nav.home') 查不到。
      Object.assign(merged, json);
    } catch {
      // 缺失 namespace 不是致命错,跳过
    }
  }
  cache.set(locale, merged);
  return merged;
}
