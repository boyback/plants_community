'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';

export function OrderRowActions({ orderId, status }: { orderId: string; status: string }) {
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
    const tn = window.prompt('快递单号(可选):', '');
    if (tn === null) return;
    if (!confirm('确认发货?')) return;
    void doPatch({ action: 'ship', trackingNo: tn || undefined });
  };

  const refund = () => {
    const reason = window.prompt('退款原因:', '');
    if (reason === null) return;
    if (!confirm('确认退款?将把订单置为已退款')) return;
    void doPatch({ action: 'refund', reason });
  };

  const complete = () => {
    if (!confirm('确认标为已完成?')) return;
    void doPatch({ action: 'complete' });
  };

  const cancel = () => {
    const reason = window.prompt('取消原因:', '');
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
    return <span className="text-[10px] text-ink-400">—</span>;
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setMenuOpen((x) => !x)}
        disabled={busy}
        className="rounded border border-ink-200 px-2 py-1 text-[11px] hover:bg-ink-50"
      >
        {busy ? '…' : '操作 ▾'}
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-28 overflow-hidden rounded-lg border border-ink-100 bg-white shadow-lg">
            {canShip && <Item label="标发货" onClick={ship} />}
            {canComplete && <Item label="标完成" onClick={complete} />}
            {canRefund && <Item label="退款" danger onClick={refund} />}
            {canCancel && <Item label="取消" danger onClick={cancel} />}
          </div>
        </>
      )}
    </div>
  );
}

function Item({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        danger
          ? 'block w-full px-3 py-1.5 text-left text-[11px] text-rose-700 hover:bg-rose-50'
          : 'block w-full px-3 py-1.5 text-left text-[11px] text-ink-700 hover:bg-ink-50'
      }
    >
      {label}
    </button>
  );
}
