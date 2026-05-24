export function formatPrice(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function stripHtml(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, '').trim();
}
