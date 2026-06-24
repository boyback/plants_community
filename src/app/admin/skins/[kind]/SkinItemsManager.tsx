'use client';

import { useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Form } from 'radix-ui';
import ReactGPicker from 'react-gcolor-picker';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { toast } from '@/components/ui/Toast';
import styles from './page.module.scss';

export type SkinAdminKind = 'bubble' | 'reaction' | 'sticker';

export type SkinAdminConfig = {
  kind: SkinAdminKind;
  title: string;
  description: string;
  createLabel: string;
  itemLabel: string;
};

export type SkinAdminRow = {
  id: string;
  slug: string;
  kind: SkinAdminKind;
  name: string;
  preview: string;
  description: string;
  pricePoints: number;
  rarity: 'normal' | 'rare' | 'epic' | 'legendary';
  enabled: boolean;
  orderIdx: number;
  meta: string | null;
  ownerCount: number;
  createdAt: string;
};

type OperationKind = 'create' | 'save' | 'delete' | 'grant';

const RARITIES = ['normal', 'rare', 'epic', 'legendary'] as const;
const ICON_NAMES = new Set<string>(['thumbs-up', 'heart']);
const DEFAULT_SOLID_BG = '#ffffff';
const DEFAULT_GRADIENT_BG = 'linear-gradient(90deg, #ffffff 0.00%, #4010ff33 100.00%)';

type BubbleBgMode = 'solid' | 'gradient';

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

function stickersForRow(row?: SkinAdminRow) {
  const meta = parseMeta(row?.meta);
  const stickers = meta.stickers;
  if (Array.isArray(stickers)) return stickers.filter((item): item is string => typeof item === 'string');
  return row?.preview ? [row.preview] : [];
}

function reactionBeforeValue(row?: SkinAdminRow) {
  const meta = parseMeta(row?.meta);
  return typeof meta.beforeIcon === 'string' && meta.beforeIcon.trim() ? meta.beforeIcon.trim() : 'thumbs-up';
}

function reactionAfterValue(row?: SkinAdminRow) {
  const meta = parseMeta(row?.meta);
  if (typeof meta.emoji === 'string' && meta.emoji.trim()) return meta.emoji.trim();
  return row?.preview || '👍';
}

function isBubbleBgMode(value: unknown): value is BubbleBgMode {
  return value === 'solid' || value === 'gradient';
}

function isGradientValue(value: string) {
  return /(?:linear|radial|conic)-gradient\(/i.test(value);
}

function isHexColor(value: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim());
}

function parseHexGradientStop(stop: string) {
  const match = stop.trim().match(/^(#[0-9a-fA-F]{3,8})(?:\s+([\d.]+)%?)?$/);
  if (!match || !isHexColor(match[1])) return null;
  const position = match[2] === undefined ? null : Number(match[2]);
  if (position !== null && (!Number.isFinite(position) || position < 0 || position > 100)) return null;
  return { color: match[1], position };
}

function gradientStopsFromValue(value: string) {
  const args = splitGradientArgs(value);
  return firstGradientArgIsDirection(args[0] ?? '') ? args.slice(1) : args;
}

function hasOnlyHexGradientStops(value: string) {
  const stops = gradientStopsFromValue(value);
  return stops.length >= 2 && stops.every((stop) => Boolean(parseHexGradientStop(stop)));
}

function isCompleteGradientValue(value: string) {
  if (!isGradientValue(value)) return false;
  const start = value.indexOf('(');
  const end = value.lastIndexOf(')');
  if (start < 0 || end <= start || end !== value.trim().length - 1) return false;
  return hasOnlyHexGradientStops(value);
}

function bubbleBgMode(meta: Record<string, unknown>, bg: string): BubbleBgMode {
  return isBubbleBgMode(meta.bgMode) ? meta.bgMode : isGradientValue(bg) ? 'gradient' : 'solid';
}

function splitGradientArgs(value: string) {
  const start = value.indexOf('(');
  const end = value.lastIndexOf(')');
  if (start < 0 || end <= start) return [];
  const inner = value.slice(start + 1, end);
  const args: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of inner) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function firstGradientArgIsDirection(value: string) {
  return /^(to\s+|[-+]?\d+(?:\.\d+)?(?:deg|turn|rad)|circle|ellipse)/i.test(value.trim());
}

function alphaToHex(alpha: number) {
  return Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
}

function componentToHex(value: number) {
  return Math.round(Math.max(0, Math.min(255, value)))
    .toString(16)
    .padStart(2, '0');
}

function rgbGradientToHex(value: string) {
  return value.replace(/rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d?(?:\.\d+)?|1(?:\.0+)?))?\s*\)/gi, (_, r, g, b, a) => {
    const hex = `#${componentToHex(Number(r))}${componentToHex(Number(g))}${componentToHex(Number(b))}`;
    return a === undefined || Number(a) >= 1 ? hex : `${hex}${alphaToHex(Number(a))}`;
  });
}

