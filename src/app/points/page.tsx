'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Empty } from '@/components/ui/Empty';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import { cn, formatDateTime } from '@/lib/utils';
import { SkinCard } from '@/components/skin/SkinCard';
import type { SkinItem, SkinKind, PointsLedgerItem, EquipState } from '@/lib/types';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



type PointsTabKey = SkinKind | 'ledger';

const KIND_TABS: {key: PointsTabKey;labelKey: string;}[] = [
{ key: 'bubble', labelKey: 'points.tabs.bubble' },
{ key: 'reaction', labelKey: 'points.tabs.reaction' },
{ key: 'sticker', labelKey: 'points.tabs.sticker' },
{ key: 'pendant', labelKey: 'points.tabs.pendant' },
{ key: 'ledger', labelKey: 'points.tabs.ledger' }];

function normalizeTab(value: string | null): PointsTabKey {
  return KIND_TABS.some((item) => item.key === value) ? value as PointsTabKey : 'bubble';
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PointsInner />
    </Suspense>);

}

function PointsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, pointsBalance, refresh, equip, setEquipItem } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<PointsTabKey>(normalizeTab(searchParams.get('tab')));
  const [localEquip, setLocalEquip] = useState<EquipState>(equip);

  useEffect(() => {
    setLocalEquip(equip);
  }, [equip]);

  const updateLocalEquip = (kind: SkinKind, item: SkinItem | null) => {
    setLocalEquip((prev) => ({ ...prev, [kind]: item }));
    setEquipItem(kind, item);
  };

  if (!authLoading && !user) {
    return (
      <Shell withSidebar={false}>
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>💎</div>
          <div className={cx(styles.r_eccd13ef, styles.r_42536e69, styles.r_e83a7042)}>{t('points.loginRequired')}</div>
          <Link href="/login?redirect=/points" className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
            {t('nav.login')}
          </Link>
        </div>
      </Shell>);

  }

  return (
    <Shell withSidebar={false}>
      <div className={cx(styles.r_b6777c6d, styles.r_f3c543ad, styles.r_d7c83398, styles.r_0c3bc985, styles.r_19d9b25e)}>
        {/* 余额卡 */}
        <Card padding="none" className={cx(styles.r_2cd02d11, styles.summaryTopCard)}>
          <div className={cx(styles.r_39b2e003, styles.r_925d3564, styles.r_70203aca, styles.r_c07e54fd, styles.r_72a4c7cd)}>
            <div className={cx(styles.r_359090c2, styles.r_714816ef)}>{t('points.balance')}</div>
            <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_b7012bb2, styles.r_77a2a20e)}>
              <span className={cx(styles.r_a95699d9, styles.r_69450ef1)}>{pointsBalance}</span>
              <span className={cx(styles.r_fc7473ca, styles.r_714816ef)}>💎</span>
            </div>
            <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_714816ef)}>
              {t('points.balanceDesc')}
            </div>
          </div>
          <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_3746131e, styles.r_1790d566, styles.r_ca6bf630)}>
            <Link href="/tasks" className={cx(styles.r_8e63407b, styles.r_5756b7b4)}>
              <div className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_5f6a59f1)}>{t('points.sources.tasks')}</div>
              <div className={cx(styles.r_b6b02c0e, styles.r_1dc571a3, styles.r_69335b95)}>{t('points.sources.tasksDesc')}</div>
            </Link>
            <Link href="/market" className={cx(styles.r_8e63407b, styles.r_5756b7b4)}>
              <div className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_5f6a59f1)}>{t('points.sources.purchase')}</div>
              <div className={cx(styles.r_b6b02c0e, styles.r_1dc571a3, styles.r_69335b95)}>{t('points.sources.purchaseDesc')}</div>
            </Link>
          </div>
        </Card>

        {/* 装扮状态卡 */}
        <Card className={cx(styles.r_8e63407b, styles.summaryTopCard)}>
          <div className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>我的状态</div>
          <div className={cx(styles.r_eccd13ef, styles.r_6f7e013d, styles.r_359090c2)}>
            <Equip label="评论气泡" item={localEquip.bubble} kind="bubble" />
            <Equip label="点赞按钮" item={localEquip.reaction} kind="reaction" />
            <Equip label="表情包" item={localEquip.sticker} kind="sticker" />
            <Equip label="头像挂件" item={localEquip.pendant} kind="pendant" />
          </div>
        </Card>
      </div>

      {/* Tab */}
      <div className={cx(styles.r_fb88ccaa, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_65fdbade, styles.r_88b684d2, styles.r_f4cc511f)}>
        {KIND_TABS.map((tabItem) =>
        <button
          key={tabItem.key}
          onClick={() => {
            setTab(tabItem.key);
            router.replace(`/points?tab=${tabItem.key}`);
          }}
          className={cn(cx(styles.r_d89972fe, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_ceb69a6b),

          tab === tabItem.key ? cx(styles.r_5f6a59f1, styles.r_2689f395) : cx(styles.r_5fa66415, styles.r_9825203a)


          )}>

            {t(tabItem.labelKey)}
            {tab === tabItem.key &&
          <span className={cx(styles.r_da4dbfbc, styles.r_b6027879, styles.r_189f036c, styles.r_10db0d55, styles.r_ac204c10, styles.r_45499621)} />
          }
          </button>
        )}
      </div>

      {tab === 'ledger' ?
      <Ledger /> :

      <SkinShop
        key={tab}
        kind={tab}
        equippedId={localEquip[tab]?.id ?? null}
        onEquipChange={updateLocalEquip}
        onChange={refresh} />
      }
    </Shell>);

}

