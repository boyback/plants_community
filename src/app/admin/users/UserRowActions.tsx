'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';
import { Dialog } from '@/components/ui/Dialog';

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
  moderatorScopes,
}: {
  userId: string;
  userName: string;
  role: string;
  banned: boolean;
  moderatorScopes: ModeratorScopeValue[];
}) {
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
    <div className="flex flex-wrap justify-end gap-1.5">
      {banned ? (
        <button
          type="button"
          onClick={() => setBanOpen(true)}
          disabled={busy}
          className="rounded border border-leaf-200 px-2 py-1 text-[11px] text-leaf-700 hover:bg-leaf-50 disabled:opacity-50"
        >
          解封
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setBanOpen(true)}
          disabled={busy}
          className="rounded border border-rose-200 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50 disabled:opacity-50"
        >
          封禁
        </button>
      )}
      <button
        type="button"
        onClick={() => setRoleOpen(true)}
        disabled={busy}
        className="rounded border border-ink-200 px-2 py-1 text-[11px] text-ink-700 hover:bg-ink-50 disabled:opacity-50"
      >
        角色
      </button>
      <button
        type="button"
        onClick={() => setPointsOpen(true)}
        disabled={busy}
        className="rounded border border-ink-200 px-2 py-1 text-[11px] text-ink-700 hover:bg-ink-50 disabled:opacity-50"
      >
        积分
      </button>
      {banOpen && (
        banned ? (
          <ConfirmActionDialog
            open={banOpen}
            title="解封用户"
            message={`确认解封 ${userName}?`}
            confirmText="确认解封"
            busy={busy}
            onClose={() => setBanOpen(false)}
            onConfirm={() => doPatch({ unban: true }, '已解封').then(() => setBanOpen(false))}
          />
        ) : (
          <BanDialog
            open={banOpen}
            userName={userName}
            busy={busy}
            onClose={() => setBanOpen(false)}
            onSave={(days, reason) =>
              doPatch({ ban: { days, reason } }, '已封禁').then(() => setBanOpen(false))
            }
          />
        )
      )}
      {roleOpen && (
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
                  nextRole === 'moderator'
                    ? scopes.map((scope) => ({ type: scope.type, targetId: scope.targetId }))
                    : [],
              },
              '已改角色'
            ).then(() => setRoleOpen(false))
          }
        />
      )}
      {pointsOpen && (
        <PointsDialog
          open={pointsOpen}
          userName={userName}
          busy={busy}
          onClose={() => setPointsOpen(false)}
          onSave={(delta, reason) =>
            doPatch({ pointsDelta: delta, reason }, '已调整').then(() => setPointsOpen(false))
          }
        />
      )}
    </div>
  );
}

