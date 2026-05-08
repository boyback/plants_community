import { cn } from '@/lib/utils';

/**
 * 服务端 + 客户端通用的富文本渲染(纯展示 HTML,无任何运行时依赖)。
 *
 * 优先级:
 *   1. props.html(已 sanitize 的 HTML)→ 直接渲染
 *   2. props.text(纯文本)→ 包一层 <p>
 *   3. props.json(ProseMirror JSON,但仅作为标记表示"有内容";不在客户端做转换以避免引 happy-dom)
 *
 * 设计:数据库的 content 列与 contentJson 列在写入时已保持一致(API sanitize 时同步生成),
 * 因此读取时只用 HTML 列即可。这样 View 组件不需要任何 TipTap 运行时,
 * 服务端 / 客户端 / SSG 都能直接渲染。
 */
export function RichTextView({
  json,
  html,
  text,
  className,
  size = 'md',
}: {
  json?: unknown;
  html?: string;
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeCls =
    size === 'sm'
      ? 'text-sm leading-6'
      : size === 'lg'
      ? 'text-base leading-8'
      : 'text-[15px] leading-7';

  let content = '';
  if (html) {
    content = html;
  } else if (text) {
    content = `<p>${escape(text).replace(/\n/g, '<br>')}</p>`;
  } else if (json) {
    // 兜底:JSON 但没有 HTML(理论上不应该,因为 API 入库时同步生成),仅展示占位
    content = '<p class="text-leaf-700/50">(暂无可显示内容)</p>';
  }

  if (!content) return null;

  return (
    <article
      className={cn('prose-article text-ink-800', sizeCls, className)}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
