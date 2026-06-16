'use client';

import { useRef, useState } from 'react';
import { api, ApiError } from "@/lib/client-api";
import { CropImageDialog } from '@/components/upload/CropImageDialog';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent } from
"@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy } from
"@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from './CategoryEditDialog.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';



interface Board {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  kind: string;
  description?: string;
  cover: string;
  icons: string[];
  members?: number;
  orderIdx: number;
  enabled: boolean;
  linkPath?: string | null;
}

function SortableIcon({ id, url, onRemove }: {id: string;url: string;onRemove: () => void;}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className={cx(styles.r_d89972fe, styles.r_64292b1c)}>
      <div
        {...attributes}
        {...listeners}
        className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_0a769880, styles.r_ed831a4d, styles.r_0c5e9137, styles.r_65935df5, styles.r_7ae4c063, styles.r_ce27a834, styles.r_ae724a8c, styles.r_2ada7954, styles.r_ceb69a6b)}>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_7d85d0c2)} />
        <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_5fa2f504, styles.r_5939c2a2, styles.r_0c5e9137, styles.r_ceb69a6b)} />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className={cx(styles.r_da4dbfbc, styles.r_a7af1604, styles.r_09f95c1c, styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_45a732a4, styles.r_1dc571a3, styles.r_72a4c7cd, styles.r_62129538, styles.r_7065497e, styles.r_181f3d6c, styles.r_67d6184a)}>

        ×
      </button>
    </div>);

}

