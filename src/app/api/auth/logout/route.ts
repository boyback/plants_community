import { handler } from '@/lib/api';
import { clearAuthCookie } from '@/lib/auth';

export const POST = handler(async () => {
  clearAuthCookie();
  return { ok: true };
});
