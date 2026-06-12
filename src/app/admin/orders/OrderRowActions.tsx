'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import styles from './OrderRowActions.module.scss';
import { cx } from '@/lib/style-utils';



export function OrderRowActions({ orderId, status }: {orderId: string;status: string;}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const doPatch = async (body: unknown) => {
    setBusy(true);
    setMenuOpen(false);
    try {
      await api.patch(`/api/admin/orders/${orderId}`, body);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const ship = () => {
    const tn = window.prompt("快递单号(可选):", '');
    if (tn === null) return;
    if (!confirm('确认发货?')) return;
    void doPatch({ action: 'ship', trackingNo: tn || undefined });
  };

  const refund = () => {
    const reason = window.prompt("退款原因:", '');
    if (reason === null) return;
    if (!confirm('确认退款?将把订单置为已退款')) return;
    void doPatch({ action: 'refund', reason });
  };

  const complete = () => {
    if (!confirm('确认标为已完成?')) return;
    void doPatch({ action: 'complete' });
  };

  const cancel = () => {
    const reason = window.prompt("取消原因:", '');
    if (reason === null) return;
    if (!confirm('确认取消订单?')) return;
    void doPatch({ action: 'cancel', reason });
  };

  // 不同状态能用的动作
  const canShip = status === 'pending_ship';
  const canRefund = ['pending_ship', 'pending_receipt', 'pending_review', 'completed'].includes(status);
  const canComplete = ['pending_receipt', 'pending_review'].includes(status);
  const canCancel = ['pending_payment', 'pending_ship'].includes(status);

  if (!canShip && !canRefund && !canComplete && !canCancel) {
    return <span className={cx(styles.r_1dc571a3, styles.r_66a36c90)}>—</span>;
  }

  return (
    <div className={cx(styles.r_d89972fe, styles.r_bb0c4bfc, styles.r_2eba0d65)}>
      <button
        type="button"
        onClick={() => setMenuOpen((x) => !x)}
        disabled={busy}
        className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_5399e21f)}>

        {busy ? '…' : '操作 ▾'}
      </button>
      {menuOpen &&
      <>
          <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_236812d6)} onClick={() => setMenuOpen(false)} />
          <div className={cx(styles.r_da4dbfbc, styles.r_d8cdcad2, styles.r_145745bf, styles.r_b6b02c0e, styles.r_b67ee2ee, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_06bbb431)}>
            {canShip && <Item label="标发货" onClick={ship} />}
            {canComplete && <Item label="标完成" onClick={complete} />}
            {canRefund && <Item label="退款" danger onClick={refund} />}
            {canCancel && <Item label="取消" danger onClick={cancel} />}
          </div>
        </>
      }
    </div>);

}

function Item({ label, onClick, danger }: {label: string;onClick: () => void;danger?: boolean;}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
      danger ? cx(styles.r_0214b4b3, styles.r_6da6a3c3, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_2eba0d65, styles.r_d058ca6d, styles.r_b54428d1, styles.r_85cfcc24) : cx(styles.r_0214b4b3, styles.r_6da6a3c3, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_2eba0d65, styles.r_d058ca6d, styles.r_eb6abb1f, styles.r_5399e21f)


      }>

      {label}
    </button>);

}