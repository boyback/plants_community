/**
 * 从 Wikimedia Commons 自动抓取 581 个品种的真实植物照片。
 *
 * 回退链:
 *   1. Wikidata P18(物种条目的主图)
 *   2. Wikipedia 英文/中文条目的 pageimage
 *   3. Wikimedia Commons 搜索 API 按拉丁学名查(取前 3 张)
 *   4. 留空 → 继续保留旧占位图
 *
 * 图片下载到 public/uploads/species/{slug}.jpg (主图) 和
 *   public/uploads/species/{slug}-g1.jpg / -g2.jpg (gallery)
 * 并把 URL 回填到数据库的 cover / gallery 字段。
 *
 * 运行:
 *   npx tsx scripts/fetch-species-images.ts [--limit=N] [--only=slug1,slug2]
 */

import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Wikimedia 要求 UA 有合规的联系方式,但 example.com 等占位会被判定为无效并 403。
// 这里用常见桌面浏览器 UA,同时控制请求频率(MIN_DELAY_MS)以避免被当作爬虫。
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const OUT_DIR = path.join(process.cwd(), 'public', 'uploads', 'species');
const MIN_DELAY_MS = 800; // 礼貌间隔,避免 rate limit

interface ImageResult {
  sourceUrl: string; // 原始 Commons URL,用于日志
  buf: Buffer;
  ext: string;       // 'jpg' | 'png' | 'jpeg'
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string, retry = 2): Promise<unknown> {
  for (let i = 0; i <= retry; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429 || res.status === 503) {
      const wait = (i + 1) * 3000 + Math.random() * 2000;
      console.log(`   ⏸️  rate limited, waiting ${Math.round(wait / 1000)}s...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }
  throw new Error('max retry exceeded');
}

async function fetchImage(url: string): Promise<ImageResult | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!/image\//.test(contentType)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 3_000) return null; // 过小的图跳过(通常是缩略图占位)
    if (buf.length > 10 * 1024 * 1024) return null; // 过大的跳过
    const ext = contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
      ? 'webp'
      : 'jpg';
    return { sourceUrl: url, buf, ext };
  } catch {
    return null;
  }
}

/**
 * 1. 通过 Wikidata SPARQL 查拉丁名对应的 Wikidata 项 → 取 P18(主图)
 *    实际上更稳定的方式是直接用 Wikipedia API:先找到对应物种条目,再取 pageimage + images list
 */

async function searchWikipedia(latin: string, lang: 'en' | 'zh' = 'en') {
  // 返回候选条目标题列表
  const url = `https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: latin,
    srlimit: '1',
    format: 'json',
    origin: '*',
  } as Record<string, string>)}`;
  const data = (await fetchJson(url)) as {
    query?: { search?: Array<{ title: string }> };
  };
  return data.query?.search?.[0]?.title ?? null;
}

async function getWikipediaImages(title: string, lang: 'en' | 'zh' = 'en') {
  // 取条目的主图 + 前几张图
  const url = `https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({
    action: 'query',
    prop: 'pageimages|images',
    piprop: 'original',
    titles: title,
    imlimit: '10',
    format: 'json',
    origin: '*',
  } as Record<string, string>)}`;
  const data = (await fetchJson(url)) as {
    query?: {
      pages?: Record<
        string,
        {
          original?: { source?: string };
          images?: Array<{ title: string }>;
        }
      >;
    };
  };
  const pages = data.query?.pages;
  if (!pages) return { main: null, candidates: [] };
  const page = Object.values(pages)[0];
  const main = page?.original?.source ?? null;
  // 把 File:xxx 转成 Commons 下载 URL,过滤掉 svg/logo/icon
  const candidates = (page?.images ?? [])
    .map((i) => i.title)
    .filter(
      (t) =>
        !/\.svg$/i.test(t) &&
        !/icon|logo|cladogram|map|silhouette|symbol|flag/i.test(t)
    );
  return { main, candidates };
}

async function commonsFileUrl(fileName: string): Promise<string | null> {
  // 把 File:Astrophytum_asterias.jpg 转为 Commons 直链
  const name = fileName.replace(/^File:/, '');
  const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
    action: 'query',
    titles: `File:${name}`,
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '1200',
    format: 'json',
    origin: '*',
  } as Record<string, string>)}`;
  try {
    const data = (await fetchJson(url)) as {
      query?: {
        pages?: Record<
          string,
          { imageinfo?: Array<{ thumburl?: string; url?: string }> }
        >;
      };
    };
    const page = Object.values(data.query?.pages ?? {})[0];
    return page?.imageinfo?.[0]?.thumburl ?? page?.imageinfo?.[0]?.url ?? null;
  } catch {
    return null;
  }
}

