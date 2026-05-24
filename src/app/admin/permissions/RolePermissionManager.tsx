'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';
import { ALL_PERMISSIONS, LEVELS, PERMISSION_LABEL, type Permission } from '@/lib/levels';

type RoleKey = 'user' | 'moderator' | 'admin' | 'super_admin';

type RolePermissionRow = {
  roleKey: RoleKey;
  grants: Permission[];
  revokes: Permission[];
};

export type LevelPermissionRow = {
  permission: Permission;
  level: number | null;
};

const ROLE_LABEL: Record<RoleKey, string> = {
  user: '普通用户',
  moderator: '版主',
  admin: '管理员',
  super_admin: '超级管理员',
};

const ROLE_HELP: Record<RoleKey, string> = {
  user: '影响所有普通用户的功能权限。',
  moderator: '影响所有版主账号；版主管辖范围仍在用户角色里单独设置。',
  admin: '影响所有管理员账号。',
  super_admin: '影响所有超级管理员账号。',
};

export function RolePermissionManager({
  rows,
  levelPermissions,
}: {
  rows: RolePermissionRow[];
  levelPermissions: LevelPermissionRow[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {rows.map((row) => (
        <RolePermissionCard key={row.roleKey} initial={row} levelPermissions={levelPermissions} />
      ))}
    </div>
  );
}

export function LevelPermissionManager({ rows }: { rows: LevelPermissionRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState<LevelPermissionRow[]>(rows);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const setLevel = (permission: Permission, level: number | null) => {
    setItems((list) =>
      list.map((item) => (item.permission === permission ? { ...item, level } : item))
    );
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.patch('/api/admin/level-permissions', { permissions: items, note });
      toast.success('已保存等级权限');
      router.refresh();
      setNote('');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-ink-100 bg-white p-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-ink-800">等级默认权限</h2>
        <p className="mt-1 text-xs text-ink-500">
          设置每个功能从哪个等级开始默认解锁。选择“不按等级解锁”后，只能通过角色授予或 VIP 规则获得。
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <label key={item.permission} className="rounded-lg border border-ink-100 p-3">
            <span className="block text-xs font-medium text-ink-800">
              {PERMISSION_LABEL[item.permission]}
            </span>
            <span className="mt-0.5 block font-mono text-[10px] text-ink-400">
              {item.permission}
            </span>
            <select
              value={item.level ?? ''}
              onChange={(e) =>
                setLevel(item.permission, e.target.value ? Number(e.target.value) : null)
              }
              className="mt-2 w-full rounded-lg border border-ink-200 px-2 py-1.5 text-xs outline-none focus:border-ink-400"
            >
              <option value="">不按等级解锁</option>
              {LEVELS.map((level) => (
                <option key={level.level} value={level.level}>
                  Lv.{level.level} {level.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <textarea
        className="mt-3 w-full rounded-lg border border-ink-200 px-3 py-2 text-xs outline-none focus:border-ink-400"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="备注原因(可选)"
      />
      <button type="button" className="btn-primary mt-3 w-full !text-xs" disabled={busy} onClick={save}>
        {busy ? '保存中...' : '保存等级默认权限'}
      </button>
    </section>
  );
}

function RolePermissionCard({
  initial,
  levelPermissions,
}: {
  initial: RolePermissionRow;
  levelPermissions: LevelPermissionRow[];
}) {
  const router = useRouter();
  const [grants, setGrants] = useState<Permission[]>(initial.grants);
  const [revokes, setRevokes] = useState<Permission[]>(initial.revokes);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const setEffect = (perm: Permission, effect: 'base' | 'grant' | 'revoke') => {
    setGrants((list) => list.filter((p) => p !== perm));
    setRevokes((list) => list.filter((p) => p !== perm));
    if (effect === 'grant') setGrants((list) => [...list, perm]);
    if (effect === 'revoke') setRevokes((list) => [...list, perm]);
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.patch('/api/admin/role-permissions', {
        roleKey: initial.roleKey,
        grants,
        revokes,
        note,
      });
      toast.success('已保存角色权限');
      router.refresh();
      setNote('');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-ink-100 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-800">{ROLE_LABEL[initial.roleKey]}</h2>
          <p className="mt-1 text-xs text-ink-500">{ROLE_HELP[initial.roleKey]}</p>
        </div>
        <span className="rounded-full bg-ink-50 px-2 py-1 font-mono text-[10px] text-ink-500">
          {initial.roleKey}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {ALL_PERMISSIONS.map((perm) => {
          const effect = revokes.includes(perm) ? 'revoke' : grants.includes(perm) ? 'grant' : 'base';
          const requiredLevel = levelPermissions.find((item) => item.permission === perm)?.level ?? null;
          const defaultLabel = requiredLevel ? `Lv.${requiredLevel} 默认` : '不按等级解锁';
          return (
            <div key={perm} className="rounded-lg border border-ink-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-ink-800">{PERMISSION_LABEL[perm]}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-ink-400">{perm}</div>
                </div>
                <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[10px] text-ink-500">
                  {defaultLabel}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 text-[11px]">
                <EffectButton active={effect === 'base'} onClick={() => setEffect(perm, 'base')}>
                  {defaultLabel}
                </EffectButton>
                <EffectButton active={effect === 'grant'} onClick={() => setEffect(perm, 'grant')}>
                  授予
                </EffectButton>
                <EffectButton active={effect === 'revoke'} danger onClick={() => setEffect(perm, 'revoke')}>
                  收回
                </EffectButton>
              </div>
            </div>
          );
        })}
      </div>

      <textarea
        className="mt-3 w-full rounded-lg border border-ink-200 px-3 py-2 text-xs outline-none focus:border-ink-400"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="备注原因(可选)"
      />
      <button type="button" className="btn-primary mt-3 w-full !text-xs" disabled={busy} onClick={save}>
        {busy ? '保存中...' : `保存${ROLE_LABEL[initial.roleKey]}权限`}
      </button>
    </section>
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
