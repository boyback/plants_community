/**
 * 关键词高亮 — 安全转义,大小写不敏感
 *
 * 用法:
 *   <Highlight text="多肉胧月养护图鉴" q="胧月" />
 *   → 多肉<mark>胧月</mark>养护图鉴
 */
import React from 'react';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function Highlight({
  text,
  q,
  className = '',
}: {
  text: string;
  q: string;
  className?: string;
}) {
  if (!text || !q) return <>{text}</>;
  // 用 capture group 保留分隔符,split 之后偶数 index 是普通文本,奇数 index 是匹配
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className={`bg-amber-200/70 text-amber-900 rounded px-0.5 ${className}`}
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}