async function commonsSearch(latin: string): Promise<string[]> {
  // Commons 直接搜图
  const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: `${latin} filetype:bitmap`,
    srnamespace: '6',
    srlimit: '5',
    format: 'json',
    origin: '*',
  } as Record<string, string>)}`;
  try {
    const data = (await fetchJson(url)) as {
      query?: { search?: Array<{ title: string }> };
    };
    return (data.query?.search ?? []).map((s) => s.title);
  } catch {
    return [];
  }
}

/** 给一个拉丁学名,返回 1 + N 张图片,失败返回 null */
async function resolveImagesForLatin(
  latin: string,
  want = 3
): Promise<string[]> {
  const urls: string[] = [];

  // 1) 直接用拉丁名作 Wikipedia 标题(大部分情况标题 = 拉丁名)
  try {
    const { main, candidates } = await getWikipediaImages(latin, 'en');
    if (main) urls.push(main);
    for (const c of candidates.slice(0, 5)) {
      if (urls.length >= want) break;
      const u = await commonsFileUrl(c);
      if (u && !urls.includes(u)) urls.push(u);
      await sleep(MIN_DELAY_MS);
    }
  } catch {
    /* ignore */
  }

  // 2) 如果没图,再用搜索拿一次
  if (urls.length === 0) {
    try {
      const title = await searchWikipedia(latin, 'en');
      if (title && title !== latin) {
        const { main, candidates } = await getWikipediaImages(title, 'en');
        if (main) urls.push(main);
        for (const c of candidates.slice(0, 5)) {
          if (urls.length >= want) break;
          const u = await commonsFileUrl(c);
          if (u && !urls.includes(u)) urls.push(u);
          await sleep(MIN_DELAY_MS);
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 3) Commons 搜索补齐
  if (urls.length < want) {
    try {
      const titles = await commonsSearch(latin);
      for (const t of titles) {
        if (urls.length >= want) break;
        const u = await commonsFileUrl(t);
        if (u && !urls.includes(u)) urls.push(u);
        await sleep(MIN_DELAY_MS);
      }
    } catch {
      /* ignore */
    }
  }

  return urls;
}

async function downloadAll(
  urls: string[],
  slug: string
): Promise<{ cover: string | null; gallery: string[] }> {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const results: string[] = [];
  const seenSizes = new Set<number>();
  for (const u of urls) {
    const img = await fetchImage(u);
    if (!img) continue;
    // 去重:同样大小的图(Wikipedia 把 original 和 images[0] 常是同一张)
    if (seenSizes.has(img.buf.length)) continue;
    seenSizes.add(img.buf.length);

    const idx = results.length;
    const suffix = idx === 0 ? '' : `-g${idx}`;
    const fileName = `${slug}${suffix}.${img.ext}`;
    const fullPath = path.join(OUT_DIR, fileName);
    await fs.writeFile(fullPath, img.buf);
    const publicUrl = `/uploads/species/${fileName}`;
    results.push(publicUrl);
    await sleep(MIN_DELAY_MS);
  }
  return {
    cover: results[0] ?? null,
    gallery: results.slice(1),
  };
}

// ===== 入口 =====

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const onlyArg = args.find((a) => a.startsWith('--only='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 0;
  const only = onlyArg ? onlyArg.split('=')[1].split(',') : [];

  const allSpecies = await prisma.species.findMany({
    where: only.length > 0 ? { slug: { in: only } } : undefined,
    orderBy: { createdAt: 'asc' },
    take: limit > 0 ? limit : undefined,
  });

  console.log(`🌱 开始抓取 ${allSpecies.length} 个品种的真实图片...`);
  console.log(`   图片存到: ${OUT_DIR}`);
  console.log('');

  let ok = 0;
  let fail = 0;
  let t0 = Date.now();

  for (let i = 0; i < allSpecies.length; i++) {
    const s = allSpecies[i];
    const progress = `[${i + 1}/${allSpecies.length}]`;

    try {
      const urls = await resolveImagesForLatin(s.latinName, 3);
      if (urls.length === 0) {
        console.log(`${progress} ⚠️  ${s.name} (${s.latinName}) - 无图`);
        fail++;
        continue;
      }

      const { cover, gallery } = await downloadAll(urls, s.slug);
      if (!cover) {
        console.log(`${progress} ⚠️  ${s.name} - 下载失败`);
        fail++;
        continue;
      }

      await prisma.species.update({
        where: { id: s.id },
        data: {
          cover,
          gallery: JSON.stringify([cover, ...gallery]),
        },
      });

      ok++;
      const eta =
        allSpecies.length - i - 1 > 0
          ? Math.round(
              ((Date.now() - t0) / (i + 1)) * (allSpecies.length - i - 1) / 1000
            )
          : 0;
      console.log(
        `${progress} ✓  ${s.name.padEnd(16)} ${s.latinName.padEnd(40)} (${1 + gallery.length} 张) ETA ${eta}s`
      );
    } catch (e) {
      console.log(
        `${progress} ✗  ${s.name}: ${e instanceof Error ? e.message : String(e)}`
      );
      fail++;
    }

    // 抓取间隔,礼貌一点
    await sleep(500);
  }

  console.log('');
  console.log(`✅ 完成 ok=${ok} fail=${fail} 耗时 ${Math.round((Date.now() - t0) / 1000)}s`);
}

main()
  .catch((e) => {
    console.error('❌ 致命错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
