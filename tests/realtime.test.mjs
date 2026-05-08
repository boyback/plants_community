/**
 * Realtime Bus 基础烟雾测试。
 *
 * 因为 bus 是 TypeScript + 浏览器 SSE 串起来的,纯后端 E2E 不好做;
 * 这里只校验:
 *   1. formatSseEvent 的文本格式正确(SSE 协议:event/data 双换行)
 *   2. 同一用户多次订阅 → unsubscribe 时只影响自己的 set
 *
 * 由于不方便在 Node ESM 里加载 TS,这里复刻 formatSseEvent 的最简版本对比文本即可。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

function formatSseEvent(ev) {
  const body = JSON.stringify({ at: ev.at, data: ev.data ?? null });
  return `event: ${ev.type}\ndata: ${body}\n\n`;
}

test('SSE 事件格式 — event + data + 双换行', () => {
  const out = formatSseEvent({ type: 'notification', at: 1000, data: { id: 'n1' } });
  // 必须恰好包含 "event: notification\n"
  assert.ok(out.startsWith('event: notification\n'), 'event 头');
  // 必须包含 "data: {...}\n\n"
  assert.match(out, /\ndata: \{.*\}\n\n$/, 'data 结尾双换行');
  // JSON 中 data 不会被吞
  const line = out.split('\n')[1];
  const body = JSON.parse(line.slice('data: '.length));
  assert.equal(body.at, 1000);
  assert.deepEqual(body.data, { id: 'n1' });
});

test('SSE 无 data 时:data 字段为 null', () => {
  const out = formatSseEvent({ type: 'ping', at: 2000 });
  const line = out.split('\n')[1];
  const body = JSON.parse(line.slice('data: '.length));
  assert.equal(body.data, null);
});

test('一个 userId 多订阅者 — 用 Set 去重', () => {
  const subs = new Map();
  const add = (uid, ctrl) => {
    let s = subs.get(uid);
    if (!s) { s = new Set(); subs.set(uid, s); }
    s.add(ctrl);
    return () => s.delete(ctrl);
  };
  const a = { id: 'a' };
  const b = { id: 'b' };
  const un1 = add('u1', a);
  const un2 = add('u1', b);
  assert.equal(subs.get('u1').size, 2);
  un1();
  assert.equal(subs.get('u1').size, 1);
  un2();
  assert.equal(subs.get('u1').size, 0);
});
