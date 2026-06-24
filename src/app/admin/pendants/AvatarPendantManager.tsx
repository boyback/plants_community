'use client';

import { useState, type ReactNode } from 'react';
import { Form } from 'radix-ui';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import styles from './page.module.scss';

export type PendantAdminRow = {
  id: string;
  slug: string;
  name: string;
  preview: string;
  description: string;
  pricePoints: number;
  rarity: 'normal' | 'rare' | 'epic' | 'legendary';
  enabled: boolean;
  orderIdx: number;
  meta: string | null;
  ownerCount: number;
};

type ServerAction = (formData: FormData) => void | Promise<void>;

const RARITIES = ['normal', 'rare', 'epic', 'legendary'] as const;
const UNLOCK_TYPES = [
  { value: 'achievement', label: '成就解锁' },
  { value: 'event', label: '活动解锁' },
  { value: 'trade', label: '交易解锁' },
  { value: 'admin', label: '后台发放' },
  { value: 'points', label: '积分兑换' },
] as const;

function parseMeta(meta?: string | null) {
  if (!meta) return {};
  try {
    const parsed = JSON.parse(meta) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function assetUrlForSkin(row: PendantAdminRow) {
  const meta = parseMeta(row.meta);
  if (typeof meta.assetUrl === 'string' && meta.assetUrl.trim()) return meta.assetUrl.trim();
  return row.preview.startsWith('/') ? row.preview : '';
}

function unlockInfo(row: PendantAdminRow) {
  const meta = parseMeta(row.meta);
  return {
    unlockType: typeof meta.unlockType === 'string' ? meta.unlockType : 'achievement',
    unlockLabel: typeof meta.unlockLabel === 'string' ? meta.unlockLabel : '通过社区玩法解锁',
    unlockDescription: typeof meta.unlockDescription === 'string' ? meta.unlockDescription : '',
  };
}

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; row: PendantAdminRow }
  | { type: 'grant'; row: PendantAdminRow }
  | { type: 'delete'; row: PendantAdminRow }
  | null;

export function AvatarPendantManager({
  rows,
  createAction,
  saveAction,
  deleteAction,
  grantAction,
}: {
  rows: PendantAdminRow[];
  createAction: ServerAction;
  saveAction: ServerAction;
  deleteAction: ServerAction;
  grantAction: ServerAction;
}) {
  const [dialog, setDialog] = useState<DialogState>(null);

  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>头像挂饰配置</h1>
          <p className={styles.desc}>读取并维护数据库中的 SkinItem(kind=pendant)，C 端只展示数据库里上架的挂饰。</p>
        </div>
        <Button type="button" onClick={() => setDialog({ type: 'create' })}>
          新增挂饰
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>icon</TableHead>
            <TableHead>名称</TableHead>
            <TableHead>解锁条件</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>价格</TableHead>
            <TableHead>排序</TableHead>
            <TableHead>获得</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const assetUrl = assetUrlForSkin(row);
            const unlock = unlockInfo(row);
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <div className={styles.tablePreview}>
                    {assetUrl ? <img src={assetUrl} alt={row.name} /> : <span>无</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className={styles.name}>{row.name}</div>
                  <div className={styles.slug}>{row.slug}</div>
                </TableCell>
                <TableCell>
                  <div className={styles.unlockLabel}>{unlock.unlockLabel}</div>
                  <div className={styles.slug}>{UNLOCK_TYPES.find((item) => item.value === unlock.unlockType)?.label ?? unlock.unlockType}</div>
                </TableCell>
                <TableCell>
                  <span className={row.enabled ? styles.enabledBadge : styles.disabledBadge}>
                    {row.enabled ? '上架' : '下架'}
                  </span>
                </TableCell>
                <TableCell>{row.pricePoints}</TableCell>
                <TableCell>{row.orderIdx}</TableCell>
                <TableCell>{row.ownerCount}</TableCell>
                <TableCell>
                  <div className={styles.tableActions}>
                    <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ type: 'edit', row })}>
                      编辑
                    </Button>
                    <Button type="button" size="sm" variant="muted" onClick={() => setDialog({ type: 'grant', row })}>
                      发放
                    </Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => setDialog({ type: 'delete', row })}>
                      删除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {dialog?.type === 'create' && (
        <PendantDialog
          title="新增头像挂饰"
          action={createAction}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'edit' && (
        <PendantDialog
          title={`编辑 ${dialog.row.name}`}
          row={dialog.row}
          action={saveAction}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'grant' && (
        <GrantDialog row={dialog.row} action={grantAction} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'delete' && (
        <DeleteDialog row={dialog.row} action={deleteAction} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

function PendantDialog({
  title,
  row,
  action,
  onClose,
}: {
  title: string;
  row?: PendantAdminRow;
  action: ServerAction;
  onClose: () => void;
}) {
  const assetUrl = row ? assetUrlForSkin(row) : '';
  const unlock = row ? unlockInfo(row) : { unlockType: 'achievement', unlockLabel: '', unlockDescription: '' };
  const [enabled, setEnabled] = useState(row?.enabled ?? true);

  return (
    <Dialog open onClose={onClose} title={title} maxWidth="fit">
      <Form.Root action={action} className={styles.dialogForm}>
        {row && <input type="hidden" name="id" value={row.id} />}
        <div className={styles.formGrid}>
          <HorizontalFormRow name="slug" label="slug" required>
            <Form.Control asChild>
              <Input name="slug" required defaultValue={row?.slug ?? ''} placeholder="pendant-new-name" />
            </Form.Control>
            <Form.Message match="valueMissing" className={styles.formMessage}>请输入 slug</Form.Message>
          </HorizontalFormRow>
          <HorizontalFormRow name="name" label="名称" required>
            <Form.Control asChild>
              <Input name="name" required defaultValue={row?.name ?? ''} placeholder="头像挂饰名称" />
            </Form.Control>
            <Form.Message match="valueMissing" className={styles.formMessage}>请输入名称</Form.Message>
          </HorizontalFormRow>
          <HorizontalFormRow name="assetUrl" label="icon 路径" required>
            <Form.Control asChild>
              <Input name="assetUrl" required defaultValue={assetUrl} placeholder="/design/pendants/example.svg" />
            </Form.Control>
            <Form.Message match="valueMissing" className={styles.formMessage}>请输入 icon 路径</Form.Message>
          </HorizontalFormRow>
          <HorizontalFormRow name="description" label="描述">
            <Form.Control asChild>
              <textarea className={styles.textarea} name="description" defaultValue={row?.description ?? ''} />
            </Form.Control>
          </HorizontalFormRow>
          <HorizontalFormRow name="unlockType" label="解锁方式">
            <Form.Control asChild>
              <select className={styles.input} name="unlockType" defaultValue={unlock.unlockType}>
                {UNLOCK_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </Form.Control>
          </HorizontalFormRow>
          <HorizontalFormRow name="unlockLabel" label="解锁文案">
            <Form.Control asChild>
              <Input name="unlockLabel" defaultValue={unlock.unlockLabel} placeholder="连续签到 7 天" />
            </Form.Control>
          </HorizontalFormRow>
          <HorizontalFormRow name="unlockDescription" label="解锁说明">
            <Form.Control asChild>
              <Input name="unlockDescription" defaultValue={unlock.unlockDescription} placeholder="未解锁时展示给用户的说明" />
            </Form.Control>
          </HorizontalFormRow>
          <HorizontalFormRow name="rarity" label="稀有度">
            <Form.Control asChild>
              <select className={styles.input} name="rarity" defaultValue={row?.rarity ?? 'normal'}>
                {RARITIES.map((rarity) => (
                  <option key={rarity} value={rarity}>{rarity}</option>
                ))}
              </select>
            </Form.Control>
          </HorizontalFormRow>
          <HorizontalFormRow name="pricePoints" label="价格" required>
            <Form.Control asChild>
              <Input
                name="pricePoints"
                type="number"
                min="0"
                required
                defaultValue={row?.pricePoints ?? 0}
                wrapperClassName={styles.compactInputWrap} />
            </Form.Control>
            <Form.Message match="valueMissing" className={styles.formMessage}>请输入价格</Form.Message>
          </HorizontalFormRow>
          <HorizontalFormRow name="orderIdx" label="排序">
            <Form.Control asChild>
              <Input
                name="orderIdx"
                type="number"
                defaultValue={row?.orderIdx ?? 0}
                wrapperClassName={styles.compactInputWrap} />
            </Form.Control>
          </HorizontalFormRow>
          <HorizontalFormRow name="enabled" label="上架状态">
            <div className={styles.switchControl}>
              <input type="hidden" name="enabled" value={enabled ? '1' : '0'} />
              <Form.Control asChild>
                <Switch checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              </Form.Control>
            </div>
          </HorizontalFormRow>
        </div>
        <div className={styles.dialogActions}>
          <div className={styles.dialogActionButtons}>
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Form.Submit asChild>
              <Button type="submit">{row ? '保存' : '新增'}</Button>
            </Form.Submit>
          </div>
        </div>
      </Form.Root>
    </Dialog>
  );
}

function HorizontalFormRow({
  name,
  label,
  required = false,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Form.Field name={name} className={styles.horizontalFormRow}>
      <Form.Label className={styles.horizontalFormLabel}>
        {required && <span className={styles.requiredMark}>*</span>}
        {label}
      </Form.Label>
      <div className={styles.horizontalFormControl}>{children}</div>
    </Form.Field>
  );
}

function GrantDialog({ row, action, onClose }: { row: PendantAdminRow; action: ServerAction; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} title={`发放 ${row.name}`} maxWidth="sm">
      <Form.Root action={action} className={styles.dialogForm}>
        <input type="hidden" name="id" value={row.id} />
        <Form.Field name="grantUserId" className={styles.label}>
          <Form.Label>用户 ID</Form.Label>
          <Form.Control asChild>
            <Input name="grantUserId" required placeholder="输入用户 ID" />
          </Form.Control>
          <Form.Message match="valueMissing" className={styles.formMessage}>请输入用户 ID</Form.Message>
        </Form.Field>
        <div className={styles.dialogActions}>
          <div className={styles.dialogActionButtons}>
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Form.Submit asChild>
              <Button type="submit">发放</Button>
            </Form.Submit>
          </div>
        </div>
      </Form.Root>
    </Dialog>
  );
}

function DeleteDialog({ row, action, onClose }: { row: PendantAdminRow; action: ServerAction; onClose: () => void }) {
  return (
    <Dialog open onClose={onClose} title={`删除 ${row.name}`} maxWidth="sm">
      <Form.Root action={action} className={styles.dialogForm}>
        <input type="hidden" name="id" value={row.id} />
        <p className={styles.deleteText}>删除后，已获得该挂饰的用户关联也会被级联清理。</p>
        <div className={styles.dialogActions}>
          <div className={styles.dialogActionButtons}>
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Form.Submit asChild>
              <Button type="submit" variant="danger">确认删除</Button>
            </Form.Submit>
          </div>
        </div>
      </Form.Root>
    </Dialog>
  );
}
