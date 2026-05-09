'use client';

import Link from 'next/link';

/**
 * 右栏底部的法律入口
 * 一行 horizontal:用户协议 · 隐私政策 · Cookie 政策
 */
export function LegalLinks() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-2 text-[10px] text-leaf-700/60">
      <Link href="/terms" className="hover:text-leaf-700 hover:underline">
        用户协议
      </Link>
      <span aria-hidden>·</span>
      <Link href="/privacy" className="hover:text-leaf-700 hover:underline">
        隐私政策
      </Link>
      <span aria-hidden>·</span>
      <Link href="/cookies" className="hover:text-leaf-700 hover:underline">
        Cookie 政策
      </Link>
    </div>
  );
}
