/**
 * GET /api/email/unsubscribe?token=xxx
 *
 * 一键取消邮件订阅。token 由 lib/email-unsubscribe 生成。
 * 验通过 → 把 user.emailUnsubscribed = true → 返回友好的 HTML 提示页。
 *
 * 故意用 GET + 友好页面(不是 JSON),因为大多数邮件客户端只能链接 GET。
 */
import { prisma } from '@/lib/db';
import { verifyUnsubscribeToken } from '@/lib/email-unsubscribe';

export const dynamic = 'force-dynamic';

function htmlPage(title: string, body: string): Response {
  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title>
<style>
  body{margin:0;padding:48px 16px;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;background:#f7faf5;color:#333}
  .card{max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:36px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.04)}
  h1{margin:0 0 12px;font-size:22px;color:#459c67}
  p{margin:0 0 8px;line-height:1.7;color:#555}
  a{color:#459c67;text-decoration:none}
</style></head>
<body><div class="card">${body}</div></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  const userId = await verifyUnsubscribeToken(token);

  if (!userId) {
    return htmlPage(
      '链接无效',
      `<h1>🌿</h1><p>取消订阅链接无效或已过期。</p><p><a href="/">回到植友圈首页</a></p>`,
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailUnsubscribed: true },
  });

  return htmlPage(
    '已取消订阅',
    `<h1>✓ 已取消订阅</h1>
     <p>之后不会再收到植友圈的营销邮件。</p>
     <p>(账户验证、密码找回等关键邮件仍会发送)</p>
     <p style="margin-top:20px"><a href="/settings/profile">回到设置</a> · <a href="/">回首页</a></p>`,
  );
}
