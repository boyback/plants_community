'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';

export function UserRowActions({
  userId,
  userName,
  role,
  banned,
}: {
  userId: string;
  userName: string;
  role: string;
  banned: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const doPatch = async (body: unknown, successMsg: string) => {
    setBusy(true);
    setMenuOpen(false);
    try {
      await api.patch(`/api/admin/users/${userId}`, body);
      router.refresh();
      // 小 toast
      console.log(successMsg);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const ban = () => {
    const daysStr = window.prompt('封禁天数(0 = 永久):', '7');
    if (daysStr === null) return;
    const days = Number(daysStr);
    if (!Number.isFinite(days) || days < 0) return alert('天数无效');
    const reason = window.prompt('封禁原因(展示给用户):', '') ?? '';
    if (!confirm(`确认封禁 ${userName} ${days === 0 ? '永久' : days + ' 天'}?`)) return;
    void doPatch({ ban: { days, reason } }, '已封禁');
  };

  const unban = () => {
    if (!confirm(`确认解封 ${userName}?`)) return;
    void doPatch({ unban: true }, '已解封');
  };

  const changeRole = () => {
    const next = window.prompt(
      `${userName} 当前 role=${role},改为?\n可选:user / moderator / admin`,
      role
    );
    if (!next) return;
    if (!['user', 'moderator', 'admin'].includes(next)) return alert('role 无效');
    if (next === role) return;
    if (!confirm(`确认改 ${userName} 的角色 → ${next}?`)) return;
    void doPatch({ role: next }, '已改角色');
  };

  const adjustPoints = () => {
    const deltaStr = window.prompt('积分调整(可正可负,如 100 或 -50):');
    if (!deltaStr) return;
    const delta = parseInt(deltaStr, 10);
    if (!Number.isFinite(delta) || delta === 0) return alert('数字无效');
    const reason = window.prompt('调整原因:', '');
    if (reason === null) return;
    if (!confirm(`确认为 ${userName} ${delta > 0 ? '+' : ''}${delta} 积分?`)) return;
    void doPatch({ pointsDelta: delta, reason }, '已调整');
  };

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
          <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-ink-100 bg-white shadow-lg">
            {banned ? (
              <MenuItem label="解封" onClick={unban} />
            ) : (
              <MenuItem label="封禁" danger onClick={ban} />
            )}
            <MenuItem label="改角色" onClick={changeRole} />
            <MenuItem label="积分调整" onClick={adjustPoints} />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
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
