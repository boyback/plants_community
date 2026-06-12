'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import { ALL_PERMISSIONS, LEVELS, PERMISSION_LABEL, type Permission } from '@/lib/levels';
import styles from './RolePermissionManager.module.scss';
import { cx } from '@/lib/style-utils';



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
  super_admin: '超级管理员'
};

const ROLE_HELP: Record<RoleKey, string> = {
  user: '影响所有普通用户的功能权限。',
  moderator: '影响所有版主账号；版主管辖范围仍在用户角色里单独设置。',
  admin: '影响所有管理员账号。',
  super_admin: '影响所有超级管理员账号。'
};

export function RolePermissionManager({
  rows,
  levelPermissions



}: {rows: RolePermissionRow[];levelPermissions: LevelPermissionRow[];}) {
  return (
    <div className={cx(styles.r_f3c543ad, styles.r_0c3bc985, styles.r_c5eca924)}>
      {rows.map((row) =>
      <RolePermissionCard key={row.roleKey} initial={row} levelPermissions={levelPermissions} />
      )}
    </div>);

}

export function LevelPermissionManager({ rows }: {rows: LevelPermissionRow[];}) {
  const router = useRouter();
  const [items, setItems] = useState<LevelPermissionRow[]>(rows);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const setLevel = (permission: Permission, level: number | null) => {
    setItems((list) =>
    list.map((item) => item.permission === permission ? { ...item, level } : item)
    );
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.patch("/api/admin/level-permissions", { permissions: items, note });
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
    <section className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_8e63407b)}>
      <div className={styles.r_da019856}>
        <h2 className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>等级默认权限</h2>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>
          设置每个功能从哪个等级开始默认解锁。选择“不按等级解锁”后，只能通过角色授予或 VIP 规则获得。
        </p>
      </div>
      <div className={cx(styles.r_f3c543ad, styles.r_77a2a20e, styles.r_e4d6f343, styles.r_b86f7f94)}>
        {items.map((item) =>
        <label key={item.permission} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_eb6e8b88)}>
            <span className={cx(styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_399e11a5)}>
              {PERMISSION_LABEL[item.permission]}
            </span>
            <span className={cx(styles.r_15e1b1f4, styles.r_0214b4b3, styles.r_0e65706b, styles.r_1dc571a3, styles.r_66a36c90)}>
              {item.permission}
            </span>
            <select
            value={item.level ?? ''}
            onChange={(e) =>
            setLevel(item.permission, e.target.value ? Number(e.target.value) : null)
            }
            className={cx(styles.r_50d0d216, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee, styles.r_359090c2, styles.r_df37b1fd, styles.r_1bd19725)}>

              <option value="">不按等级解锁</option>
              {LEVELS.map((level) =>
            <option key={level.level} value={level.level}>
                  Lv.{level.level} {level.name}
                </option>
            )}
            </select>
          </label>
        )}
      </div>
      <textarea
        className={cx(styles.r_eccd13ef, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_df37b1fd, styles.r_1bd19725)}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="备注原因(可选)" />

      <button type="button" className={cx(styles.r_eccd13ef, styles.r_6da6a3c3, styles.r_dd702538)} disabled={busy} onClick={save}>
        {busy ? '保存中...' : '保存等级默认权限'}
      </button>
    </section>);

}

function RolePermissionCard({
  initial,
  levelPermissions



}: {initial: RolePermissionRow;levelPermissions: LevelPermissionRow[];}) {
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
      await api.patch("/api/admin/role-permissions", {
        roleKey: initial.roleKey,
        grants,
        revokes,
        note
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
    <section className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_8e63407b)}>
      <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_60541e1e, styles.r_8ef2268e, styles.r_1004c0c3)}>
        <div>
          <h2 className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>{ROLE_LABEL[initial.roleKey]}</h2>
          <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>{ROLE_HELP[initial.roleKey]}</p>
        </div>
        <span className={cx(styles.r_ac204c10, styles.r_ce27a834, styles.r_d5eab218, styles.r_660d2eff, styles.r_0e65706b, styles.r_1dc571a3, styles.r_7b89cd85)}>
          {initial.roleKey}
        </span>
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_77a2a20e)}>
        {ALL_PERMISSIONS.map((perm) => {
          const effect = revokes.includes(perm) ? 'revoke' : grants.includes(perm) ? 'grant' : 'base';
          const requiredLevel = levelPermissions.find((item) => item.permission === perm)?.level ?? null;
          const defaultLabel = requiredLevel ? `Lv.${requiredLevel} 默认` : '不按等级解锁';
          return (
            <div key={perm} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_eb6e8b88)}>
              <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_8ef2268e, styles.r_1004c0c3)}>
                <div>
                  <div className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_399e11a5)}>{PERMISSION_LABEL[perm]}</div>
                  <div className={cx(styles.r_15e1b1f4, styles.r_0e65706b, styles.r_1dc571a3, styles.r_66a36c90)}>{perm}</div>
                </div>
                <span className={cx(styles.r_ac204c10, styles.r_ce27a834, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_7b89cd85)}>
                  {defaultLabel}
                </span>
              </div>
              <div className={cx(styles.r_eccd13ef, styles.r_f3c543ad, styles.r_be2e831b, styles.r_44ee8ba0, styles.r_d058ca6d)}>
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
            </div>);

        })}
      </div>

      <textarea
        className={cx(styles.r_eccd13ef, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_df37b1fd, styles.r_1bd19725)}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="备注原因(可选)" />

      <button type="button" className={cx(styles.r_eccd13ef, styles.r_6da6a3c3, styles.r_dd702538)} disabled={busy} onClick={save}>
        {busy ? '保存中...' : `保存${ROLE_LABEL[initial.roleKey]}权限`}
      </button>
    </section>);

}

function EffectButton({
  active,
  danger,
  onClick,
  children





}: {active: boolean;danger?: boolean;onClick: () => void;children: React.ReactNode;}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
      active ?
      danger ? cx(styles.r_07389a77, styles.r_25f650b2, styles.r_d5eab218, styles.r_660d2eff, styles.r_72a4c7cd) : cx(styles.r_07389a77, styles.r_01d0b06c, styles.r_d5eab218, styles.r_660d2eff, styles.r_72a4c7cd) :


      danger ? cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_3d496065, styles.r_d5eab218, styles.r_660d2eff, styles.r_b54428d1, styles.r_85cfcc24) : cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_d5eab218, styles.r_660d2eff, styles.r_02eb621e, styles.r_5399e21f)


      }>

      {children}
    </button>);

}