function Equip({
  label,
  item,
  kind




}: {label: string;item?: SkinItem | null;kind: SkinKind;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
      <span className={styles.r_69335b95}>{label}</span>
      <span className={styles.r_399e11a5}>{item ? item.name : <span className={styles.r_3353f144}>未装备</span>}</span>
    </div>);

}

/* ---------------- 皮肤商城 ---------------- */

interface SkinFromAPI extends SkinItem {
  owned: boolean;
}

function SkinShop({
  kind,
  equippedId,
  onEquipChange,
  onChange
}: {kind: SkinKind;equippedId?: string | null;onEquipChange: (kind: SkinKind, item: SkinItem | null) => void;onChange: () => void | Promise<void>;}) {
  const [list, setList] = useState<SkinFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localEquippedId, setLocalEquippedId] = useState<string | null>(equippedId ?? null);

  useEffect(() => {
    setLocalEquippedId(equippedId ?? null);
  }, [equippedId, kind]);

  const load = () => {
    setLoading(true);
    api.
    get<SkinFromAPI[]>(`/api/skins?kind=${kind}`).
    then(setList).
    catch(() => null).
    finally(() => setLoading(false));
  };
  useEffect(load, [kind]);

  const exchange = async (id: string) => {
    setBusyId(id);
    try {
      await api.post(`/api/skins/${id}/exchange`);
      setList((items) => items.map((item) => item.id === id ? { ...item, owned: true } : item));
      await onChange();
      toast.success('兑换成功');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '兑换失败');
    } finally {
      setBusyId(null);
    }
  };

  const equip = async (kind: SkinKind, skinId: string | null) => {
    const busyKey = skinId ?? "unequip-" + kind;
    setBusyId(busyKey);
    try {
      const authInfo = await api.get<null | { user?: { id?: string } }>('/api/auth/me');
      if (!authInfo?.user) {
        toast.error('请先登录后再佩戴');
        return;
      }
      await api.post(`/api/wardrobe/equip`, { kind, skinId });
      const item = skinId ? list.find((skin) => skin.id === skinId) ?? null : null;
      setLocalEquippedId(skinId);
      onEquipChange(kind, item);
      toast.success(skinId ? '佩戴成功' : '已卸下');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : skinId ? '佩戴失败' : '卸下失败');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <SkinGridSkeleton />;
  if (list.length === 0) return <Empty icon="🌵" title="暂无皮肤" />;

  return (
    <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_ab1b20c2, styles.r_d59f314f, styles.r_a4ecef1e)}>
      {list.map((s) => {
        const equipped = localEquippedId === s.id;
        return (
          <SkinCard
            key={s.id}
            skin={s}
            owned={s.owned}
            equipped={equipped}
            busy={busyId === s.id || equipped && busyId === "unequip-" + kind}
            onExchange={() => exchange(s.id)}
            onEquip={() => equip(kind, s.id)}
            onUnequip={() => equip(kind, null)} />);

      })}
    </div>);

}

function SkinGridSkeleton() {
  return (
    <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_ab1b20c2, styles.r_d59f314f, styles.r_a4ecef1e)}>
      {Array.from({ length: 5 }).map((_, index) =>
      <div key={index} className={styles.skinSkeletonCard}>
          <div className={styles.skinSkeletonPreview} />
          <div className={styles.skinSkeletonLine} />
          <div className={styles.skinSkeletonLineShort} />
          <div className={styles.skinSkeletonFooter}>
            <span />
            <span />
          </div>
        </div>
      )}
    </div>);

}

function LedgerSkeleton() {
  return (
    <ul className={styles.ledgerList}>
      {Array.from({ length: 5 }).map((_, index) =>
      <li key={index} className={styles.ledgerSkeletonItem}>
          <span />
          <div>
            <i />
            <em />
          </div>
          <b />
        </li>
      )}
    </ul>);

}

/* ---------------- 钻石流水 ---------------- */

function Ledger() {
  const { t } = useI18n();
  const [list, setList] = useState<PointsLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.
    get<{items: PointsLedgerItem[];}>('/api/points/ledger?limit=80').
    then((r) => setList(r.items)).
    catch(() => null).
    finally(() => setLoading(false));
  }, []);

  if (loading) return <LedgerSkeleton />;
  if (list.length === 0) return <Empty icon="📜" title={t('points.ledger.empty')} />;

  return (
    <ul className={styles.ledgerList}>
      {list.map((item) =>
      <li key={item.id}>
        <Card className={cx(styles.ledgerCard, styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3)}>
          <div
          className={cn(cx(styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_012fbd12, styles.r_67d66567, styles.r_ac204c10, styles.r_fc7473ca),

          item.delta > 0 ? cx(styles.r_7ebecbb6, styles.r_5f6a59f1) : cx(styles.r_0759a0f1, styles.r_595fceba)
          )}>

            {item.delta > 0 ? '+' : ''}
            {item.delta}
          </div>
          <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
            <div className={styles.r_fc7473ca}>{t(`points.ledger.types.${item.type}`) || item.type}</div>
            <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>
              {item.remark ?? ''} · {formatDateTime(item.createdAt)}
            </div>
          </div>
          <div className={cx(styles.r_359090c2, styles.r_6c4cc49e)}>余额 {item.balance}</div>
        </Card>
        </li>
      )}
    </ul>);

}
