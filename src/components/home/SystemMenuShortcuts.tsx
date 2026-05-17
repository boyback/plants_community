'use client';

import Link from 'next/link';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';

export function SystemMenuShortcuts() {
  const { systemMenus } = useFeatureFlags();
  const enabledMenus = systemMenus.filter((m) => m.path);

  if (enabledMenus.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium text-ink-800">快捷入口</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {enabledMenus.map((menu) => (
            <Link
              key={menu.id}
              href={menu.path}
              className="inline-flex items-center gap-1.5 rounded-full bg-leaf-50 px-2.5 py-1 text-[11px] text-leaf-700 transition-colors hover:bg-leaf-100"
            >
              {menu.icon?.startsWith('http') ? (
                <img src={menu.icon} alt="" className="h-3.5 w-3.5 rounded-none object-cover" />
              ) : (
                <span>{menu.icon || '📌'}</span>
              )}
              {menu.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
