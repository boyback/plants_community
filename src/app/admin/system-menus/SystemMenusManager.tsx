'use client';

import { useEffect, useState, useRef } from 'react';
import { useTransition } from 'react';
import { api, ApiError } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import { Toast, useToast, showToast } from '@/components/ui/Toast';
import { CropImageDialog } from '@/components/upload/CropImageDialog';
import { ConfirmPopover } from '@/components/ui/ConfirmPopover';
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
  verticalListSortingStrategy,
  horizontalListSortingStrategy } from
"@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from './SystemMenusManager.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



interface SystemMenu {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  path: string;
  location: 'header' | 'sidebar_left' | 'sidebar_right';
  cardKey: string | null;
  type: 'button' | 'card';
  orderIdx: number;
  enabled: boolean;
  createdAt: string;
}

function parseIcons(iconField: string): string[] {
  try {
    const parsed = JSON.parse(iconField);
    return Array.isArray(parsed) ? parsed : iconField ? [iconField] : [];
  } catch {
    return iconField ? [iconField] : [];
  }
}

export function SystemMenusManager() {
  const { toasts } = useToast();
  const [menus, setMenus] = useState<SystemMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMenu, setEditingMenu] = useState<SystemMenu | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    setLoading(true);
    try {
      const data = await api.get<SystemMenu[]>("/api/admin/system-menus");
      setMenus(data);
    } catch (e) {
      showToast(`加载失败: ${e instanceof ApiError ? e.message : '未知错误'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 拖拽排序
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = menus.findIndex((m) => m.id === active.id);
    const newIndex = menus.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newMenus = arrayMove(menus, oldIndex, newIndex);
    setMenus(newMenus);

    // 保存排序
    const orderedIds = newMenus.map((m) => m.id);
    startTransition(() => {
      api.patch("/api/admin/system-menus", { orderedIds }).catch(() => {
        showToast('排序保存失败', 'error');
        loadMenus(); // 失败则重新加载
      });
    });
  };

  const handleToggle = async (menu: SystemMenu) => {
    try {
      await api.put(`/api/admin/system-menus/${menu.id}`, { enabled: !menu.enabled });
      setMenus((prev) => prev.map((m) => m.id === menu.id ? { ...m, enabled: !m.enabled } : m));
      showToast(`${menu.name} ${!menu.enabled ? '已启用' : '已停用'}`, 'success');
    } catch (e) {
      showToast(`操作失败: ${e instanceof ApiError ? e.message : '未知错误'}`, 'error');
    }
  };

  const handleSave = async (menu: Omit<SystemMenu, 'id' | 'createdAt'> & {id?: string;icons?: string[];}) => {
    setSaving(true);
    try {
      if (menu.id) {
        await api.put(`/api/admin/system-menus/${menu.id}`, menu);
        showToast(`${menu.name} 已更新`, 'success');
      } else {
        await api.post("/api/admin/system-menus", menu);
        showToast(`${menu.name} 已创建`, 'success');
      }
      setEditingMenu(null);
      await loadMenus();
    } catch (e) {
      showToast(`保存失败: ${e instanceof ApiError ? e.message : '未知错误'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (menu: SystemMenu) => {
    try {
      await api.delete(`/api/admin/system-menus/${menu.id}`);
      showToast(`${menu.name} 已删除`, 'success');
      await loadMenus();
    } catch (e) {
      showToast(`删除失败: ${e instanceof ApiError ? e.message : '未知错误'}`, 'error');
    }
  };

  return (
    <div className={styles.r_b3542e05}>
      {/* 头部 */}
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3)}>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>系统菜单</h1>
          <span className={cx(styles.r_ac204c10, styles.r_febec8f2, styles.r_0b91436d, styles.r_465609a2, styles.r_359090c2, styles.r_02eb621e)}>
            {menus.length} 个菜单
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEditingMenu('new')}
          className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_72a4c7cd, styles.r_218d0c3a)}>

          + 新建菜单
        </button>
      </div>

      {/* 说明 */}
      <div className={cx(styles.r_5f22e64f, styles.r_67d2289d, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_8e63407b, styles.r_fc7473ca, styles.r_5c6230d2)}>
        <p className={cx(styles.r_2689f395, styles.r_65281709)}>💡 说明</p>
        <p>系统菜单位于导航栏或侧边栏，用于展示晒图广场、交易中心、摄影大赛等活动入口。</p>
        <p>通过「启用/停用」开关可以控制前端导航栏的显示。</p>
      </div>

      {/* 列表 */}
      {loading ?
      <div className={cx(styles.r_ca6bf630, styles.r_61357c0c, styles.r_5f6a59f1)}>加载中...</div> :
      menus.length === 0 ?
      <div className={cx(styles.r_ca6bf630, styles.r_61357c0c, styles.r_6c4cc49e)}>暂无菜单，请点击上方「新建菜单」添加</div> :

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={menus.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className={cx(styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
              <table className={cx(styles.r_6da6a3c3, styles.r_fc7473ca)}>
                <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
                  <tr>
                    <th className={cx(styles.r_d854e569, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65)}></th>
                    <th className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65)}>图标</th>
                    <th className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65)}>名称</th>
                <th className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65)}>类型</th>
                <th className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65)}>路径</th>
                <th className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65)}>位置</th>
                <th className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65)}>描述</th>
                <th className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_ca6bf630)}>状态</th>
                <th className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_308fc069)}>操作</th>
              </tr>
            </thead>
            <tbody>
              {menus.map((menu) =>
                <MenuSortableRow
                  key={menu.id}
                  menu={menu}
                  onToggle={handleToggle}
                  onEdit={() => setEditingMenu(menu)}
                  onDelete={handleDelete} />

                )}
            </tbody>
          </table>
        </div>
          </SortableContext>
        </DndContext>
      }

      {/* 编辑对话框 */}
      {editingMenu &&
      <MenuEditDialog
        menu={editingMenu === 'new' ? null : editingMenu}
        onClose={() => setEditingMenu(null)}
        onSave={handleSave}
        saving={saving} />

      }

      {/* Toast 提示 */}
      {toasts.map((toast) =>
      <Toast
        key={toast.id}
        message={toast.message}
        type={toast.type} />

      )}
    </div>);

}

