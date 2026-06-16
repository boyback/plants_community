'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import { Dialog } from '@/components/ui/Dialog';
import styles from './UserRowActions.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';



type ModeratorScopeType = 'board' | 'genus' | 'species';

type ModeratorScopeValue = {
  type: ModeratorScopeType;
  targetId: string;
  targetName: string;
  targetPath: string;
};

type BoardNode = {
  id: string;
  level: 'category' | 'genus' | 'species';
  slug: string;
  name: string;
  latinName?: string | null;
  genera?: BoardNode[];
  species?: BoardNode[];
};

type ScopeOption = ModeratorScopeValue & {
  key: string;
  searchText: string;
};

export function UserRowActions({
  userId,
  userName,
  role,
  banned,
  moderatorScopes






}: {userId: string;userName: string;role: string;banned: boolean;moderatorScopes: ModeratorScopeValue[];}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);

  const doPatch = async (body: unknown, successMsg: string) => {
    setBusy(true);
    try {
      await api.patch(`/api/admin/users/${userId}`, body);
      router.refresh();
      toast.success(successMsg);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77c08e01, styles.r_58284b4e)}>
      {banned ?
      <button
        type="button"
        onClick={() => setBanOpen(true)}
        disabled={busy}
        className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_5756b7b4, styles.r_b29d8adb)}>

          解封
        </button> :

      <button
        type="button"
        onClick={() => setBanOpen(true)}
        disabled={busy}
        className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_959f4a9f, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_b54428d1, styles.r_85cfcc24, styles.r_b29d8adb)}>

          封禁
        </button>
      }
      <button
        type="button"
        onClick={() => setRoleOpen(true)}
        disabled={busy}
        className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_eb6abb1f, styles.r_5399e21f, styles.r_b29d8adb)}>

        角色
      </button>
      <button
        type="button"
        onClick={() => setPointsOpen(true)}
        disabled={busy}
        className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_eb6abb1f, styles.r_5399e21f, styles.r_b29d8adb)}>

        积分
      </button>
      {banOpen && (
      banned ?
      <ConfirmActionDialog
        open={banOpen}
        title="解封用户"
        message={`确认解封 ${userName}?`}
        confirmText="确认解封"
        busy={busy}
        onClose={() => setBanOpen(false)}
        onConfirm={() => doPatch({ unban: true }, '已解封').then(() => setBanOpen(false))} /> :


      <BanDialog
        open={banOpen}
        userName={userName}
        busy={busy}
        onClose={() => setBanOpen(false)}
        onSave={(days, reason) =>
        doPatch({ ban: { days, reason } }, '已封禁').then(() => setBanOpen(false))
        } />)


      }
      {roleOpen &&
      <RoleDialog
        open={roleOpen}
        userName={userName}
        currentRole={role}
        initialScopes={moderatorScopes}
        busy={busy}
        onClose={() => setRoleOpen(false)}
        onSave={(nextRole, scopes) =>
        doPatch(
          {
            role: nextRole,
            moderatorScopes:
            nextRole === 'moderator' ?
            scopes.map((scope) => ({ type: scope.type, targetId: scope.targetId })) :
            []
          },
          '已改角色'
        ).then(() => setRoleOpen(false))
        } />

      }
      {pointsOpen &&
      <PointsDialog
        open={pointsOpen}
        userName={userName}
        busy={busy}
        onClose={() => setPointsOpen(false)}
        onSave={(delta, reason) =>
        doPatch({ pointsDelta: delta, reason }, '已调整').then(() => setPointsOpen(false))
        } />

      }
    </div>);

}

function ConfirmActionDialog({
  open,
  title,
  message,
  confirmText,
  busy,
  onClose,
  onConfirm








}: {open: boolean;title: string;message: string;confirmText: string;busy: boolean;onClose: () => void;onConfirm: () => void;}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      actions={
      <>
          <button type="button" className={cx(styles.r_36e579c0, styles.r_dd702538)} onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="button" className={cx(styles.r_36e579c0, styles.r_dd702538)} onClick={onConfirm} disabled={busy}>
            {busy ? '处理中...' : confirmText}
          </button>
        </>
      }>

      <p>{message}</p>
    </Dialog>);

}

