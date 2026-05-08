import { handler } from '@/lib/api';
import { locales, namespaces, defaultLocale, type Locale } from '@/i18n/config';
import fs from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-static';
export const revalidate = 3600; // 翻译几乎不变,1h 缓存

/**
 * GET /api/i18n/:locale
 * 把该 locale 下所有 namespace 合并为嵌套对象返回。
 * 若某个 namespace 文件缺失,跳过(客户端 fallback 到默认 locale)。
 */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const segs = url.pathname.split('/').filter(Boolean);
  const locale = segs[segs.length - 1] as Locale;
  const useLocale = locales.includes(locale) ? locale : defaultLocale;

  const merged: Record<string, unknown> = {};
  for (const ns of namespaces) {
    const file = path.join(process.cwd(), 'src', 'i18n', 'messages', useLocale, `${ns}.json`);
    try {
      const text = await fs.readFile(file, 'utf-8');
      const json = JSON.parse(text) as Record<string, unknown>;
      // JSON 顶级已带 namespace 前缀,直接 spread 而不再嵌套一层
      Object.assign(merged, json);
    } catch {
      // 缺失,跳过
    }
  }
  return merged;
});
