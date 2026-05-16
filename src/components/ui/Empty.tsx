import type { ReactNode } from 'react';

export function Empty({
  icon = '🌵',
  title = '暂无内容',
  desc,
  action,
}: {
  icon?: string;
  title?: ReactNode;
  desc?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-leaf-50/30 to-white py-16 text-center">
      {/* 图标容器 */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-leaf-200/60 bg-white shadow-sm">
        <div className="text-4xl">{icon}</div>
      </div>

      {/* 标题 */}
      <div className="mb-3 text-base font-medium text-ink-800">{title}</div>

      {/* 分隔线 */}
      <div className="mb-3 h-px w-24 bg-gradient-to-r from-transparent via-leaf-300 to-transparent"></div>

      {/* 描述文字 */}
      {desc && <div className="mb-6 max-w-xs text-sm text-leaf-700/70">{desc}</div>}

      {/* 操作按钮 */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