/* 可拖拽图标组件 */
function SortableIcon({ id, url, onRemove }: {id: string;url: string;onRemove: () => void;}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
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

function MenuSortableRow({ menu, onToggle, onEdit, onDelete




}: {menu: SystemMenu;onToggle: (menu: SystemMenu) => void;onEdit: () => void;onDelete: (menu: SystemMenu) => void;}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: menu.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const firstIcon = parseIcons(menu.icon)[0];

  return (
    <tr ref={setNodeRef} style={style} className={cn(cx(styles.r_b950dda2, styles.r_358505cf, styles.r_d9a085ef), isDragging && cx(styles.r_7ebecbb6, styles.r_06bbb431, styles.r_d89972fe, styles.r_236812d6))}>
      <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_ca6bf630)}>
        <button {...attributes} {...listeners} className={cx(styles.r_8d083852, styles.r_6083e9b9, styles.r_dd42d0c0, styles.r_d9bff91e)} title="拖拽排序">
          ⠿
        </button>
      </td>
      <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>
        {firstIcon ?
        firstIcon.startsWith('http') ?
        // eslint-disable-next-line @next/next/no-img-element
        <img src={firstIcon} alt="" className={cx(styles.r_d854e569, styles.r_426b8b75, styles.r_0c5e9137, styles.r_7d85d0c2)} /> :

        <span className={styles.r_3febee09}>{firstIcon}</span> :


        <span className={cx(styles.r_6083e9b9, styles.r_fc7473ca)}>未设置</span>
        }
      </td>
      <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>
        <div className={cx(styles.r_2689f395, styles.r_399e11a5)}>{menu.name}</div>
        <div className={cx(styles.r_359090c2, styles.r_7b89cd85, styles.r_0e65706b)}>{menu.slug}</div>
      </td>
      <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>
        <span className={cn(cx(styles.r_ac204c10, styles.r_d5eab218, styles.r_465609a2, styles.r_359090c2),

        menu.type === 'button' ? cx(styles.r_3cc00fe7, styles.r_65b7dd19) : cx(styles.r_67fbd816, styles.r_2c03cd77)
        )}>
          {menu.type === 'button' ? '按钮' : '卡片'}
        </span>
      </td>
      <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>
        <span className={cx(styles.r_359090c2, styles.r_0e65706b, styles.r_b17d6a13, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_07389a77)}>
          {menu.path || "-"}
        </span>
      </td>
      <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>
        <span className={cn(cx(styles.r_ac204c10, styles.r_d5eab218, styles.r_465609a2, styles.r_359090c2),

        menu.location === 'header' ? cx(styles.r_67d2289d, styles.r_85d79ebf) :
        menu.location === 'sidebar_left' ? cx(styles.r_3b5cf6c0, styles.r_06fd2bc1) : cx(styles.r_63b9410b, styles.r_d250453a)

        )}>
          {menu.location === 'header' ? '导航栏' : menu.location === 'sidebar_left' ? '左侧侧边栏' : '右侧侧边栏'}
        </span>
      </td>
      <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_02eb621e, styles.r_359090c2, styles.r_ed5de0a4)}>
        {menu.description || "-"}
      </td>
      <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_ca6bf630)}>
        <button
          type="button"
          onClick={() => onToggle(menu)}
          className={cn(cx(styles.r_d89972fe, styles.r_52083e7d, styles.r_f6fe9024, styles.r_edaba517, styles.r_3960ffc2, styles.r_ac204c10, styles.r_ceb69a6b),

          menu.enabled ? styles.r_45499621 : styles.r_c7489c32
          )}>

          <span
            className={cn(cx(styles.r_bb0c4bfc, styles.r_11e59c6d, styles.r_dc7972eb, styles.r_dd8ce13a, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_eadef238),

            menu.enabled ? styles.r_f80f72c0 : styles.r_c3ca6b52
            )} />

        </button>
      </td>
      <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_308fc069)}>
        <button
          onClick={onEdit}
          className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_5399e21f, styles.r_d2347e84)}>

          编辑
        </button>
        <ConfirmPopover
          title={`确定删除「${menu.name}」？`}
          message="此操作不可恢复"
          confirmText="删除"
          danger
          onConfirm={() => onDelete(menu)}>

          <button
            onClick={() => {}}
            className={cx(styles.r_07389a77, styles.r_e0467cf5, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_b54428d1, styles.r_fd25c495)}>

            删除
          </button>
        </ConfirmPopover>
      </td>
    </tr>);

}

