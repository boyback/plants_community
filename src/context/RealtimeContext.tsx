'use client';

/**
 * Realtime(SSE)Provider / useRealtime hook。
 *
 * - 登录后自动连接 /api/sse/connect
 * - 断线 2s 重试(指数退避,上限 30s)
 * - 页面隐藏时停止重连,恢复可见立即重连
 * - subscribe(type, fn) 注册回调,组件卸载时自动清理
 *
 * 不维护业务状态(通知 / 私信列表),只提供事件流;
 * 具体组件(Header 徽标 / 私信页)自行 subscribe 后更新本地状态。
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

type EventType =
  | 'ready'
  | 'ping'
  | 'notification'
  | 'message'
  | 'notification.read'
  | 'message.read';

export interface RealtimePayload {
  at: number;
  data: unknown;
}

type Handler = (payload: RealtimePayload) => void;

interface RealtimeCtx {
  /** 当前 ES 状态 */
  connected: boolean;
  /** 订阅某个事件;返回解订阅函数 */
  subscribe: (type: EventType, handler: Handler) => () => void;
}

const Ctx = createContext<RealtimeCtx>({
  connected: false,
  subscribe: () => () => {},
});

export function useRealtime() {
  return useContext(Ctx);
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const handlersRef = useRef<Map<EventType, Set<Handler>>>(new Map());
  const retryAtRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const subscribe = useCallback((type: EventType, handler: Handler) => {
    let set = handlersRef.current.get(type);
    if (!set) {
      set = new Set();
      handlersRef.current.set(type, set);
    }
    set.add(handler);
    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setConnected(false);
      esRef.current?.close();
      esRef.current = null;
      if (retryAtRef.current) clearTimeout(retryAtRef.current);
      retryAtRef.current = null;
      return;
    }

    const connect = () => {
      if (typeof window === 'undefined') return;
      if (document.hidden) return; // 隐藏 tab 不连
      if (esRef.current) return; // 已连

      const es = new EventSource('/api/sse/connect');
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        retryCountRef.current = 0;
      };
      es.onerror = () => {
        // 浏览器自动重连 OK,但是本地做一层守护:超过 3 次自动关掉换新
        setConnected(false);
        if (!document.hidden) {
          es.close();
          esRef.current = null;
          retryCountRef.current += 1;
          const delay = Math.min(30_000, 2000 * Math.pow(1.6, retryCountRef.current - 1));
          retryAtRef.current = setTimeout(connect, delay);
        }
      };

      const wire = (type: EventType) => {
        es.addEventListener(type, (ev) => {
          try {
            const payload = JSON.parse((ev as MessageEvent).data) as RealtimePayload;
            handlersRef.current.get(type)?.forEach((fn) => {
              try { fn(payload); } catch (err) { console.warn('[realtime handler]', err); }
            });
          } catch (err) {
            console.warn('[realtime] parse failed', err);
          }
        });
      };
      wire('ready');
      wire('ping');
      wire('notification');
      wire('message');
      wire('notification.read');
      wire('message.read');
    };

    connect();

    const onVisible = () => {
      if (!document.hidden && !esRef.current) connect();
      if (document.hidden && esRef.current) {
        esRef.current.close();
        esRef.current = null;
        setConnected(false);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (retryAtRef.current) clearTimeout(retryAtRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [user]);

  const value = useMemo(() => ({ connected, subscribe }), [connected, subscribe]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