function ConfirmActionDialog({
  open,
  title,
  message,
  confirmText,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      actions={
        <>
          <button type="button" className="btn-outline flex-1 !text-xs" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="button" className="btn-primary flex-1 !text-xs" onClick={onConfirm} disabled={busy}>
            {busy ? '处理中...' : confirmText}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Dialog>
  );
}

function BanDialog({
  open,
  userName,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  userName: string;
  busy: boolean;
  onClose: () => void;
  onSave: (days: number, reason: string) => Promise<void>;
}) {
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
          <button type="button" className="btn-outline flex-1 !text-xs" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="button" className="btn-primary flex-1 !text-xs" onClick={submit} disabled={busy}>
            {busy ? '处理中...' : '确认封禁'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-ink-500">将封禁 {userName}。封禁期间用户无法登录、发帖或评论。</p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-700">封禁天数</span>
          <input
            type="number"
            min={0}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="input w-full"
          />
          <span className="mt-1 block text-[11px] text-ink-500">填 0 表示永久封禁</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-700">封禁原因</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="input min-h-[84px] w-full resize-y"
            placeholder="展示给用户，也会写入管理日志"
          />
        </label>
      </div>
    </Dialog>
  );
}

function RoleDialog({
  open,
  userName,
  currentRole,
  initialScopes,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  userName: string;
  currentRole: string;
  initialScopes: ModeratorScopeValue[];
  busy: boolean;
  onClose: () => void;
  onSave: (role: 'user' | 'moderator' | 'admin', scopes: ModeratorScopeValue[]) => Promise<void>;
}) {
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
          <button type="button" className="btn-outline flex-1 !text-xs" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button
            type="button"
            className="btn-primary flex-1 !text-xs"
            onClick={submit}
            disabled={
              busy ||
              (nextRole === currentRole &&
                (nextRole !== 'moderator' || sameScopes(scopes, initialScopes)))
            }
          >
            {busy ? '保存中...' : '保存角色'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-ink-500">{userName} 当前角色为 {currentRole}</p>
        <select
          value={nextRole}
          onChange={(e) => setNextRole(e.target.value as 'user' | 'moderator' | 'admin')}
          className="input w-full"
        >
          <option value="user">普通用户</option>
          <option value="moderator">版主</option>
          <option value="admin">管理员</option>
        </select>
        {nextRole === 'moderator' && (
          <ModeratorScopePicker value={scopes} onChange={setScopes} />
        )}
      </div>
    </Dialog>
  );
}

function ModeratorScopePicker({
  value,
  onChange,
}: {
  value: ModeratorScopeValue[];
  onChange: (value: ModeratorScopeValue[]) => void;
}) {
  const [boards, setBoards] = useState<BoardNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<BoardNode[]>('/api/boards?kind=family&withSpecies=1')
      .then((list) => {
        if (!cancelled) setBoards(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setBoards([]);
      })
      .finally(() => {
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
    return options
      .filter((option) => !selectedKeys.has(option.key))
      .filter((option) => !q || option.searchText.includes(q))
      .slice(0, 80);
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
        targetPath: selectedOption.targetPath,
      },
    ]);
    setSelectedKey('');
    setQuery('');
  };

  const removeScope = (scope: ModeratorScopeValue) => {
    const key = scopeKey(scope);
    onChange(value.filter((item) => scopeKey(item) !== key));
  };

  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50/50 p-3">
      <div className="mb-2 text-xs font-medium text-ink-700">版主管辖范围</div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input w-full"
          placeholder="搜索科、属、品种"
        />
        <select
          value={selectedOption?.key ?? ''}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="input w-full"
          disabled={loading || visibleOptions.length === 0}
        >
          {loading && <option value="">加载中...</option>}
          {!loading && visibleOptions.length === 0 && <option value="">没有可选范围</option>}
          {!loading &&
            visibleOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {scopeTypeLabel(option.type)} · {option.targetPath}
              </option>
            ))}
        </select>
        <button type="button" className="btn-outline !text-xs" onClick={addScope} disabled={!selectedOption}>
          添加
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {value.length > 0 ? (
          value.map((scope) => (
            <span
              key={scopeKey(scope)}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] text-ink-700 ring-1 ring-ink-100"
              title={scope.targetPath}
            >
              <span className="shrink-0 text-ink-400">{scopeTypeLabel(scope.type)}</span>
              <span className="truncate">{scope.targetPath}</span>
              <button
                type="button"
                className="ml-0.5 text-ink-400 hover:text-rose-600"
                onClick={() => removeScope(scope)}
              >
                x
              </button>
            </span>
          ))
        ) : (
          <div className="text-[11px] text-rose-600">版主必须选择至少一个科、属或品种</div>
        )}
      </div>
    </div>
  );
}

function buildScopeOptions(boards: BoardNode[]): ScopeOption[] {
  return boards.flatMap((board) => {
    const boardOption = createScopeOption('board', board.id, board.name, board.name, [
      board.name,
      board.slug,
      board.latinName ?? '',
    ]);
    const genusOptions = (board.genera ?? []).flatMap((genus) => {
      const genusPath = `${board.name} / ${genus.name}`;
      const genusOption = createScopeOption('genus', genus.id, genus.name, genusPath, [
        board.name,
        genus.name,
        genus.slug,
        genus.latinName ?? '',
      ]);
      const speciesOptions = (genus.species ?? []).map((item) =>
        createScopeOption('species', item.id, item.name, `${genusPath} / ${item.name}`, [
          board.name,
          genus.name,
          item.name,
          item.slug,
          item.latinName ?? '',
        ])
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
  searchParts: string[]
): ScopeOption {
  return {
    type,
    targetId,
    targetName,
    targetPath,
    key: `${type}:${targetId}`,
    searchText: searchParts.join(' ').toLowerCase(),
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
  onSave,
}: {
  open: boolean;
  userName: string;
  busy: boolean;
  onClose: () => void;
  onSave: (delta: number, reason: string) => Promise<void>;
}) {
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
          <button type="button" className="btn-outline flex-1 !text-xs" onClick={onClose} disabled={busy}>
            取消
          </button>
          <button type="button" className="btn-primary flex-1 !text-xs" onClick={submit} disabled={busy}>
            {busy ? '保存中...' : '确认调整'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-ink-500">为 {userName} 增减积分，支持正数或负数。</p>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-700">调整值</span>
          <input
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            inputMode="numeric"
            className="input w-full"
            placeholder="例如 100 或 -50"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-700">调整原因</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="input min-h-[84px] w-full resize-y"
            placeholder="会写入管理日志"
          />
        </label>
      </div>
    </Dialog>
  );
}