function BanDialog({
  open,
  userName,
  busy,
  onClose,
  onSave






}: {open: boolean;userName: string;busy: boolean;onClose: () => void;onSave: (days: number, reason: string) => Promise<void>;}) {
  const [days, setDays] = useState('7');
  const [reason, setReason] = useState('');

  const submit = () => {
    const parsed = Number(days);
    if (!Number.isFinite(parsed) || parsed < 0) return toast.error('封禁天数无效');
    void onSave(parsed, reason);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="封禁用户"
      maxWidth="sm"
      actions={
      <>
          <button type="button" className={cx(styles.r_36e579c0, styles.r_dd702538)} onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="button" className={cx(styles.r_36e579c0, styles.r_dd702538)} onClick={submit} disabled={busy}>
            {busy ? '处理中...' : '确认封禁'}
          </button>
        </>
      }>

      <div className={styles.r_6ed543e2}>
        <p className={cx(styles.r_359090c2, styles.r_7b89cd85)}>将封禁 {userName}。封禁期间用户无法登录、发帖或评论。</p>
        <label className={styles.r_0214b4b3}>
          <span className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f)}>封禁天数</span>
          <Input
            type="number"
            min={0}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className={styles.r_6da6a3c3} />

          <span className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_d058ca6d, styles.r_7b89cd85)}>填 0 表示永久封禁</span>
        </label>
        <label className={styles.r_0214b4b3}>
          <span className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f)}>封禁原因</span>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className={cx(styles.r_1faedad8, styles.r_6da6a3c3, styles.r_5bd7b080)}
            placeholder="展示给用户，也会写入管理日志" />

        </label>
      </div>
    </Dialog>);

}

function RoleDialog({
  open,
  userName,
  currentRole,
  initialScopes,
  busy,
  onClose,
  onSave








}: {open: boolean;userName: string;currentRole: string;initialScopes: ModeratorScopeValue[];busy: boolean;onClose: () => void;onSave: (role: 'user' | 'moderator' | 'admin', scopes: ModeratorScopeValue[]) => Promise<void>;}) {
  const [nextRole, setNextRole] = useState<'user' | 'moderator' | 'admin'>(
    currentRole === 'moderator' || currentRole === 'admin' ? currentRole : 'user'
  );
  const [scopes, setScopes] = useState<ModeratorScopeValue[]>(initialScopes);

  const submit = () => {
    if (nextRole === 'moderator' && scopes.length === 0) {
      toast.error('请选择至少一个版主管辖范围');
      return;
    }
    void onSave(nextRole, scopes);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="修改角色"
      maxWidth="lg"
      actions={
      <>
          <button type="button" className={cx(styles.r_36e579c0, styles.r_dd702538)} onClick={onClose} disabled={busy}>
            取消
          </button>
          <button
          type="button"
          className={cx(styles.r_36e579c0, styles.r_dd702538)}
          onClick={submit}
          disabled={
          busy ||
          nextRole === currentRole && (
          nextRole !== 'moderator' || sameScopes(scopes, initialScopes))
          }>

            {busy ? '保存中...' : '保存角色'}
          </button>
        </>
      }>

      <div className={styles.r_6ed543e2}>
        <p className={cx(styles.r_359090c2, styles.r_7b89cd85)}>{userName} 当前角色为 {currentRole}</p>
        <select
          value={nextRole}
          onChange={(e) => setNextRole(e.target.value as 'user' | 'moderator' | 'admin')}
          className={styles.r_6da6a3c3}>

          <option value="user">普通用户</option>
          <option value="moderator">版主</option>
          <option value="admin">管理员</option>
        </select>
        {nextRole === 'moderator' &&
        <ModeratorScopePicker value={scopes} onChange={setScopes} />
        }
      </div>
    </Dialog>);

}

function ModeratorScopePicker({
  value,
  onChange



}: {value: ModeratorScopeValue[];onChange: (value: ModeratorScopeValue[]) => void;}) {
  const [boards, setBoards] = useState<BoardNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.
    get<BoardNode[]>('/api/boards?kind=family&withSpecies=1').
    then((list) => {
      if (!cancelled) setBoards(Array.isArray(list) ? list : []);
    }).
    catch(() => {
      if (!cancelled) setBoards([]);
    }).
    finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => buildScopeOptions(boards), [boards]);
  const selectedKeys = useMemo(
    () => new Set(value.map((scope) => scopeKey(scope))),
    [value]
  );
  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.
    filter((option) => !selectedKeys.has(option.key)).
    filter((option) => !q || option.searchText.includes(q)).
    slice(0, 80);
  }, [options, query, selectedKeys]);
  const selectedOption = visibleOptions.find((option) => option.key === selectedKey) ?? visibleOptions[0];

  const addScope = () => {
    if (!selectedOption) return;
    onChange([
    ...value,
    {
      type: selectedOption.type,
      targetId: selectedOption.targetId,
      targetName: selectedOption.targetName,
      targetPath: selectedOption.targetPath
    }]
    );
    setSelectedKey('');
    setQuery('');
  };

  const removeScope = (scope: ModeratorScopeValue) => {
    const key = scopeKey(scope);
    onChange(value.filter((item) => scopeKey(item) !== key));
  };

  return (
    <div className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_2347842d, styles.r_eb6e8b88)}>
      <div className={cx(styles.r_a77ed4d9, styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f)}>版主管辖范围</div>
      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_77a2a20e, styles.r_829cfe19)}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.r_6da6a3c3}
          placeholder="搜索科、属、品种" />

        <select
          value={selectedOption?.key ?? ''}
          onChange={(e) => setSelectedKey(e.target.value)}
          className={styles.r_6da6a3c3}
          disabled={loading || visibleOptions.length === 0}>

          {loading && <option value="">加载中...</option>}
          {!loading && visibleOptions.length === 0 && <option value="">没有可选范围</option>}
          {!loading &&
          visibleOptions.map((option) =>
          <option key={option.key} value={option.key}>
                {scopeTypeLabel(option.type)} · {option.targetPath}
              </option>
          )}
        </select>
        <button type="button" className={styles.r_dd702538} onClick={addScope} disabled={!selectedOption}>
          添加
        </button>
      </div>
      <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_58284b4e)}>
        {value.length > 0 ?
        value.map((scope) =>
        <span
          key={scopeKey(scope)}
          className={cx(styles.r_52083e7d, styles.r_c0980a65, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_eb6abb1f, styles.r_3daca9af, styles.r_a283ee7a)}
          title={scope.targetPath}>

              <span className={cx(styles.r_012fbd12, styles.r_66a36c90)}>{scopeTypeLabel(scope.type)}</span>
              <span className={styles.r_f283ea9b}>{scope.targetPath}</span>
              <button
            type="button"
            className={cx(styles.r_b45ce4b6, styles.r_66a36c90, styles.r_744ff542)}
            onClick={() => removeScope(scope)}>

                x
              </button>
            </span>
        ) :

        <div className={cx(styles.r_d058ca6d, styles.r_595fceba)}>版主必须选择至少一个科、属或品种</div>
        }
      </div>
    </div>);

}

