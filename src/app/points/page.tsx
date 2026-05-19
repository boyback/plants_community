'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Empty } from '@/components/ui/Empty';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';
import { cn, formatDateTime } from '@/lib/utils';
import { SkinCard } from '@/components/skin/SkinCard';
import type { SkinItem, SkinKind, PointsLedgerItem } from '@/lib/types';

const KIND_TABS: { key: SkinKind | 'wardrobe' | 'ledger'; labelKey: string }[] = [
  { key: 'bubble', labelKey: 'points.tabs.bubble' },
  { key: 'reaction', labelKey: 'points.tabs.reaction' },
  { key: 'sticker', labelKey: 'points.tabs.sticker' },
  { key: 'pendant', labelKey: 'points.tabs.pendant' },
  { key: 'wardrobe', labelKey: 'points.tabs.wardrobe' },
  { key: 'ledger', labelKey: 'points.tabs.ledger' },
];

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PointsInner />
    </Suspense>
  );
}

function PointsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, pointsBalance, refresh, vip, equip } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<(typeof KIND_TABS)[number]['key']>(
    (searchParams.get('tab') as (typeof KIND_TABS)[number]['key']) ?? 'bubble'
  );

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">💎</div>
          <div className="mt-3 text-lg font-semibold">{t('points.loginRequired')}</div>
          <Link href="/login?redirect=/points" className="btn-primary mt-4 inline-flex">
            {t('nav.login')}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 余额卡 */}
        <div className="card overflow-hidden lg:col-span-2">
          <div className="bg-gradient-to-br from-leaf-500 to-leaf-700 p-5 text-white">
            <div className="text-xs opacity-80">{t('points.balance')}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold">{pointsBalance}</span>
              <span className="text-sm opacity-80">💎</span>
            </div>
            <div className="mt-1 text-xs opacity-80">
              {t('points.balanceDesc')}
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-leaf-100 text-center">
            <Link href="/tasks" className="p-4 hover:bg-leaf-50">
              <div className="text-base font-semibold text-leaf-700">{t('points.sources.tasks')}</div>
              <div className="mt-1 text-[10px] text-leaf-700/70">{t('points.sources.tasksDesc')}</div>
            </Link>
            <Link href="/market" className="p-4 hover:bg-leaf-50">
              <div className="text-base font-semibold text-leaf-700">{t('points.sources.purchase')}</div>
              <div className="mt-1 text-[10px] text-leaf-700/70">{t('points.sources.purchaseDesc')}</div>
            </Link>
            <Link href="/vip" className="p-4 hover:bg-leaf-50">
              <div className="text-base font-semibold text-leaf-700">{t('points.sources.exchangeVip')}</div>
              <div className="mt-1 text-[10px] text-leaf-700/70">5000 → {t('vip.plans.monthly')}</div>
            </Link>
          </div>
        </div>

        {/* VIP / 装扮 状态卡 */}
        <div className="card p-4">
          <div className="text-sm font-semibold">我的状态</div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-leaf-700/70">大会员</span>
              {vip.isVip ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 font-medium">
                  👑 {vip.lifetime ? '终身' : '活跃中'}
                </span>
              ) : (
                <Link href="/vip" className="text-leaf-700 hover:underline">去开通</Link>
              )}
            </div>
            <Equip label="评论气泡" item={equip.bubble} kind="bubble" />
            <Equip label="点赞按钮" item={equip.reaction} kind="reaction" />
            <Equip label="表情包" item={equip.sticker} kind="sticker" />
            <Equip label="头像挂件" item={equip.pendant} kind="pendant" />
          </div>
          <button
            type="button"
            onClick={() => setTab('wardrobe')}
            className="btn-outline mt-3 w-full !text-xs"
          >
            管理装扮
          </button>
        </div>
      </div>

      {/* Tab */}
      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-leaf-100 pb-2">
        {KIND_TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => {
              setTab(tabItem.key);
              router.replace(`/points?tab=${tabItem.key}`);
            }}
            className={cn(
              'relative px-3 py-2 text-sm transition-colors',
              tab === tabItem.key
                ? 'text-leaf-700 font-medium'
                : 'text-ink-700/60 hover:text-leaf-700'
            )}
          >
            {t(tabItem.labelKey)}
            {tab === tabItem.key && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-leaf-500" />
            )}
          </button>
        ))}
      </div>

      {tab === 'wardrobe' ? (
        <Wardrobe onChange={refresh} />
      ) : tab === 'ledger' ? (
        <Ledger />
      ) : (
        <SkinShop kind={tab} onChange={refresh} />
      )}
    </Shell>
  );
}

