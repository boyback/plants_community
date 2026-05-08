/**
 * 通知 & 私信的"副作用层":
 *   - 落库成功后通过 realtimeBus 推送 SSE 事件
 *
 * 页面只管调 createNotification / emitMessage,不用关心 SSE 细节。
 */

import { realtimeBus } from './bus';

export function emitNotification(userId: string, payload: unknown): void {
  realtimeBus.publish(userId, {
    type: 'notification',
    at: Date.now(),
    data: payload,
  });
}

export function emitMessage(toUserId: string, payload: unknown): void {
  realtimeBus.publish(toUserId, {
    type: 'message',
    at: Date.now(),
    data: payload,
  });
}

export function emitNotificationRead(userId: string): void {
  realtimeBus.publish(userId, {
    type: 'notification.read',
    at: Date.now(),
  });
}

export function emitMessageRead(userId: string, sessionId?: string): void {
  realtimeBus.publish(userId, {
    type: 'message.read',
    at: Date.now(),
    data: sessionId ? { sessionId } : undefined,
  });
}