function normalizeGradientForPicker(value: string) {
  if (!isGradientValue(value)) return DEFAULT_GRADIENT_BG;
  const hexValue = rgbGradientToHex(value);
  if (/\s\d+(?:\.\d+)?%/.test(hexValue)) return hexValue;
  const prefix = hexValue.slice(0, hexValue.indexOf('(') + 1);
  const args = splitGradientArgs(hexValue);
  if (args.length < 2) return DEFAULT_GRADIENT_BG;
  const hasDirection = firstGradientArgIsDirection(args[0]);
  const direction = hasDirection ? [args[0]] : [];
  const stops = hasDirection ? args.slice(1) : args;
  const parsedStops = stops.map(parseHexGradientStop);
  if (parsedStops.length < 2 || parsedStops.some((stop) => !stop)) return DEFAULT_GRADIENT_BG;
  const lastIndex = Math.max(1, stops.length - 1);
  const normalizedStops = parsedStops.map((stop, index) => {
    const position = stop?.position ?? (index / lastIndex) * 100;
    return `${stop?.color} ${position.toFixed(2)}%`;
  });
  return `${prefix}${[...direction, ...normalizedStops].join(', ')})`;
}

function normalizeBubblePickerValue(value: string, mode: BubbleBgMode) {
  if (mode === 'gradient') return normalizeGradientForPicker(value);
  return value && !isGradientValue(value) && isHexColor(value) ? value : DEFAULT_SOLID_BG;
}

function isIconName(value: string): value is IconName {
  return ICON_NAMES.has(value);
}

function detailsForRow(row: SkinAdminRow) {
  const meta = parseMeta(row.meta);
  if (row.kind === 'bubble') {
    const bg = typeof meta.bg === 'string' ? meta.bg : row.preview;
    const modeLabel = bubbleBgMode(meta, bg) === 'gradient' ? '渐变' : '纯色';
    return `${modeLabel} ${bg}`;
  }
  if (row.kind === 'reaction') {
    return `点赞前 ${reactionBeforeValue(row)} / 点赞后 ${reactionAfterValue(row)}`;
  }
  return stickersForRow(row).join(' ');
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; row: SkinAdminRow }
  | { type: 'grant'; row: SkinAdminRow }
  | { type: 'delete'; row: SkinAdminRow }
  | null;

export function SkinItemsManager({
  config,
  rows,
}: {
  config: SkinAdminConfig;
  rows: SkinAdminRow[];
}) {
  const [dialog, setDialog] = useState<DialogState>(null);

  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{config.title}</h1>
          <p className={styles.desc}>{config.description}</p>
        </div>
        <Button type="button" onClick={() => setDialog({ type: 'create' })}>
          {config.createLabel}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {config.kind === 'bubble' ? (
              <>
                <TableHead>气泡样式</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>所需兑换积分</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </>
            ) : (
              <>
            {config.kind === 'reaction' ? (
              <>
                <TableHead>点赞前</TableHead>
                <TableHead>点赞后</TableHead>
              </>
            ) : (
              <TableHead>预览</TableHead>
            )}
            <TableHead>名称</TableHead>
            <TableHead>配置</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>价格</TableHead>
            <TableHead>排序</TableHead>
            <TableHead>获得</TableHead>
            <TableHead>操作</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {config.kind === 'bubble' ? (
                <>
                  <TableCell>
                    <SkinPreviewCell row={row} />
                  </TableCell>
                  <TableCell>
                    <span className={row.enabled ? styles.enabledBadge : styles.disabledBadge}>
                      {row.enabled ? '上架' : '下架'}
                    </span>
                  </TableCell>
                  <TableCell>{row.pricePoints}</TableCell>
                  <TableCell>{row.orderIdx}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell>
                    <div className={styles.tableActions}>
                      <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ type: 'edit', row })}>
                        编辑
                      </Button>
                      <Button type="button" size="sm" variant="danger" onClick={() => setDialog({ type: 'delete', row })}>
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
              {config.kind === 'reaction' ? (
                <>
                  <TableCell>
                    <ReactionPreviewCell value={reactionBeforeValue(row)} />
                  </TableCell>
                  <TableCell>
                    <ReactionPreviewCell value={reactionAfterValue(row)} />
                  </TableCell>
                </>
              ) : (
                <TableCell>
                  <SkinPreviewCell row={row} />
                </TableCell>
              )}
              <TableCell>
                <div className={styles.name}>{row.name}</div>
                <div className={styles.slug}>{row.slug}</div>
              </TableCell>
              <TableCell>
                <div className={styles.detailText}>{detailsForRow(row)}</div>
                <div className={styles.slug}>{row.rarity}</div>
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
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {dialog?.type === 'create' && (
        <SkinDialog
          title={config.createLabel}
          config={config}
          operation="create"
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'edit' && (
        <SkinDialog
          title={config.kind === 'bubble' ? '编辑气泡' : `编辑 ${dialog.row.name}`}
          config={config}
          row={dialog.row}
          operation="save"
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'grant' && (
        <GrantDialog config={config} row={dialog.row} onClose={() => setDialog(null)} />
      )}
      {dialog?.type === 'delete' && (
        <DeleteDialog config={config} row={dialog.row} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

function operationSuccessMessage(operation: OperationKind) {
  if (operation === 'create') return '创建成功';
  if (operation === 'save') return '保存成功';
  if (operation === 'delete') return '删除成功';
  return '发放成功';
}

function operationFailMessage(operation: OperationKind) {
  if (operation === 'create') return '创建失败';
  if (operation === 'save') return '保存失败';
  if (operation === 'delete') return '删除失败';
  return '发放失败';
}

function useToastAction(operation: OperationKind, onClose: () => void) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('operation', operation);

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/skins', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json().catch(() => null) as { error?: { message?: string } } | null;
        if (!res.ok || data?.error) {
          throw new Error(data?.error?.message || operationFailMessage(operation));
        }
        toast.success(operationSuccessMessage(operation));
        onClose();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : operationFailMessage(operation));
      }
    });
  };

  return { onSubmit, pending };
}

