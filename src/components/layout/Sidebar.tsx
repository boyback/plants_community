'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { VipBadge } from '@/components/ui/VipBadge';
import { BoardsTreeMenu } from '@/components/layout/BoardsTreeMenu';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { api } from '@/lib/client-api';

interface SpecialBoard {
  id: string;
  slug: string;
  name: string;
  icon: string;
  kind: string;
}

const DEFAULT_BOARDS: SpecialBoard[] = [
  { id: 'home', slug: '', name: '花友家园', icon: '🏡', kind: 'home' },
  { id: 'market', slug: 'market', name: '交易广场', icon: '🛒', kind: 'market' },
  { id: 'yangzhi', slug: 'yangzhi', name: '养殖交流', icon: '🌿', kind: 'discussion' },
  { id: 'shaitu', slug: 'shaitu', name: '摄影大赛', icon: '📸', kind: 'discussion' },
  { id: 'xinshou', slug: 'xinshou', name: '新手村落', icon: '🌱', kind: 'discussion' },
];

export function Sidebar() {
  const { user, vip, pointsBalance, expProgress } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const [specialBoards, setSpecialBoards] = useState<SpecialBoard[]>(DEFAULT_BOARDS);

  const isHome = pathname === '/';

  useEffect(() => {
    api
      .get<SpecialBoard[]>('/api/categories?kind=discussion')
      .then((list) => {
        const home = { id: 'home', slug: '', name: '花友家园', icon: '🏡', kind: 'home' };
        const market = { id: 'market', slug: 'market', name: '交易广场', icon: '🛒', kind: 'market' };
        const renamed = (list || []).map(b => 
          b.name === '晒图广场' ? { ...b, name: '摄影大赛', slug: 'shaitu' } : b
        );
        const ordered = [home, market];
        const yangzhi = renamed.find(b => b.slug === 'yangzhi');
        const shaitu = renamed.find(b => b.slug === 'shaitu');
        const xinshou = renamed.find(b => b.slug === 'xinshou');
        if (yangzhi) ordered.push(yangzhi);
        if (shaitu) ordered.push(shaitu);
        if (xinshou) ordered.push(xinshou);
        renamed.filter(b => !['yangzhi', 'shaitu', 'xinshou'].includes(b.slug)).forEach(b => ordered.push(b));
        setSpecialBoards(ordered);
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="sticky top-[60px] hidden h-[calc(100vh-72px)] w-56 shrink-0 space-y-3 overflow-y-auto pr-2 lg:block">
      {/* 社区板块 */}
      {specialBoards.length > 0 && (
        <div className="rounded-xl border border-leaf-100 bg-white overflow-hidden">
          <Link href="/" className="flex items-center gap-2 px-3 py-2.5 border-b border-leaf-100/60 hover:bg-leaf-50 transition-colors">
            <span className="text-base shrink-0">🏠</span>
            <span className="text-sm font-medium text-ink-800">社区</span>
          </Link>
          <div className="p-2 space-y-0.5">
            {specialBoards.map((b) => {
              const href = b.slug === '' ? '/' : `/${b.slug}`;
              const isActive = b.slug === '' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={b.id}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-leaf-100 text-leaf-800 font-medium"
                      : "text-ink-700 hover:bg-leaf-50 hover:text-leaf-700"
                  )}
                >
                  <CategoryIcon icon={b.icon} name={b.name} size="sm" />
                  <span className="truncate">{b.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 板块 */}
      <div className="rounded-xl border border-leaf-100 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-leaf-100/60">
          <span className="text-base shrink-0">🌿</span>
          <span className="text-sm font-medium text-ink-800">板块</span>
        </div>
        <div className="max-h-[40vh] overflow-y-auto">
          <BoardsTreeMenu />
        </div>
      </div>

      {user && (
        <div className="mt-6 rounded-2xl border border-leaf-100 bg-gradient-to-br from-leaf-50 to-white p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-leaf-700/80">
            {t('nav.sidebar.currentAccount')}
            {vip.isVip && <VipBadge size="xs" lifetime={vip.lifetime} />}
          </div>
          <div
            className={cn(
              'text-sm font-medium',
              vip.isVip
                ? 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 bg-clip-text text-transparent'
                : ''
            )}
          >
            {user.name}
          </div>
          {expProgress && (
            <>
              <div className="mt-2 flex items-baseline justify-between text-[10px] text-leaf-700/70">
                <span>Lv.{user.level}</span>
                {expProgress.isMax ? (
                  <span>{t('nav.sidebar.maxLevel')}</span>
                ) : (
                  <span>{t('nav.sidebar.expToNext', { level: user.level + 1, need: expProgress.pointsToNext })}</span>
                )}
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-leaf-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-leaf-400 to-leaf-600"
                  style={{ width: `${expProgress.percent}%` }}
                />
              </div>
            </>
          )}
          <div className="mt-3 grid grid-cols-3 text-center text-[11px]">
            <div>
              <div className="font-semibold text-ink-800">{user.posts}</div>
              <div className="text-leaf-700/70">{t('nav.sidebar.statPosts')}</div>
            </div>
            <div>
              <div className="font-semibold text-ink-800">💎{pointsBalance}</div>
              <div className="text-leaf-700/70">{t('nav.sidebar.statPoints')}</div>
            </div>
            <div>
              <div className="font-semibold text-ink-800">{user.followers}</div>
              <div className="text-leaf-700/70">{t('nav.sidebar.statFollowers')}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 mb-2 px-3 text-[11px] text-leaf-600/60">
        {t('nav.sidebar.copyright', { year: new Date().getFullYear() })}
      </div>
    </aside>
  );
}

