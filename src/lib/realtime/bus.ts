/**
 * 进程内 Realtime EventBus。
 *
 * 当前实现故意简单:Map<userId, Set<WriteController>>。每个 /api/sse/connect 请求
 * 在响应流里注册一个 controller,事件通过 controller.enqueue(String) 推送。
 *
 * 若未来要多机,这一层可以换成 Redis Pub/Sub / NATS,外部 API 不变。
 */

/** 推给前端的事件 type(前端 useRealtime 需要一一对应) */
export type RealtimeEventType =
  | 'ping'             // 心跳,30s 一次
  | 'notification'     // 收到一条新通知
  | 'message'          // 收到一条新私信
  | 'notification.read' // 通知已读(多端同步)
  | 'message.read';    // 私信已读(多端同步)

export interface RealtimeEvent {
  type: RealtimeEventType;
  /** 事件产生时间戳(ms) */
  at: number;
  /** 业务数据,前端自行解析 */
  data?: unknown;
}

type Controller = ReadableStreamDefaultController<Uint8Array>;

class RealtimeBus {
  private subscribers = new Map<string, Set<Controller>>();

  /** 订阅指定用户的事件流 */
  subscribe(userId: string, controller: Controller): () => void {
    let set = this.subscribers.get(userId);
    if (!set) {
      set = new Set();
      this.subscribers.set(userId, set);
    }
    set.add(controller);
    return () => {
      const s = this.subscribers.get(userId);
      s?.delete(controller);
      if (s && s.size === 0) this.subscribers.delete(userId);
    };
  }

  /** 推送事件给单个用户(若其没有活跃连接,静默丢弃) */
  publish(userId: string, ev: RealtimeEvent): void {
    const set = this.subscribers.get(userId);
    if (!set || set.size === 0) return;
    const payload = formatSseEvent(ev);
    for (const ctrl of set) {
      try {
        ctrl.enqueue(payload);
      } catch {
        set.delete(ctrl);
      }
    }
  }

  /** 推给多个用户 */
  broadcast(userIds: Iterable<string>, ev: RealtimeEvent): void {
    for (const uid of userIds) this.publish(uid, ev);
  }

  /** 当前在线用户数(运维 / 测试用) */
  onlineUsers(): number {
    return this.subscribers.size;
  }

  connectionCount(): number {
    let n = 0;
    for (const set of this.subscribers.values()) n += set.size;
    return n;
  }
}

/**
 * SSE 格式:
 *   event: <type>\n
 *   data: <json>\n\n
 */
function formatSseEvent(ev: RealtimeEvent): Uint8Array {
  const body = JSON.stringify({ at: ev.at, data: ev.data ?? null });
  const text = `event: ${ev.type}\ndata: ${body}\n\n`;
  return new TextEncoder().encode(text);
}

// Next.js dev 模式会 HMR 重建模块 → 用 global 缓存保证事件总线单例
declare global {
  // eslint-disable-next-line no-var
  var __rouyou_realtime_bus: RealtimeBus | undefined;
}
export const realtimeBus: RealtimeBus = globalThis.__rouyou_realtime_bus ?? new RealtimeBus();
if (!globalThis.__rouyou_realtime_bus) globalThis.__rouyou_realtime_bus = realtimeBus;