function Equip({
  label,
  item,
  kind,
}: {
  label: string;
  item?: SkinItem | null;
  kind: SkinKind;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-leaf-700/70">{label}</span>
      <span className="text-ink-800">{item ? item.name : <span className="text-leaf-700/50">未装备</span>}</span>
    </div>
  );
}

/* ---------------- 皮肤商城 ---------------- */

interface SkinFromAPI extends SkinItem {
  owned: boolean;
}

function SkinShop({ kind, onChange }: { kind: SkinKind; onChange: () => void | Promise<void> }) {
  const [list, setList] = useState<SkinFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get<SkinFromAPI[]>(`/api/skins?kind=${kind}`)
      .then(setList)
      .catch(() => null)
      .finally(() => setLoading(false));
  };
  useEffect(load, [kind]);

  const exchange = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/api/skins/${id}/exchange`);
      load();
      onChange();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '兑换失败');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="py-10 text-center text-sm text-leaf-700/60">加载中...</div>;
  if (list.length === 0) return <Empty icon="🌵" title="暂无皮肤" />;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {list.map((s) => (
        <SkinCard
          key={s.id}
          skin={s}
          owned={s.owned}
          busy={busyId === s.id}
          onExchange={() => exchange(s.id)}
        />
      ))}
    </div>
  );
}

/* ---------------- 我的装扮 ---------------- */

function Wardrobe({ onChange }: { onChange: () => void | Promise<void> }) {
  const [data, setData] = useState<{
    owned: (SkinItem & { obtainedFrom: string; obtainedAt: string })[];
    equip: {
      bubble?: SkinItem | null;
      reaction?: SkinItem | null;
      sticker?: SkinItem | null;
      pendant?: SkinItem | null;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get<NonNullable<typeof data>>(`/api/wardrobe`)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const equip = async (kind: SkinKind, skinId: string | null) => {
    setBusyId(skinId ?? 'unequip-' + kind);
    try {
      await api.post(`/api/wardrobe/equip`, { kind, skinId });
      load();
      onChange();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="py-10 text-center text-sm text-leaf-700/60">加载中...</div>;
  if (!data) return null;

  const equipMap = data.equip;

  const ownedByKind = (k: SkinKind) => data.owned.filter((s) => s.kind === k);

  const KIND_TITLE: Record<SkinKind, string> = {
    bubble: '💬 评论气泡',
    reaction: '👍 点赞按钮',
    sticker: '🌱 表情包',
    pendant: '👑 头像挂件',
  };

  if (data.owned.length === 0) {
    return (
      <Empty
        icon="👗"
        title="装扮箱空空如也"
        desc="去皮肤商城兑换喜欢的皮肤吧"
      />
    );
  }

  return (
    <div className="space-y-6">
      {(['bubble', 'reaction', 'sticker', 'pendant'] as SkinKind[]).map((k) => {
        const ownedList = ownedByKind(k);
        const equippedId = (equipMap as Record<string, SkinItem | null | undefined>)[k]?.id;
        if (ownedList.length === 0) return null;
        return (
          <section key={k}>
            <h3 className="mb-2 text-sm font-semibold text-ink-800">{KIND_TITLE[k]}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {ownedList.map((s) => (
                <SkinCard
                  key={s.id}
                  skin={s}
                  owned
                  equipped={equippedId === s.id}
                  busy={busyId === s.id}
                  onEquip={() => equip(k, s.id)}
                  onUnequip={() => equip(k, null)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ---------------- 积分流水 ---------------- */

function Ledger() {
  const { t } = useI18n();
  const [list, setList] = useState<PointsLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ items: PointsLedgerItem[] }>('/api/points/ledger?limit=80')
      .then((r) => setList(r.items))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>;
  if (list.length === 0) return <Empty icon="📜" title={t('points.ledger.empty')} />;

  return (
    <ul className="card divide-y divide-leaf-50">
      {list.map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-5 py-3">
          <div
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm',
              item.delta > 0 ? 'bg-leaf-50 text-leaf-700' : 'bg-rose-50 text-rose-600'
            )}
          >
            {item.delta > 0 ? '+' : ''}
            {item.delta}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm">{t(`points.ledger.types.${item.type}`) || item.type}</div>
            <div className="text-[11px] text-leaf-700/70">
              {item.remark ?? ''} · {formatDateTime(item.createdAt)}
            </div>
          </div>
          <div className="text-xs text-leaf-700/60">余额 {item.balance}</div>
        </li>
      ))}
    </ul>
  );
}
