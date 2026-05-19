'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';
import { ALL_PERMISSIONS, PERMISSION_LABEL, permissionsForLevel, type Permission } from '@/lib/levels';

export function UserRowActions({
  userId,
  userName,
  role,
  banned,
  level,
  permissionOverrides,
}: {
  userId: string;
  userName: string;
  role: string;
  banned: boolean;
  level: number;
  permissionOverrides: { permission: string; effect: 'grant' | 'revoke' }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);

  const doPatch = async (body: unknown, successMsg: string) => {
    setBusy(true);
    setMenuOpen(false);
    try {
      await api.patch(`/api/admin/users/${userId}`, body);
      router.refresh();
      // 小 toast
      console.log(successMsg);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const ban = () => {
    const daysStr = window.prompt('封禁天数(0 = 永久):', '7');
    if (daysStr === null) return;
    const days = Number(daysStr);
    if (!Number.isFinite(days) || days < 0) return toast.error('天数无效');
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
    if (!['user', 'moderator', 'admin'].includes(next)) return toast.error('role 无效');
    if (next === role) return;
    if (!confirm(`确认改 ${userName} 的角色 → ${next}?`)) return;
    void doPatch({ role: next }, '已改角色');
  };

  const adjustPoints = () => {
    const deltaStr = window.prompt('积分调整(可正可负,如 100 或 -50):');
    if (!deltaStr) return;
    const delta = parseInt(deltaStr, 10);
    if (!Number.isFinite(delta) || delta === 0) return toast.error('数字无效');
    const reason = window.prompt('调整原因:', '');
    if (reason === null) return;
    if (!confirm(`确认为 ${userName} ${delta > 0 ? '+' : ''}${delta} 积分?`)) return;
    void doPatch({ pointsDelta: delta, reason }, '已调整');
  };

  const editPermissions = () => {
    setMenuOpen(false);
    setPermissionOpen(true);
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
            <MenuItem label="功能权限" onClick={editPermissions} />
            <MenuItem label="积分调整" onClick={adjustPoints} />
          </div>
        </>
      )}
      {permissionOpen && (
        <PermissionDialog
          userName={userName}
          level={level}
          overrides={permissionOverrides}
          busy={busy}
          onClose={() => setPermissionOpen(false)}
          onSave={(grants, revokes, note) =>
            doPatch({ permissions: { grants, revokes, note } }, '已更新权限').then(() =>
              setPermissionOpen(false)
            )
          }
        />
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

function PermissionDialog({
  userName,
  level,
  overrides,
  busy,
  onClose,
  onSave,
}: {
  userName: string;
  level: number;
  overrides: { permission: string; effect: 'grant' | 'revoke' }[];
  busy: boolean;
  onClose: () => void;
  onSave: (grants: Permission[], revokes: Permission[], note: string) => Promise<void>;
}) {
  const [grants, setGrants] = useState<Permission[]>(
    overrides.filter((p) => p.effect === 'grant').map((p) => p.permission as Permission)
  );
  const [revokes, setRevokes] = useState<Permission[]>(
    overrides.filter((p) => p.effect === 'revoke').map((p) => p.permission as Permission)
  );
  const [note, setNote] = useState('');
  const base = new Set(permissionsForLevel(level));

  const setEffect = (perm: Permission, effect: 'base' | 'grant' | 'revoke') => {
    setGrants((list) => list.filter((p) => p !== perm));
    setRevokes((list) => list.filter((p) => p !== perm));
    if (effect === 'grant') setGrants((list) => [...list, perm]);
    if (effect === 'revoke') setRevokes((list) => [...list, perm]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/30 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-ink-100 bg-white shadow-xl">
        <div className="border-b border-ink-100 px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900">功能权限分配</h2>
          <p className="mt-1 text-xs text-ink-500">
            {userName} · Lv.{level} 默认权限可被额外授予或显式收回
          </p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {ALL_PERMISSIONS.map((perm) => {
              const effect = revokes.includes(perm)
                ? 'revoke'
                : grants.includes(perm)
                ? 'grant'
                : 'base';
              return (
                <div key={perm} className="rounded-lg border border-ink-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-ink-800">
                        {PERMISSION_LABEL[perm]}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-ink-400">
                        {perm}
                      </div>
                    </div>
                    <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] text-ink-500">
                      默认{base.has(perm) ? '有' : '无'}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1 text-[11px]">
                    <EffectButton active={effect === 'base'} onClick={() => setEffect(perm, 'base')}>
                      默认
                    </EffectButton>
                    <EffectButton active={effect === 'grant'} onClick={() => setEffect(perm, 'grant')}>
                      授予
                    </EffectButton>
                    <EffectButton
                      active={effect === 'revoke'}
                      danger
                      onClick={() => setEffect(perm, 'revoke')}
                    >
                      收回
                    </EffectButton>
                  </div>
                </div>
              );
            })}
          </div>
          <textarea
            className="mt-4 w-full rounded-lg border border-ink-200 px-3 py-2 text-xs outline-none focus:border-ink-400"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="备注原因(可选)"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-4">
          <button type="button" className="btn-outline !text-xs" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button
            type="button"
            className="btn-primary !text-xs"
            disabled={busy}
            onClick={() => onSave(grants, revokes, note)}
          >
            {busy ? '保存中...' : '保存权限'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EffectButton({
  active,
  danger,
  onClick,
  children,
}: {
  active: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? danger
            ? 'rounded bg-rose-600 px-2 py-1 text-white'
            : 'rounded bg-ink-800 px-2 py-1 text-white'
          : danger
          ? 'rounded border border-rose-100 px-2 py-1 text-rose-700 hover:bg-rose-50'
          : 'rounded border border-ink-100 px-2 py-1 text-ink-600 hover:bg-ink-50'
      }
    >
      {children}
    </button>
  );
}
