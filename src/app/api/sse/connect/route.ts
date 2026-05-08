/**
 * GET /api/sse/connect
 *
 * 建立 Server-Sent Events 长连接。客户端用原生 EventSource 即可:
 *   const es = new EventSource('/api/sse/connect');
 *   es.addEventListener('notification', (e) => ...);
 *
 * 心跳:每 30s 发送一次 ping;浏览器 EventSource 会自动重连。
 * 认证:跟其他 API 一样走 requireUser();匿名用户收到 401。
 */

import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { realtimeBus } from '@/lib/realtime/bus';

export const dynamic = 'force-dynamic';
/** 强制在 Node runtime(SSE 需要长连接) */
export const runtime = 'nodejs';

const ENCODER = new TextEncoder();
const HEARTBEAT_MS = 30_000;

export async function GET(req: NextRequest) {
  const me = await requireUser();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // 立即回一条 ready,前端 onopen 以外还能拿到 userId
      controller.enqueue(
        ENCODER.encode(
          `event: ready\ndata: ${JSON.stringify({ userId: me.id, at: Date.now() })}\n\n`,
        ),
      );

      const unsubscribe = realtimeBus.subscribe(me.id, controller);

      // 心跳
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            ENCODER.encode(
              `event: ping\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`,
            ),
          );
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, HEARTBEAT_MS);

      // 客户端 abort 时清理
      const abort = req.signal;
      abort.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* ignore */ }
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 针对 nginx 禁用 buffering
    },
  });
}
