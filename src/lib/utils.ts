import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

export function formatFollowers(n: number): string {
  if (n > 999) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function timeAgo(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}秒前`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}天前`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}周前`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}个月前`;
  return `${Math.floor(d / 365)}年前`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 把以「分」为单位的金额格式化为 ¥X.XX */
export function formatPrice(cents: number, withSymbol = true): string {
  const yuan = (cents / 100).toFixed(2);
  return (withSymbol ? '¥' : '') + yuan;
}

/**
 * 根据 Board.path 拼出板块 URL。
 * 例如 path = [{slug:'xianrenzhang'},{slug:'astrophytum'}] → '/board/xianrenzhang/astrophytum'
 */
export function boardUrl(
  boardLike: { slug: string; path?: { slug: string }[] }
): string {
  if (boardLike.path && boardLike.path.length > 0) {
    return '/board/' + boardLike.path.map((p) => encodeURIComponent(p.slug)).join('/');
  }
  return '/board/' + encodeURIComponent(boardLike.slug);
}

/** 倒计时:返回 mm:ss */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
