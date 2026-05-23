export function loadLocalJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveLocalJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can fail in private mode or when quota is exceeded.
  }
}

export function isJsonDifferent(a: unknown, b: unknown) {
  return JSON.stringify(a) !== JSON.stringify(b);
}