interface MenuEditDialogProps {
  menu: SystemMenu | null;
  onClose: () => void;
  onSave: (menu: Omit<SystemMenu, 'id' | 'createdAt'> & {id?: string;icons?: string[];}) => void;
  saving: boolean;
}

function MenuEditDialog({ menu, onClose, onSave, saving }: MenuEditDialogProps) {
  useBodyScrollLock(true);

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icons, setIcons] = useState<string[]>([]);
  const [path, setPath] = useState('');
  const [location, setLocation] = useState<'header' | 'sidebar_left' | 'sidebar_right'>('header');
  const [cardKey, setCardKey] = useState<string>('');
  const [type, setType] = useState<'button' | 'card'>('button');

  // 字段级校验错误
  const [errors, setErrors] = useState<Record<string, string>>({});

  // props 变化时同步状态（打开/切换菜单时）
  useEffect(() => {
    setSlug(menu?.slug || '');
    setName(menu?.name || '');
    setDescription(menu?.description || '');
    setIcons(menu ? parseIcons(menu.icon) : []);
    setPath(menu?.path || '');
    setLocation(menu?.location as 'header' | 'sidebar_left' | 'sidebar_right' || 'header');
    setCardKey(menu?.cardKey || '');
    setType(menu?.type as 'button' | 'card' || 'button');
    setErrors({});
  }, [menu]);

  // 上传相关状态
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const uploadIcon = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('上传失败');
      const data = await resp.json();
      const url = data.url || data.data?.url;
      if (url) {
        if (cropEnabled) {
          setCropSrc(url);
        } else {
          setIcons((prev) => [...prev, url]);
          setErrors((prev) => {const n = { ...prev };delete n.icons;return n;});
        }
      }
    } catch {
      showToast('图标上传失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (file.type.startsWith('image/')) void uploadIcon(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.type.startsWith('image/')) void uploadIcon(file);
    });
    e.target.value = '';
  };

  const handleRemoveIcon = (index: number) => {
    setIcons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setIcons((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return items;
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!slug.trim()) next.slug = 'Slug 必填';
    if (!name.trim()) next.name = '名称必填';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      id: menu?.id,
      slug,
      name,
      description: description || null,
      icon: icons[0] || '',
      icons,
      path,
      location,
      cardKey: cardKey || null,
      type,
      orderIdx: menu?.orderIdx ?? 0,
      enabled: menu?.enabled ?? true
    });
  };

  // 预定义菜单快捷选项
  const presets = [
  { name: '晒图广场', slug: 'shaitu', path: '/shaitu', description: '用户晒图分享', location: 'header' as const },
  { name: '交易中心', slug: 'market', path: '/market', description: '二手交易市场', location: 'header' as const },
  { name: '品种图鉴', slug: 'plants', path: '/plants', description: '多肉品种图鉴', location: 'header' as const },
  { name: '排行榜', slug: 'ranking', path: '/ranking', description: '社区排行榜', location: 'header' as const },
  { name: '摄影大赛', slug: 'contests', path: '/contests', description: '摄影比赛活动', location: 'header' as const },
  { name: '养殖交流', slug: 'forum', path: '/forum', description: '养殖经验交流', location: 'header' as const },
  { name: '新手村', slug: 'beginner', path: '/beginner', description: '新手入门指导', location: 'sidebar_left' as const }];


  const applyPreset = (preset: typeof presets[0]) => {
    setSlug(preset.slug);
    setName(preset.name);
    setDescription(preset.description);
    setPath(preset.path);
    setLocation(preset.location);
    setIcons([]);
  };

  return (
    <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_53bb3a28, styles.r_92bf82f4, styles.r_8e63407b)}>
      <div className={cx(styles.r_6da6a3c3, styles.r_6199866f, styles.r_0c5e9137, styles.r_5e10cdb8, styles.r_a739868a, styles.r_adfb03d8)}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_65fdbade, styles.r_358505cf, styles.r_f92d0236, styles.r_cb11fec3)}>
          <h2 className={cx(styles.r_42536e69, styles.r_e83a7042)}>{menu ? '编辑菜单' : '新建菜单'}</h2>
          <button onClick={onClose} className={cx(styles.r_66a36c90, styles.r_dd42d0c0)}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={cx(styles.r_0478c89a, styles.r_3e7ce58d)}>
          {/* 快捷预设 */}
          {!menu &&
          <div>
              <label className={cx(styles.r_0214b4b3, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_a77ed4d9)}>快捷预设</label>
              <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
                {presets.map((preset) =>
              <button
                key={preset.slug}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_5f6a59f1, styles.r_2efc423a, styles.r_ca6bcd4b, styles.r_691861bc)}>

                    {preset.name}
                  </button>
              )}
              </div>
            </div>
          }

          {/* Slug */}
          <div>
            <label className={cx(styles.r_0214b4b3, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_65281709)}>
              Slug <span className={styles.r_fa512798}>*</span>
            </label>
            <Input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                if (errors.slug) setErrors((prev) => {const n = { ...prev };delete n.slug;return n;});
              }}
              className={cn(cx(styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_55d048eb, styles.r_608dd26c),

              errors.slug ? cx(styles.r_34357afe, styles.r_c56f0897) : cx(styles.r_7ae4c063, styles.r_34d9f286)


              )}
              placeholder="shaitu" />

            {errors.slug ?
            <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_fa512798)}>{errors.slug}</p> :

            <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>唯一标识，用于内部区分，英文/数字/连字符</p>
            }
          </div>

          {/* 名称 */}
          <div>
            <label className={cx(styles.r_0214b4b3, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_65281709)}>
              名称 <span className={styles.r_fa512798}>*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => {const n = { ...prev };delete n.name;return n;});
              }}
              className={cn(cx(styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_55d048eb, styles.r_608dd26c),

              errors.name ? cx(styles.r_34357afe, styles.r_c56f0897) : cx(styles.r_7ae4c063, styles.r_34d9f286)


              )}
              placeholder="晒图广场" />

            {errors.name && <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_fa512798)}>{errors.name}</p>}
          </div>

          {/* 描述 */}
          <div>
            <label className={cx(styles.r_0214b4b3, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_65281709)}>描述</label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cx(styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_55d048eb, styles.r_608dd26c, styles.r_34d9f286)}
              placeholder="简要描述功能" />

          </div>

          {/* 图标上传 — 多图标 + 拖拽排序 */}
          <div>
            <label className={cx(styles.r_0214b4b3, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_65281709)}>
              图标 <span className={styles.r_fa512798}>*</span>
              <span className={cx(styles.r_66a36c90, styles.r_8ecebc9f, styles.r_f58b0257)}>（可上传多个，拖拽排序，前台显示第一个）</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className={styles.r_99d72c7f}
              onChange={handleFileChange} />

            <div className={styles.r_6f7e013d}>
              <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
                {icons.length > 0 &&
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={icons} strategy={horizontalListSortingStrategy}>
                      {icons.map((url, index) =>
                    <SortableIcon
                      key={url}
                      id={url}
                      url={url}
                      onRemove={() => handleRemoveIcon(index)} />

                    )}
                    </SortableContext>
                  </DndContext>
                }
                <div
                  onDragOver={(e) => {e.preventDefault();e.stopPropagation();setDragOver(true);}}
                  onDragLeave={(e) => {e.stopPropagation();setDragOver(false);}}
                  onDrop={handleDrop}
                  className={cn(cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_0a769880, styles.r_ed831a4d, styles.r_0c5e9137, styles.r_65935df5, styles.r_a29b7a64, styles.r_ceb69a6b),

                  dragOver ? cx(styles.r_d3b27cd9, styles.r_7ebecbb6) : errors.icons ? cx(styles.r_3b7f9781, styles.r_fdae7b46) : cx(styles.r_7ae4c063, styles.r_ce27a834)
                  )}>

                  {uploading ?
                  <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_6da6a3c3, styles.r_668b21aa, styles.r_1dc571a3, styles.r_b17d6a13)}>上传中…</div> :

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_6da6a3c3, styles.r_668b21aa, styles.r_34516836, styles.r_98dc6304)}>

                      <div className={styles.r_42536e69}>📤</div>
                      <div className={cx(styles.r_e0988086, styles.r_66a36c90, styles.r_15e1b1f4)}>添加</div>
                    </div>
                  }
                </div>
              </div>
              {errors.icons && <p className={cx(styles.r_359090c2, styles.r_fa512798)}>{errors.icons}</p>}
              <label className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e, styles.r_34516836, styles.r_7f691228)}>
                <input
                  type="checkbox"
                  checked={cropEnabled}
                  onChange={(e) => setCropEnabled(e.target.checked)}
                  className={cx(styles.r_6a60c09e, styles.r_9cea0567, styles.r_5f66c7c0, styles.r_0c5e9137)} />

                <span className={cx(styles.r_1dc571a3, styles.r_7b89cd85)}>上传后裁剪（自动调整为正方形）</span>
              </label>
            </div>
          </div>

          {/* 路径 */}
          <div>
            <label className={cx(styles.r_0214b4b3, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_65281709)}>
              路径
            </label>
            <Input
              type="text"
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                if (errors.path) setErrors((prev) => {const n = { ...prev };delete n.path;return n;});
              }}
              className={cn(cx(styles.r_6da6a3c3, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_55d048eb, styles.r_608dd26c),

              errors.path ? cx(styles.r_34357afe, styles.r_c56f0897) : cx(styles.r_7ae4c063, styles.r_34d9f286)


              )}
              placeholder="/shaitu（可留空）" />

            {errors.path && <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_fa512798)}>{errors.path}</p>}
          </div>

          {/* 类型 */}
          <div>
            <label className={cx(styles.r_0214b4b3, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_65281709)}>类型</label>
            <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_0c3bc985)}>
              <label className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_34516836)}>
                <input
                  type="radio"
                  name="type"
                  value="button"
                  checked={type === 'button'}
                  onChange={() => setType('button')}
                  className={styles.r_aea3b3b7} />

                <span className={cx(styles.r_fc7473ca, styles.r_eb6abb1f)}>按钮（有路径，点击跳转）</span>
              </label>
              <label className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_34516836)}>
                <input
                  type="radio"
                  name="type"
                  value="card"
                  checked={type === 'card'}
                  onChange={() => setType('card')}
                  className={styles.r_aea3b3b7} />

                <span className={cx(styles.r_fc7473ca, styles.r_eb6abb1f)}>卡片（控制侧边栏卡片显示）</span>
              </label>
            </div>
          </div>

          {/* 位置 */}
          <div>
            <label className={cx(styles.r_0214b4b3, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_65281709)}>位置</label>
            <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_0c3bc985)}>
              <label className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_34516836)}>
                <input
                  type="radio"
                  name="location"
                  value="header"
                  checked={location === 'header'}
                  onChange={() => setLocation('header')}
                  className={styles.r_aea3b3b7} />

                <span className={cx(styles.r_fc7473ca, styles.r_eb6abb1f)}>导航栏</span>
              </label>
              <label className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_34516836)}>
                <input
                  type="radio"
                  name="location"
                  value="sidebar_left"
                  checked={location === 'sidebar_left'}
                  onChange={() => setLocation('sidebar_left')}
                  className={styles.r_aea3b3b7} />

                <span className={cx(styles.r_fc7473ca, styles.r_eb6abb1f)}>左侧侧边栏</span>
              </label>
              <label className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_34516836)}>
                <input
                  type="radio"
                  name="location"
                  value="sidebar_right"
                  checked={location === 'sidebar_right'}
                  onChange={() => setLocation('sidebar_right')}
                  className={styles.r_aea3b3b7} />

                <span className={cx(styles.r_fc7473ca, styles.r_eb6abb1f)}>右侧侧边栏</span>
              </label>
            </div>
          </div>

          {/* 按钮 */}
          <div className={cx(styles.r_60fbb771, styles.r_77c08e01, styles.r_1004c0c3, styles.r_173fa8f0, styles.r_b950dda2, styles.r_358505cf)}>
            <button
              type="button"
              onClick={onClose}
              className={cx(styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_02eb621e, styles.r_5399e21f)}>

              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cx(styles.r_0c5e9137, styles.r_6bceb016, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_72a4c7cd, styles.r_e269e58c, styles.r_b29d8adb)}>

              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>

        {/* 裁剪弹窗 */}
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
      </div>
    </div>);

}
