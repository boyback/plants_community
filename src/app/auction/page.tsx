'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Empty } from '@/components/ui/Empty';
import { Icon } from '@/components/ui/Icon';
import { AuctionCard } from '@/components/auction/AuctionCard';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { hasPermission, type Permission } from '@/lib/levels';
import { api } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import type { Auction } from '@/lib/types';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



const TABS = [
{ key: 'live', icon: '🔨', labelKey: 'auction.tabLive' },
{ key: 'scheduled', icon: '⏳', labelKey: 'auction.tabScheduled' },
{ key: 'finished', icon: '🏁', labelKey: 'auction.tabFinished' },
{ key: 'mine', icon: '📦', labelKey: 'nav.myOrders' }] as
const;

type TabKey = (typeof TABS)[number]['key'];

export default function AuctionPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>('live');
  const [list, setList] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  const canPublish = hasPermission(
    user ?
    {
      level: user.level,
      grantedPermissions: user.grantedPermissions as Permission[] | undefined,
      revokedPermissions: user.revokedPermissions as Permission[] | undefined
    } :
    null,
    "market:sell"
  );

  useEffect(() => {
    setLoading(true);
    if (tab === 'mine') {
      if (!user) {
        setList([]);
        setLoading(false);
        return;
      }
      api.
      get<{items: Auction[];}>(
        `/api/auctions?seller=${encodeURIComponent(user.id)}&limit=50`
      ).
      then((r) => setList(r.items)).
      catch(() => setList([])).
      finally(() => setLoading(false));
    } else {
      api.
      get<{items: Auction[];}>(`/api/auctions?status=${tab}&limit=24`).
      then((r) => setList(r.items)).
      catch(() => setList([])).
      finally(() => setLoading(false));
    }
  }, [tab, user?.id]);

  return (
    <Shell>
      <div className={cx(styles.r_b6777c6d, styles.r_2cd02d11)}>
        <div className={cx(styles.r_39b2e003, styles.r_5baed6d9, styles.r_6378cff7, styles.r_db539fdb, styles.r_0478c89a, styles.r_72a4c7cd)}>
          <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
            <div>
              <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>🔨 {t('auction.title')}</h1>
              <p className={cx(styles.r_b6b02c0e, styles.r_9ef2b581, styles.r_359090c2, styles.r_4f5874c5)}>{t('auction.subtitle')}</p>
            </div>
            <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
              {canPublish ?
              <Link
                href="/auction/new"
                className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_2689f395, styles.r_b54428d1, styles.r_438b2237, styles.r_85cfcc24)}>

                  <Icon name="plus" size={14} />
                  {t('auction.create.title')}
                </Link> :
              user ?
              <span
                className={cx(styles.r_ac204c10, styles.r_2cf6fd42, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_359090c2)}
                title={t('auction.create.needLevel')}>

                  🔒 {t('auction.create.needLevel')}
                </span> :

              <Link
                href="/login?redirect=/auction"
                className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_2689f395, styles.r_b54428d1, styles.r_438b2237, styles.r_85cfcc24)}>

                  {t('nav.login')}
                </Link>
              }
              <Link
                href="/orders"
                className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_9c15994f, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_72a4c7cd, styles.r_b1dae7c9)}>

                {t('nav.myOrders')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_65fdbade, styles.r_88b684d2)}>
        {TABS.map((item) =>
        <button
          key={item.key}
          onClick={() => setTab(item.key)}
          className={cn(cx(styles.r_d89972fe, styles.r_f0faeb26, styles.r_e7ee55ac, styles.r_fc7473ca, styles.r_ceb69a6b),

          tab === item.key ? cx(styles.r_5f6a59f1, styles.r_2689f395) : cx(styles.r_5fa66415, styles.r_9825203a)
          )}>

            {item.icon} {t(item.labelKey)}
            {tab === item.key &&
          <span className={cx(styles.r_da4dbfbc, styles.r_b6027879, styles.r_189f036c, styles.r_10db0d55, styles.r_ac204c10, styles.r_45499621)} />
          }
          </button>
        )}
      </div>

      {loading ?
      <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</div> :
      list.length === 0 ?
      <Empty
        icon="🔨"
        title={t('common.empty')}
        desc={canPublish ? t('auction.create.title') : undefined} /> :


      <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_0c3bc985, styles.r_ab1b20c2, styles.r_4558bce6, styles.r_a4ecef1e)}>
          {list.map((a) =>
        <AuctionCard key={a.id} auction={a} />
        )}
        </div>
      }
    </Shell>);

}
