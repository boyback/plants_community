'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Empty } from '@/components/ui/Empty';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import { cn, formatDateTime } from '@/lib/utils';
import { SkinCard } from '@/components/skin/SkinCard';
import type { SkinItem, SkinKind, PointsLedgerItem } from '@/lib/types';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



const KIND_TABS: {key: SkinKind | 'wardrobe' | 'ledger';labelKey: string;}[] = [
{ key: 'bubble', labelKey: 'points.tabs.bubble' },
{ key: 'reaction', labelKey: 'points.tabs.reaction' },
{ key: 'sticker', labelKey: 'points.tabs.sticker' },
{ key: 'pendant', labelKey: 'points.tabs.pendant' },
{ key: 'wardrobe', labelKey: 'points.tabs.wardrobe' },
{ key: 'ledger', labelKey: 'points.tabs.ledger' }];


export default function Page() {
  return (
    <Suspense fallback={null}>
      <PointsInner />
    </Suspense>);

}

function PointsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, pointsBalance, refresh, vip, equip } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<(typeof KIND_TABS)[number]['key']>(
    searchParams.get('tab') as (typeof KIND_TABS)[number]['key'] ?? 'bubble'
  );

  if (!authLoading && !user) {
    return (
      <Shell>
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
    <Shell>
      <div className={cx(styles.r_b6777c6d, styles.r_f3c543ad, styles.r_d7c83398, styles.r_0c3bc985, styles.r_19d9b25e)}>
        {/* 余额卡 */}
        <div className={cx(styles.r_2cd02d11, styles.r_422d1002)}>
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
            <Link href="/vip" className={cx(styles.r_8e63407b, styles.r_5756b7b4)}>
              <div className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_5f6a59f1)}>{t('points.sources.exchangeVip')}</div>
              <div className={cx(styles.r_b6b02c0e, styles.r_1dc571a3, styles.r_69335b95)}>5000 → {t('vip.plans.monthly')}</div>
            </Link>
          </div>
        </div>

        {/* VIP / 装扮 状态卡 */}
        <div className={styles.r_8e63407b}>
          <div className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>我的状态</div>
          <div className={cx(styles.r_eccd13ef, styles.r_6f7e013d, styles.r_359090c2)}>
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
              <span className={styles.r_69335b95}>大会员</span>
              {vip.isVip ?
              <span className={cx(styles.r_ac204c10, styles.r_735dd972, styles.r_d5eab218, styles.r_465609a2, styles.r_5c6230d2, styles.r_2689f395)}>
                  👑 {vip.lifetime ? '终身' : '活跃中'}
                </span> :

              <Link href="/vip" className={cx(styles.r_5f6a59f1, styles.r_f673f4a7)}>去开通</Link>
              }
            </div>
            <Equip label="评论气泡" item={equip.bubble} kind="bubble" />
            <Equip label="点赞按钮" item={equip.reaction} kind="reaction" />
            <Equip label="表情包" item={equip.sticker} kind="sticker" />
            <Equip label="头像挂件" item={equip.pendant} kind="pendant" />
          </div>
          <button
            type="button"
            onClick={() => setTab('wardrobe')}
            className={cx(styles.r_eccd13ef, styles.r_6da6a3c3, styles.r_dd702538)}>

            管理装扮
          </button>
        </div>
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

      {tab === 'wardrobe' ?
      <Wardrobe onChange={refresh} /> :
      tab === 'ledger' ?
      <Ledger /> :

      <SkinShop kind={tab} onChange={refresh} />
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

function SkinShop({ kind, onChange }: {kind: SkinKind;onChange: () => void | Promise<void>;}) {
  const [list, setList] = useState<SkinFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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
      load();
      onChange();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '兑换失败');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>加载中...</div>;
  if (list.length === 0) return <Empty icon="🌵" title="暂无皮肤" />;

  return (
    <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_ab1b20c2, styles.r_d59f314f, styles.r_a4ecef1e)}>
      {list.map((s) =>
      <SkinCard
        key={s.id}
        skin={s}
        owned={s.owned}
        busy={busyId === s.id}
        onExchange={() => exchange(s.id)} />

      )}
    </div>);

}

/* ---------------- 我的装扮 ---------------- */

function Wardrobe({ onChange }: {onChange: () => void | Promise<void>;}) {
  const [data, setData] = useState<{
    owned: (SkinItem & {obtainedFrom: string;obtainedAt: string;})[];
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
    api.
    get<NonNullable<typeof data>>(`/api/wardrobe`).
    then(setData).
    catch(() => null).
    finally(() => setLoading(false));
  };
  useEffect(load, []);

  const equip = async (kind: SkinKind, skinId: string | null) => {
    setBusyId(skinId ?? "unequip-" + kind);
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

  if (loading) return <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>加载中...</div>;
  if (!data) return null;

  const equipMap = data.equip;

  const ownedByKind = (k: SkinKind) => data.owned.filter((s) => s.kind === k);

  const KIND_TITLE: Record<SkinKind, string> = {
    bubble: '💬 评论气泡',
    reaction: '👍 点赞按钮',
    sticker: '🌱 表情包',
    pendant: '👑 头像挂件'
  };

  if (data.owned.length === 0) {
    return (
      <Empty
        icon="👗"
        title="装扮箱空空如也"
        desc="去皮肤商城兑换喜欢的皮肤吧" />);


  }

  return (
    <div className={styles.r_b3542e05}>
      {(['bubble', 'reaction', 'sticker', 'pendant'] as SkinKind[]).map((k) => {
        const ownedList = ownedByKind(k);
        const equippedId = (equipMap as Record<string, SkinItem | null | undefined>)[k]?.id;
        if (ownedList.length === 0) return null;
        return (
          <section key={k}>
            <h3 className={cx(styles.r_a77ed4d9, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{KIND_TITLE[k]}</h3>
            <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_ab1b20c2, styles.r_d59f314f, styles.r_a4ecef1e)}>
              {ownedList.map((s) =>
              <SkinCard
                key={s.id}
                skin={s}
                owned
                equipped={equippedId === s.id}
                busy={busyId === s.id}
                onEquip={() => equip(k, s.id)}
                onUnequip={() => equip(k, null)} />

              )}
            </div>
          </section>);

      })}
    </div>);

}

/* ---------------- 积分流水 ---------------- */

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

  if (loading) return <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</div>;
  if (list.length === 0) return <Empty icon="📜" title={t('points.ledger.empty')} />;

  return (
    <ul className={cx(styles.r_fa6acbf8, styles.r_6f8e581a)}>
      {list.map((item) =>
      <li key={item.id} className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_d139dd09, styles.r_1b2d54a3)}>
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
        </li>
      )}
    </ul>);

}