function buildScopeOptions(boards: BoardNode[]): ScopeOption[] {
  return boards.flatMap((board) => {
    const boardOption = createScopeOption('board', board.id, board.name, board.name, [
    board.name,
    board.slug,
    board.latinName ?? '']
    );
    const genusOptions = (board.genera ?? []).flatMap((genus) => {
      const genusPath = `${board.name} / ${genus.name}`;
      const genusOption = createScopeOption('genus', genus.id, genus.name, genusPath, [
      board.name,
      genus.name,
      genus.slug,
      genus.latinName ?? '']
      );
      const speciesOptions = (genus.species ?? []).map((item) =>
      createScopeOption('species', item.id, item.name, `${genusPath} / ${item.name}`, [
      board.name,
      genus.name,
      item.name,
      item.slug,
      item.latinName ?? '']
      )
      );
      return [genusOption, ...speciesOptions];
    });
    return [boardOption, ...genusOptions];
  });
}

function createScopeOption(
type: ModeratorScopeType,
targetId: string,
targetName: string,
targetPath: string,
searchParts: string[])
: ScopeOption {
  return {
    type,
    targetId,
    targetName,
    targetPath,
    key: `${type}:${targetId}`,
    searchText: searchParts.join(' ').toLowerCase()
  };
}

function scopeKey(scope: Pick<ModeratorScopeValue, 'type' | 'targetId'>) {
  return `${scope.type}:${scope.targetId}`;
}

function scopeTypeLabel(type: ModeratorScopeType) {
  if (type === 'board') return '科';
  if (type === 'genus') return '属';
  return '品种';
}

function sameScopes(a: ModeratorScopeValue[], b: ModeratorScopeValue[]) {
  const left = a.map(scopeKey).sort().join('|');
  const right = b.map(scopeKey).sort().join('|');
  return left === right;
}

function PointsDialog({
  open,
  userName,
  busy,
  onClose,
  onSave






}: {open: boolean;userName: string;busy: boolean;onClose: () => void;onSave: (delta: number, reason: string) => Promise<void>;}) {
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');

  const submit = () => {
    const parsed = parseInt(delta, 10);
    if (!Number.isFinite(parsed) || parsed === 0) return toast.error('积分调整值无效');
    void onSave(parsed, reason);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="积分调整"
      maxWidth="sm"
      actions={
      <>
          <button type="button" className={cx(styles.r_36e579c0, styles.r_dd702538)} onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="button" className={cx(styles.r_36e579c0, styles.r_dd702538)} onClick={submit} disabled={busy}>
            {busy ? '保存中...' : '确认调整'}
          </button>
        </>
      }>

      <div className={styles.r_6ed543e2}>
        <p className={cx(styles.r_359090c2, styles.r_7b89cd85)}>为 {userName} 增减积分，支持正数或负数。</p>
        <label className={styles.r_0214b4b3}>
          <span className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f)}>调整值</span>
          <Input
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            inputMode="numeric"
            className={styles.r_6da6a3c3}
            placeholder="例如 100 或 -50" />

        </label>
        <label className={styles.r_0214b4b3}>
          <span className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f)}>调整原因</span>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className={cx(styles.r_1faedad8, styles.r_6da6a3c3, styles.r_5bd7b080)}
            placeholder="会写入管理日志" />

        </label>
      </div>
    </Dialog>);

}
