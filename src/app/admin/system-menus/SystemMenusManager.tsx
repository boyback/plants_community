'use client';

import { useEffect, useState, useRef } from 'react';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { Toast, useToast, showToast } from '@/components/ui/Toast';
import { CropImageDialog } from '@/components/upload/CropImageDialog';

interface SystemMenu {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  path: string;
  location: 'header' | 'sidebar';
  orderIdx: number;
  enabled: boolean;
  createdAt: string;
}

export function SystemMenusManager() {
  const { toasts, removeToast } = useToast();
  const [menus, setMenus] = useState<SystemMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMenu, setEditingMenu] = useState<SystemMenu | 'new' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    setLoading(true);
    try {
      const data = await api.get<SystemMenu[]>('/api/admin/system-menus');
      setMenus(data);
    } catch (e) {
      showToast(`加载失败: ${e instanceof ApiError ? e.message : '未知错误'}`, 'error');
    } finally {
      setLoading(false);
    }
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

  const handleSave = async (menu: Omit<SystemMenu, 'id' | 'createdAt'> & { id?: string }) => {
    setSaving(true);
    try {
      if (menu.id) {
        await api.put(`/api/admin/system-menus/${menu.id}`, menu);
        showToast(`${menu.name} 已更新`, 'success');
      } else {
        await api.post('/api/admin/system-menus', menu);
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
    if (!confirm(`确定删除「${menu.name}」？`)) return;
    try {
      await api.delete(`/api/admin/system-menus/${menu.id}`);
      showToast(`${menu.name} 已删除`, 'success');
      await loadMenus();
    } catch (e) {
      showToast(`删除失败: ${e instanceof ApiError ? e.message : '未知错误'}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">系统菜单</h1>
          <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-600">
            {menus.length} 个菜单
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEditingMenu('new')}
          className="rounded-lg bg-ink-800 px-4 py-2 text-sm text-white hover:bg-ink-700"
        >
          + 新建菜单
        </button>
      </div>

      {/* 说明 */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">💡 说明</p>
        <p>系统菜单位于导航栏或侧边栏，用于展示晒图广场、交易中心、摄影大赛等活动入口。</p>
        <p>通过「启用/停用」开关可以控制前端导航栏的显示。</p>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-leaf-700">加载中...</div>
      ) : menus.length === 0 ? (
        <div className="text-center py-12 text-leaf-700/60">暂无菜单，请点击上方「新建菜单」添加</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-600">
              <tr>
                <th className="px-4 py-3 text-left">图标</th>
                <th className="px-4 py-3 text-left">名称</th>
                <th className="px-4 py-3 text-left">路径</th>
                <th className="px-4 py-3 text-left">位置</th>
                <th className="px-4 py-3 text-left">描述</th>
                <th className="px-4 py-3 text-center">状态</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {menus.map((menu) => (
                <tr key={menu.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                  <td className="px-4 py-3">
                    {menu.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={menu.icon} alt="" className="w-10 h-10 rounded-none object-cover border border-ink-100" />
                    ) : (
                      <span className="text-ink-300 text-sm">未设置</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-800">{menu.name}</div>
                    <div className="text-xs text-ink-500 font-mono">{menu.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-leaf-600 bg-leaf-50 px-2 py-0.5 rounded">
                      {menu.path}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      menu.location === 'header' ? 'bg-amber-50 text-amber-700' : 'bg-violet-50 text-violet-700'
                    )}>
                      {menu.location === 'header' ? '导航栏' : '侧边栏'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-600 text-xs max-w-[200px]">
                    {menu.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggle(menu)}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        menu.enabled ? 'bg-leaf-500' : 'bg-rose-400',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          menu.enabled ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingMenu(menu)}
                      className="rounded border border-ink-200 px-3 py-1 text-xs hover:bg-ink-50 mr-2"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(menu)}
                      className="rounded bg-rose-100 px-3 py-1 text-xs text-rose-700 hover:bg-rose-200"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 编辑对话框 */}
      {editingMenu && (
        <MenuEditDialog
          menu={editingMenu === 'new' ? null : editingMenu}
          onClose={() => setEditingMenu(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* Toast 提示 */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

interface MenuEditDialogProps {
  menu: SystemMenu | null;
  onClose: () => void;
  onSave: (menu: Omit<SystemMenu, 'id' | 'createdAt'> & { id?: string }) => void;
  saving: boolean;
}

function MenuEditDialog({ menu, onClose, onSave, saving }: MenuEditDialogProps) {
  const [slug, setSlug] = useState(menu?.slug || '');
  const [name, setName] = useState(menu?.name || '');
  const [description, setDescription] = useState(menu?.description || '');
  const [icon, setIcon] = useState(menu?.icon || '');
  const [path, setPath] = useState(menu?.path || '');
  const [location, setLocation] = useState<'header' | 'sidebar'>(menu?.location || 'header');
  const [orderIdx, setOrderIdx] = useState(menu?.orderIdx ?? 99);

  // 上传相关状态
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          setIcon(url);
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
    const imageFile = files.find(f => f.type.startsWith('image/'));
    if (imageFile) {
      void uploadIcon(imageFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFile = files.find(f => f.type.startsWith('image/'));
    if (imageFile) {
      void uploadIcon(imageFile);
    }
    e.target.value = '';
  };

  const handleRemoveIcon = () => {
    setIcon('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !name || !path) {
      alert('请填写必填项');
      return;
    }
    if (!icon && !menu) {
      alert('请上传图标');
      return;
    }
    onSave({
      id: menu?.id,
      slug,
      name,
      description: description || null,
      icon,
      path,
      location,
      orderIdx,
      enabled: menu?.enabled ?? true,
    });
  };

  // 预定义菜单快捷选项
  const presets = [
    { name: '晒图广场', slug: 'shaitu', path: '/shaitu', description: '用户晒图分享', location: 'header' as const },
    { name: '交易中心', slug: 'market', path: '/market', description: '二手交易市场', location: 'header' as const },
    { name: '摄影大赛', slug: 'contests', path: '/contests', description: '摄影比赛活动', location: 'header' as const },
    { name: '养殖交流', slug: 'forum', path: '/forum', description: '养殖经验交流', location: 'header' as const },
    { name: '新手村', slug: 'beginner', path: '/beginner', description: '新手入门指导', location: 'sidebar' as const },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setSlug(preset.slug);
    setName(preset.name);
    setDescription(preset.description);
    setPath(preset.path);
    setLocation(preset.location);
    setIcon('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto p-4">
      <div className="w-full max-w-lg rounded-none bg-white shadow-xl my-8">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <h2 className="text-lg font-semibold">{menu ? '编辑菜单' : '新建菜单'}</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 快捷预设 */}
          {!menu && (
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-2">快捷预设</label>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.slug}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-full bg-leaf-50 px-3 py-1 text-xs text-leaf-700 hover:bg-leaf-100 border border-leaf-200"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Slug <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-none border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
              placeholder="shaitu"
              disabled={!!menu}
              required
            />
            <p className="mt-1 text-xs text-ink-500">唯一标识，用于内部区分，英文/数字/连字符</p>
          </div>

          {/* 名称 */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              名称 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-none border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
              placeholder="晒图广场"
              required
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">描述</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-none border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
              placeholder="简要描述功能"
            />
          </div>

          {/* 图标上传 */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              图标 <span className="text-rose-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="space-y-2">
              {/* 图标预览/上传区域 */}
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                onDragLeave={(e) => { e.stopPropagation(); setDragOver(false); }}
                onDrop={handleDrop}
                className={cn(
                  'relative flex items-center justify-center rounded-none border-2 border-dashed transition-colors overflow-hidden',
                  dragOver ? 'border-leaf-500 bg-leaf-50' : 'border-ink-200 bg-ink-50',
                  icon ? 'w-full h-20' : 'w-full h-24'
                )}
              >
                {uploading ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="h-5 w-5 border-2 border-leaf-500 border-t-transparent rounded-full animate-spin" />
                    <span className="mt-2 text-xs text-leaf-600">上传中...</span>
                  </div>
                ) : icon ? (
                  <div className="relative group w-full h-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={icon} alt="" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/40 transition-colors flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="opacity-0 group-hover:opacity-100 rounded bg-white px-2 py-1 text-xs hover:bg-ink-50 transition-opacity"
                      >
                        更换
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveIcon}
                        className="opacity-0 group-hover:opacity-100 rounded bg-rose-500 text-white px-2 py-1 text-xs hover:bg-rose-600 transition-opacity"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-leaf-50/50"
                  >
                    <div className="text-2xl text-leaf-400">📤</div>
                    <div className="mt-1 text-xs text-ink-400">点击或拖拽上传图标</div>
                    <div className="mt-0.5 text-[10px] text-ink-300">支持 JPG/PNG/SVG，建议尺寸 48x48</div>
                  </div>
                )}
              </div>
              {/* 裁剪选项 */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cropEnabled}
                  onChange={(e) => setCropEnabled(e.target.checked)}
                  className="h-3 w-3 accent-leaf-500 rounded-none"
                />
                <span className="text-[10px] text-ink-500">上传后裁剪（自动调整为正方形）</span>
              </label>
            </div>
          </div>

          {/* 路径 */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              路径 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="w-full rounded-none border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
              placeholder="/shaitu"
              required
            />
          </div>

          {/* 位置 */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">位置</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="location"
                  value="header"
                  checked={location === 'header'}
                  onChange={() => setLocation('header')}
                  className="accent-leaf-600"
                />
                <span className="text-sm text-ink-700">导航栏</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="location"
                  value="sidebar"
                  checked={location === 'sidebar'}
                  onChange={() => setLocation('sidebar')}
                  className="accent-leaf-600"
                />
                <span className="text-sm text-ink-700">侧边栏</span>
              </label>
            </div>
          </div>

          {/* 排序 */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">排序</label>
            <input
              type="number"
              value={orderIdx}
              onChange={(e) => setOrderIdx(Number(e.target.value))}
              className="w-full rounded-none border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500"
              placeholder="99"
            />
            <p className="mt-1 text-xs text-ink-500">数字越小越靠前</p>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-ink-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-none border border-ink-200 px-4 py-2 text-sm text-ink-600 hover:bg-ink-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-none bg-leaf-600 px-4 py-2 text-sm text-white hover:bg-leaf-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>

        {/* 裁剪弹窗 */}
        {cropSrc && (
          <CropImageDialog
            src={cropSrc}
            outputSize={75}
            onCancel={() => setCropSrc(null)}
            onConfirm={(croppedUrl) => {
              setIcon(croppedUrl);
              setCropSrc(null);
            }}
          />
        )}
      </div>
    </div>
  );
}