function SkinPreviewCell({ row }: { row: SkinAdminRow }) {
  const meta = parseMeta(row.meta);
  if (row.kind === 'bubble') {
    const bg = typeof meta.bg === 'string' ? meta.bg : row.preview;
    return <div className={styles.bubblePreview} style={{ background: bg }} aria-label="气泡样式预览" />;
  }
  if (row.kind === 'reaction') {
    return <ReactionPreviewCell value={reactionAfterValue(row)} />;
  }
  return (
    <div className={styles.stickerPreview}>
      {stickersForRow(row).slice(0, 6).map((item, index) => (
        <span key={`${item}-${index}`}>{item}</span>
      ))}
    </div>
  );
}

function ReactionPreviewCell({ value }: { value: string }) {
  return (
    <div className={styles.reactionPreview}>
      {isIconName(value) ? <Icon name={value} size={26} /> : <span className={styles.reactionGlyph}>{value}</span>}
    </div>
  );
}

function SkinDialog({
  title,
  config,
  row,
  operation,
  onClose,
}: {
  title: string;
  config: SkinAdminConfig;
  row?: SkinAdminRow;
  operation: OperationKind;
  onClose: () => void;
}) {
  const meta = parseMeta(row?.meta);
  const bg = typeof meta.bg === 'string' ? meta.bg : row?.preview ?? '#ffffff';
  const bgMode = bubbleBgMode(meta, bg);
  const beforeIcon = reactionBeforeValue(row);
  const emoji = reactionAfterValue(row);
  const stickers = stickersForRow(row);
  const isBubble = config.kind === 'bubble';
  const [enabled, setEnabled] = useState(row?.enabled ?? true);

  const formAction = useToastAction(operation, onClose);

  return (
    <Dialog open onClose={onClose} title={title} maxWidth="fit">
      <Form.Root onSubmit={formAction.onSubmit} className={styles.dialogForm}>
        <input type="hidden" name="kind" value={config.kind} />
        {row && <input type="hidden" name="id" value={row.id} />}
        <div className={styles.formGrid}>
          {isBubble ? (
            <>
              <BubbleFields bg={bg} bgMode={bgMode} />
              <HorizontalFormRow name="pricePoints" label="所需兑换积分" required>
                <Form.Control asChild>
                  <Input
                    name="pricePoints"
                    type="number"
                    min="0"
                    required
                    defaultValue={row?.pricePoints ?? 0}
                    wrapperClassName={styles.compactInputWrap} />
                </Form.Control>
                <Form.Message match="valueMissing" className={styles.formMessage}>请输入所需兑换积分</Form.Message>
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
            </>
          ) : (
            <>
              <HorizontalFormRow name="slug" label="slug" required>
                <Form.Control asChild>
                  <Input name="slug" required defaultValue={row?.slug ?? ''} placeholder={`${config.kind}-new-name`} />
                </Form.Control>
                <Form.Message match="valueMissing" className={styles.formMessage}>请输入 slug</Form.Message>
              </HorizontalFormRow>
              <HorizontalFormRow name="name" label="名称" required>
                <Form.Control asChild>
                  <Input name="name" required defaultValue={row?.name ?? ''} placeholder={config.itemLabel} />
                </Form.Control>
                <Form.Message match="valueMissing" className={styles.formMessage}>请输入名称</Form.Message>
              </HorizontalFormRow>
              <HorizontalFormRow name="description" label="描述">
                <Form.Control asChild>
                  <textarea className={styles.textarea} name="description" defaultValue={row?.description ?? ''} />
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
              <KindFields config={config} row={row} beforeIcon={beforeIcon} emoji={emoji} stickers={stickers} />
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
            </>
          )}
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
              <Button type="submit" disabled={formAction.pending}>{row ? '保存' : '新增'}</Button>
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

function KindFields({
  config,
  row,
  beforeIcon,
  emoji,
  stickers,
}: {
  config: SkinAdminConfig;
  row?: SkinAdminRow;
  beforeIcon: string;
  emoji: string;
  stickers: string[];
}) {
  if (config.kind === 'reaction') {
    return (
      <>
        <HorizontalFormRow name="beforeIcon" label="点赞前" required>
          <Form.Control asChild>
            <Input name="beforeIcon" required defaultValue={beforeIcon} placeholder="thumbs-up 或 👍" />
          </Form.Control>
          <Form.Message match="valueMissing" className={styles.formMessage}>请输入点赞前样式</Form.Message>
        </HorizontalFormRow>
        <HorizontalFormRow name="emoji" label="点赞后" required>
          <Form.Control asChild>
            <Input name="emoji" required defaultValue={emoji} placeholder="🌿" />
          </Form.Control>
          <Form.Message match="valueMissing" className={styles.formMessage}>请输入点赞后样式</Form.Message>
        </HorizontalFormRow>
      </>
    );
  }
  return (
    <>
      <HorizontalFormRow name="preview" label="封面符号" required>
        <Form.Control asChild>
          <Input name="preview" required defaultValue={row?.preview ?? stickers[0] ?? ''} placeholder="🌱" />
        </Form.Control>
        <Form.Message match="valueMissing" className={styles.formMessage}>请输入封面符号</Form.Message>
      </HorizontalFormRow>
      <HorizontalFormRow name="stickers" label="表情列表" required>
        <Form.Control asChild>
          <textarea className={styles.textarea} name="stickers" required defaultValue={stickers.join(' ')} placeholder="🌱 🌿 🌵 🌷 🍀 🍃" />
        </Form.Control>
        <Form.Message match="valueMissing" className={styles.formMessage}>请输入表情列表</Form.Message>
      </HorizontalFormRow>
    </>
  );
}

function BubbleFields({ bg, bgMode }: { bg: string; bgMode: BubbleBgMode }) {
  const [mode, setMode] = useState<BubbleBgMode>(bgMode);
  const [value, setValue] = useState(() => normalizeBubblePickerValue(bg, bgMode));
  const [gradientInput, setGradientInput] = useState(() => normalizeGradientForPicker(bg));
  const [pickerSeed, setPickerSeed] = useState(() => normalizeBubblePickerValue(bg, bgMode));
  const currentBg = value || (mode === 'gradient' ? DEFAULT_GRADIENT_BG : DEFAULT_SOLID_BG);
  const isGradientInputInvalid = mode === 'gradient' && gradientInput.trim() !== '' && !isCompleteGradientValue(gradientInput);

  const commitValue = (nextValue: string) => {
    if (mode === 'gradient') {
      const normalized = normalizeGradientForPicker(nextValue);
      if (normalized === DEFAULT_GRADIENT_BG && !isCompleteGradientValue(rgbGradientToHex(nextValue))) return;
      setValue(normalized);
      setGradientInput(normalized);
      return;
    }
    setValue(isHexColor(nextValue) ? nextValue : DEFAULT_SOLID_BG);
  };

  const changeMode = (nextMode: BubbleBgMode) => {
    if (nextMode === mode) return;

    if (nextMode === 'gradient') {
      const nextGradient = isCompleteGradientValue(value)
        ? normalizeGradientForPicker(value)
        : isCompleteGradientValue(gradientInput)
          ? normalizeGradientForPicker(gradientInput)
          : DEFAULT_GRADIENT_BG;
      setMode('gradient');
      setGradientInput(nextGradient);
      setValue(nextGradient);
      setPickerSeed(nextGradient);
      return;
    }

    const nextSolid = isGradientValue(value) ? DEFAULT_SOLID_BG : value || DEFAULT_SOLID_BG;
    setMode(nextMode);
    setValue(nextSolid);
    setPickerSeed(nextSolid);
  };

  return (
    <HorizontalFormRow name="bg" label="气泡样式" required>
      <div className={styles.bubblePickerField}>
        <input type="hidden" name="bgMode" value={mode} />
        <input type="hidden" name="bg" value={currentBg} />
        <div className={styles.segmented}>
          <button
            type="button"
            className={mode === 'solid' ? styles.segmentActive : styles.segment}
            onClick={() => changeMode('solid')}>
            纯色
          </button>
          <button
            type="button"
            className={mode === 'gradient' ? styles.segmentActive : styles.segment}
            onClick={() => changeMode('gradient')}>
            渐变色
          </button>
        </div>
        <div className={styles.bubblePickerPreview} style={{ background: currentBg }} aria-label="气泡样式预览" />
        {mode === 'gradient' && (
          <div className={styles.gradientInputBlock}>
            <textarea
              className={styles.gradientInput}
              value={gradientInput}
              onChange={(event) => {
                const nextValue = event.target.value;
                setGradientInput(nextValue);
                if (isCompleteGradientValue(nextValue)) {
                  setValue(nextValue);
                  setPickerSeed(normalizeGradientForPicker(nextValue));
                }
              }}
              onBlur={() => {
                if (!isCompleteGradientValue(gradientInput)) return;
                const normalized = normalizeGradientForPicker(gradientInput);
                setGradientInput(normalized);
                setValue(normalized);
                setPickerSeed(normalized);
              }}
              spellCheck={false}
              placeholder="linear-gradient(90deg, #ffffff 0.00%,#002faf33 98.00%)"
              aria-invalid={isGradientInputInvalid} />
            {isGradientInputInvalid && <div className={styles.formMessage}>请输入 linear-gradient(...) 这种 CSS 渐变格式</div>}
          </div>
        )}
        <div className={styles.colorPickerBox}>
          <ReactGPicker
            key={`${mode}-${pickerSeed}`}
            value={pickerSeed}
            onChange={commitValue}
            format="hex"
            solid={mode === 'solid'}
            gradient={mode === 'gradient'}
            defaultActiveTab={mode}
            onChangeTabs={(tab) => {
              if (isBubbleBgMode(tab)) setMode(tab);
            }}
            showAlpha
            showInputs
            showGradientResult
            showGradientStops
            showGradientMode
            showGradientAngle
            showGradientPosition
            allowAddGradientStops
            debounce={mode === 'solid'}
            debounceMS={0}
            popupWidth={320}
            labels={{ solid: '纯色', gradient: '渐变', hex: '色值', alpha: '透明度' }}
          />
        </div>
      </div>
    </HorizontalFormRow>
  );
}

function GrantDialog({ config, row, onClose }: { config: SkinAdminConfig; row: SkinAdminRow; onClose: () => void }) {
  const formAction = useToastAction('grant', onClose);

  return (
    <Dialog open onClose={onClose} title={`发放 ${config.kind === 'bubble' ? config.itemLabel : row.name}`} maxWidth="sm">
      <Form.Root onSubmit={formAction.onSubmit} className={styles.dialogForm}>
        <input type="hidden" name="kind" value={config.kind} />
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
              <Button type="submit" disabled={formAction.pending}>发放</Button>
            </Form.Submit>
          </div>
        </div>
      </Form.Root>
    </Dialog>
  );
}

function DeleteDialog({ config, row, onClose }: { config: SkinAdminConfig; row: SkinAdminRow; onClose: () => void }) {
  const formAction = useToastAction('delete', onClose);

  return (
    <Dialog open onClose={onClose} title={`删除 ${config.kind === 'bubble' ? config.itemLabel : row.name}`} maxWidth="sm">
      <Form.Root onSubmit={formAction.onSubmit} className={styles.dialogForm}>
        <input type="hidden" name="kind" value={config.kind} />
        <input type="hidden" name="id" value={row.id} />
        <p className={styles.deleteText}>删除后，已获得该{config.itemLabel}的用户关联会被清理，正在佩戴的用户也会自动卸下。</p>
        <div className={styles.dialogActions}>
          <div className={styles.dialogActionButtons}>
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Form.Submit asChild>
              <Button type="submit" variant="danger" disabled={formAction.pending}>确认删除</Button>
            </Form.Submit>
          </div>
        </div>
      </Form.Root>
    </Dialog>
  );
}
