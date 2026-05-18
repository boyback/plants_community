'use client';

import Link from 'next/link';

interface MenuItem {
  id: string;
  name: string;
  icon: string;
  path: string | null;
}

export function SystemMenuShortcutsRight({ menus }: { menus?: MenuItem[] }) {
  const displayMenus = menus || [];

  if (displayMenus.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {displayMenus.map((menu) => (
            menu.path ? (
              <Link
                key={menu.id}
                href={menu.path}
                className="inline-flex items-center gap-1.5 rounded-full bg-leaf-50 px-2.5 py-1 text-[11px] text-leaf-700 transition-colors hover:bg-leaf-100"
              >
                {menu.icon?.startsWith('http') ? (
                  <img src={menu.icon} alt="" className="h-3.5 w-3.5 rounded-none object-cover" />
                ) : (
                  <span className="text-sm">{menu.icon}</span>
                )}
                {menu.name}
              </Link>
            ) : (
              <span
                key={menu.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] text-ink-400 cursor-default"
              >
                {menu.icon?.startsWith('http') ? (
                  <img src={menu.icon} alt="" className="h-3.5 w-3.5 rounded-none object-cover" />
                ) : (
                  <span className="text-sm">{menu.icon}</span>
                )}
                {menu.name}
              </span>
            )
          ))}
        </div>
      </div>
    </div>
  );
}