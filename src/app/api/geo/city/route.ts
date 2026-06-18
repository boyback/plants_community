import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type GeoPayload = {
  city: string | null;
  debug?: {
    source: string;
    reason?: string;
    ip?: string | null;
  };
};

const CITY_HEADERS = [
  'x-vercel-ip-city',
  'cf-ipcity',
  'x-geo-city',
  'x-app-city',
  'x-city',
];

export const GET = handler(async (req): Promise<GeoPayload> => {
  const debug = new URL(req.url).searchParams.get('debug') === '1';
  const cityFromHeader = readCityHeader(req.headers);
  if (cityFromHeader) {
    return withDebug({ city: cityFromHeader }, debug, { source: 'header' });
  }

  const ip = getClientIp(req.headers);
  if (!ip) {
    return withDebug({ city: null }, debug, { source: 'ip', reason: 'missing-ip', ip: null });
  }
  if (isLocalIp(ip) || isPrivateIp(ip)) {
    return withDebug({ city: null }, debug, { source: 'ip', reason: 'local-or-private-ip', ip: maskIp(ip) });
  }

  const result = await resolveCityByIp(ip);
  return withDebug(
    { city: result.city },
    debug,
    { source: result.source, reason: result.reason, ip: maskIp(ip) },
  );
});

function readCityHeader(headers: Headers) {
  for (const key of CITY_HEADERS) {
    const value = normalizeCity(headers.get(key));
    if (value) return value;
  }
  return null;
}

function getClientIp(headers: Headers) {
  const candidates = [
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('x-forwarded-for')?.split(',')[0],
    headers.get('x-client-ip'),
  ];

  for (const candidate of candidates) {
    const ip = normalizeIp(candidate);
    if (ip) return ip;
  }
  return null;
}

function normalizeIp(raw: string | null | undefined) {
  const value = raw?.trim();
  if (!value) return null;
  if (value.startsWith('[')) return value.slice(1, value.indexOf(']'));
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value)) return value.split(':')[0];
  return value;
}

function isLocalIp(ip: string) {
  return ip === '::1' || ip === '127.0.0.1' || ip === 'localhost';
}

function isPrivateIp(ip: string) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) return false;
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

async function resolveCityByIp(ip: string): Promise<{ city: string | null; source: string; reason?: string }> {
  const endpoints = [
    process.env.IP_GEO_CITY_ENDPOINT,
    `https://qifu-api.baidubce.com/ip/geo/v1/district?ip=${encodeURIComponent(ip)}`,
    `https://ipwho.is/${encodeURIComponent(ip)}?lang=zh-CN`,
    `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
  ].filter((item): item is string => Boolean(item));

  let lastReason = 'empty-city';
  for (const endpoint of endpoints) {
    const url = endpoint.includes('{ip}') ? endpoint.replace('{ip}', encodeURIComponent(ip)) : endpoint;
    const source = new URL(url).hostname;
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        lastReason = `http-${res.status}`;
        continue;
      }

      const payload = await res.json().catch(() => null);
      const city = parseCityPayload(payload);
      if (city) return { city, source };
      lastReason = 'empty-city';
    } catch (error) {
      lastReason = error instanceof Error ? error.name : 'fetch-failed';
    }
  }

  return { city: null, source: 'resolver', reason: lastReason };
}

function parseCityPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const data = typeof record.data === 'object' && record.data ? record.data as Record<string, unknown> : record;
  return normalizeCity(
    data.city ??
      data.cityName ??
      data.regionName ??
      data.region ??
      data.province ??
      data.prov,
  );
}

function withDebug(payload: GeoPayload, debug: boolean, info: NonNullable<GeoPayload['debug']>) {
  return debug ? { ...payload, debug: info } : payload;
}

function maskIp(ip: string | null) {
  if (!ip) return null;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  }
  return ip.replace(/:[^:]*$/, ':x');
}

function normalizeCity(raw: unknown) {
  if (typeof raw !== 'string') return null;
  const value = safeDecode(raw).trim();
  if (!value || value === '-' || value.toLowerCase() === 'unknown') return null;
  return value.replace(/市$/, '').slice(0, 40);
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