export function CategoryEditDialog({
  board,
  onClose,
  onSaved




}: {board: Board | null;onClose: () => void;onSaved: (updated?: {id: string;icons: string[];name: string;latinName: string | null;}) => void;}) {
  useBodyScrollLock(true);

  const [slug, setSlug] = useState(board?.slug ?? '');
  const [name, setName] = useState(board?.name ?? '');
  const [latinName, setLatinName] = useState(board?.latinName ?? '');
  const [kind, setKind] = useState(board?.kind ?? 'family');
  const [description, setDescription] = useState(board?.description ?? '');
  const [cover, setCover] = useState(board?.cover ?? '');
  const [icons, setIcons] = useState<string[]>(board?.icons ?? []);
  const [orderIdx, setOrderIdx] = useState(board?.orderIdx ?? 0);
  const [enabled, setEnabled] = useState(board?.enabled ?? true);
  const [linkPath, setLinkPath] = useState(board?.linkPath ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [iconDragOver, setIconDragOver] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const [iconCropEnabled, setIconCropEnabled] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const uploadIcon = async (file: File) => {
    setIconUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('上传失败');
      const data = await resp.json();
      const url = data.url || data.data?.url;
      if (url) {
        if (iconCropEnabled) {
          setCropSrc(url);
        } else {
          setIcons((prev) => [...prev, url]);
        }
      }
    } catch {
      setErr('图标上传失败');
    } finally {
      setIconUploading(false);
    }
  };

  const handleIconDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIconDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (file.type.startsWith('image/')) void uploadIcon(file);
    });
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    iconInputRef.current?.click();
  };

  const handleRemoveIcon = (index: number) => {
    setIcons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setIcons((items) => {
        const oldIndex = items.findIndex((_, i) => `icon-${i}` === active.id);
        const newIndex = items.findIndex((_, i) => `icon-${i}` === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const uploadCover = async (file: File) => {
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('上传失败');
      const data = await resp.json();
      const url = data.url || data.data?.url;
      if (url) setCover(url);
    } catch {
      setErr('封面上传失败');
    } finally {
      setCoverUploading(false);
    }
  };

  const submit = async () => {
    setErr(null);

    const isSpecialBoard = board && (board.kind === 'system' || board.slug === 'shaitu' || board.slug === 'jiaoyi');

    if (!name.trim()) {
      return setErr('名称必填');
    }

    if (!isSpecialBoard && !slug.trim()) {
      return setErr('slug 和 name 必填');
    }

    setBusy(true);
    try {
      if (board) {
        const body = isSpecialBoard ?
        {
          icons: JSON.stringify(icons),
          name: name.trim(),
          linkPath: linkPath.trim() || null
        } :
        {
          slug: slug.trim(),
          name: name.trim(),
          latinName: latinName.trim() || null,
          kind,
          description: description.trim(),
          cover: cover.trim(),
          icons: JSON.stringify(icons),
          orderIdx
        };

        await api.patch(`/api/admin/boards/board/${board.id}`, body);
        onSaved({
          id: board.id,
          icons,
          name: body.name,
          latinName: isSpecialBoard ? board.latinName : body.latinName ?? null
        });
      } else {
        const body = {
          slug: slug.trim(),
          name: name.trim(),
          latinName: latinName.trim() || null,
          kind,
          description: description.trim(),
          cover: cover.trim(),
          icons: JSON.stringify(icons),
          orderIdx
        };
        await api.post('/api/admin/boards', body);
        onSaved();
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const isSpecialBoard = board && (board.kind === 'system' || board.slug === 'shaitu' || board.slug === 'jiaoyi');

  return (
    <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_f3c543ad, styles.r_67d66567, styles.r_094a9df0, styles.r_8e63407b)} onClick={onClose}>
      <div
        className={cx(styles.r_6da6a3c3, styles.r_9ef2b581, styles.r_b4168890, styles.r_92bf82f4, styles.r_5e10cdb8, styles.r_0478c89a)}
        onClick={(e) => e.stopPropagation()}>

        <h3 className={cx(styles.r_da019856, styles.r_4ee73492, styles.r_e83a7042)}>{board ? '编辑板块' : '新建板块'}</h3>

        {isSpecialBoard ?
        <div className={cx(styles.r_3e7ce58d, styles.r_359090c2)}>
            <div className={cx(styles.r_07389a77, styles.r_67d2289d, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_f0faeb26, styles.r_1b2d54a3)}>
              <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_77a2a20e)}>
                <span className={styles.r_47d65ecb}>⚠️</span>
                <div className={styles.r_36e579c0}>
                  <div className={cx(styles.r_2689f395, styles.r_67e74965, styles.r_65281709)}>系统功能板块</div>
                  <div className={cx(styles.r_85d79ebf, styles.r_d058ca6d, styles.r_6b189c6e)}>
                    该板块为系统功能板块，只能编辑图标和名字，其他信息不可修改。
                  </div>
                </div>
              </div>
            </div>

            <Field label="中文名 *">
              <Input className={cx(styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={name} onChange={(e) => setName(e.target.value)} placeholder="板块名称" />
            </Field>

            <Field label="图标（可上传多个，拖拽排序，前台显示第一个）">
              <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              multiple
              className={styles.r_99d72c7f}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach((file) => void uploadIcon(file));
                e.target.value = '';
              }} />

              <div className={styles.r_6f7e013d}>
                <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
                  {icons.length > 0 &&
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={icons.map((_, i) => `icon-${i}`)}>
                        {icons.map((url, index) =>
                    <SortableIcon key={`icon-${index}`} id={`icon-${index}`} url={url} onRemove={() => handleRemoveIcon(index)} />
                    )}
                      </SortableContext>
                    </DndContext>
                }
                  <div
                  onDragOver={(e) => {e.preventDefault();e.stopPropagation();setIconDragOver(true);}}
                  onDragLeave={(e) => {e.stopPropagation();setIconDragOver(false);}}
                  onDrop={handleIconDrop}
                  className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_0a769880, styles.r_ed831a4d, styles.r_0c5e9137, styles.r_65935df5, styles.r_a29b7a64, styles.r_ceb69a6b, `${
                  iconDragOver ? cx(styles.r_d3b27cd9, styles.r_7ebecbb6) : cx(styles.r_7ae4c063, styles.r_ce27a834)}`)
                  }>

                    {iconUploading ?
                  <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_6da6a3c3, styles.r_668b21aa, styles.r_1dc571a3, styles.r_b17d6a13)}>上传中…</div> :

                  <div
                    onClick={handleIconClick}
                    className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_6da6a3c3, styles.r_668b21aa, styles.r_34516836, styles.r_98dc6304)}>

                        <div className={styles.r_42536e69}>📤</div>
                        <div className={cx(styles.r_e0988086, styles.r_66a36c90, styles.r_15e1b1f4)}>添加图标</div>
                      </div>
                  }
                  </div>
                </div>
                <label className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e, styles.r_34516836, styles.r_7f691228)}>
                  <input
                  type="checkbox"
                  checked={iconCropEnabled}
                  onChange={(e) => setIconCropEnabled(e.target.checked)}
                  className={cx(styles.r_6a60c09e, styles.r_9cea0567, styles.r_5f66c7c0, styles.r_0c5e9137)} />

                  <span className={cx(styles.r_1dc571a3, styles.r_7b89cd85)}>上传后裁剪</span>
                </label>
              </div>
            </Field>

            <Field label="跳转路径（可选）">
              <Input
              className={cx(styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b)}
              value={linkPath}
              onChange={(e) => setLinkPath(e.target.value)}
              placeholder="/contests（留空则使用 /board/{slug} 标准板块页）" />

              <div className={cx(styles.r_b6b02c0e, styles.r_1dc571a3, styles.r_7b89cd85, styles.r_6b189c6e)}>
                填了之后，访问 <span className={styles.r_0e65706b}>/board/{board.slug}</span> 会被自动重定向到此路径。常用于让系统板块复用现有页面（如摄影大赛、交易中心）。
              </div>
            </Field>

            <div className={cx(styles.r_07389a77, styles.r_ce27a834, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_e7ee55ac, styles.r_6f7e013d)}>
              <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
                <span className={cx(styles.r_d058ca6d, styles.r_02eb621e)}>板块类型</span>
                <span className={cx(styles.r_0e65706b, styles.r_d058ca6d, styles.r_7b89cd85)}>system</span>
              </div>
              <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
                <span className={cx(styles.r_d058ca6d, styles.r_02eb621e)}>当前状态</span>
                <span className={cx(styles.r_d058ca6d, styles.r_7b89cd85)}>{board.enabled ? '✓ 已启用' : '✗ 已停用'}</span>
              </div>
            </div>
          </div> :

        <div className={cx(styles.r_6ed543e2, styles.r_359090c2)}>
            {/* 第一行：中文名 + 英文 slug */}
            <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3)}>
              <Field label="中文名 *">
                <Input className={cx(styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={name} onChange={(e) => setName(e.target.value)} placeholder="景天科" />
              </Field>
              <Field label="英文 slug *">
                <Input className={cx(styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b)} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="jingtian" />
              </Field>
            </div>

            {/* 第二行：拉丁文 + 类型 + 排序 */}
            <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_1004c0c3)}>
              <Field label="拉丁名">
                <Input className={cx(styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_90665ca6)} value={latinName ?? ''} onChange={(e) => setLatinName(e.target.value)} placeholder="Crassulaceae" />
              </Field>
              <Field label="类型">
                <select className={cx(styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="family">family</option>
                  <option value="discussion">discussion</option>
                  <option value="market">market</option>
                </select>
              </Field>
              <Field label="排序">
                <Input type="number" className={cx(styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={orderIdx} onChange={(e) => setOrderIdx(Number(e.target.value))} />
              </Field>
            </div>

            {/* 图标 */}
            <Field label="图标（可上传多个，拖拽排序，前台显示第一个）">
              <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              multiple
              className={styles.r_99d72c7f}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach((file) => void uploadIcon(file));
                e.target.value = '';
              }} />

              <div className={styles.r_6f7e013d}>
                <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
                  {icons.length > 0 &&
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={icons.map((_, i) => `icon-${i}`)}>
                        {icons.map((url, index) =>
                    <SortableIcon key={`icon-${index}`} id={`icon-${index}`} url={url} onRemove={() => handleRemoveIcon(index)} />
                    )}
                      </SortableContext>
                    </DndContext>
                }
                  <div
                  onDragOver={(e) => {e.preventDefault();e.stopPropagation();setIconDragOver(true);}}
                  onDragLeave={(e) => {e.stopPropagation();setIconDragOver(false);}}
                  onDrop={handleIconDrop}
                  className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_0a769880, styles.r_ed831a4d, styles.r_0c5e9137, styles.r_65935df5, styles.r_a29b7a64, styles.r_ceb69a6b, `${
                  iconDragOver ? cx(styles.r_d3b27cd9, styles.r_7ebecbb6) : cx(styles.r_7ae4c063, styles.r_ce27a834)}`)
                  }>

                    {iconUploading ?
                  <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_6da6a3c3, styles.r_668b21aa, styles.r_1dc571a3, styles.r_b17d6a13)}>上传中…</div> :

                  <div
                    onClick={handleIconClick}
                    className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_6da6a3c3, styles.r_668b21aa, styles.r_34516836, styles.r_98dc6304)}>

                        <div className={styles.r_42536e69}>📤</div>
                        <div className={cx(styles.r_e0988086, styles.r_66a36c90, styles.r_15e1b1f4)}>添加</div>
                      </div>
                  }
                  </div>
                </div>
                <label className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e, styles.r_34516836, styles.r_7f691228)}>
                  <input
                  type="checkbox"
                  checked={iconCropEnabled}
                  onChange={(e) => setIconCropEnabled(e.target.checked)}
                  className={cx(styles.r_6a60c09e, styles.r_9cea0567, styles.r_5f66c7c0, styles.r_0c5e9137)} />

                  <span className={cx(styles.r_1dc571a3, styles.r_7b89cd85)}>上传后裁剪</span>
                </label>
              </div>
            </Field>

            {/* 描述 */}
            <Field label="描述">
              <Textarea className={cx(styles.r_6da6a3c3, styles.r_a4197e87, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </Field>

            {/* 封面图 */}
            <Field label="封面图">
              <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className={styles.r_99d72c7f}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadCover(file);
                e.target.value = '';
              }} />

              {cover ?
            <div className={cx(styles.r_d89972fe, styles.r_64292b1c)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover} alt="" className={cx(styles.r_b5f3ff77, styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_7d85d0c2, styles.r_ca6bcd4b, styles.r_7ae4c063)} />
                  <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_5fa2f504, styles.r_3338dece, styles.r_ceb69a6b, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1)}>
                    <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className={cx(styles.r_7065497e, styles.r_181f3d6c, styles.r_0c5e9137, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_d058ca6d, styles.r_2689f395, styles.r_5399e21f, styles.r_67d6184a)}>

                      更换封面
                    </button>
                  </div>
                </div> :

            <div
              onClick={() => coverInputRef.current?.click()}
              className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_b5f3ff77, styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_65935df5, styles.r_a29b7a64, styles.r_7ae4c063, styles.r_ce27a834, styles.r_34516836, styles.r_2ada7954, styles.r_5756b7b4, styles.r_ceb69a6b)}>

                  {coverUploading ?
              <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_6da6a3c3, styles.r_668b21aa, styles.r_359090c2, styles.r_b17d6a13)}>上传中…</div> :

              <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_6da6a3c3, styles.r_668b21aa)}>
                      <div className={cx(styles.r_3febee09, styles.r_65281709)}>📤</div>
                      <div className={cx(styles.r_d058ca6d, styles.r_66a36c90)}>点击上传封面图</div>
                    </div>
              }
                </div>
            }
            </Field>
          </div>
        }

        {err && <div className={cx(styles.r_eccd13ef, styles.r_07389a77, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>{err}</div>}

        <div className={cx(styles.r_fb77735e, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
          <button type="button" onClick={onClose} className={cx(styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_5399e21f)}>
            取消
          </button>
          <button type="button" disabled={busy} onClick={submit} className={cx(styles.r_0c5e9137, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_72a4c7cd, styles.r_218d0c3a)}>
            {busy ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {cropSrc &&
      <CropImageDialog
        src={cropSrc}
        outputSize={75}
        onCancel={() => setCropSrc(null)}
        onConfirm={(croppedUrl) => {
          setIcons((prev) => [...prev, croppedUrl]);
          setCropSrc(null);
        }} />

      }
    </div>);

}

function Field({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div className={styles.r_0214b4b3}>
      <div className={cx(styles.r_65281709, styles.r_d058ca6d, styles.r_2689f395, styles.r_02eb621e)}>{label}</div>
      {children}
    </div>);

}
