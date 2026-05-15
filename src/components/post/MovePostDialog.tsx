'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

interface Board {
  id: string;
  slug: string;
  name: string;
  icon?: string;
}

interface MovePostDialogProps {
  currentBoard: {
    id: string;
    name: string;
    icon: string;
  };
  onConfirm: (categoryId?: string, genusId?: string, speciesId?: string) => void;
  onCancel: () => void;
}

/**
 * 移贴对话框 - 三级板块选择
 */
export function MovePostDialog({ currentBoard, onConfirm, onCancel }: MovePostDialogProps) {
  const [categories, setCategories] = useState<Board[]>([]);
  const [genera, setGenera] = useState<Board[]>([]);
  const [species, setSpecies] = useState<Board[]>([]);
  
  const [categorySlug, setCategorySlug] = useState('');
  const [genusSlug, setGenusSlug] = useState('');
  const [speciesSlug, setSpeciesSlug] = useState('');
  
  const [loading, setLoading] = useState(false);

  // 加载科列表
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setCategories(data))
      .catch(() => null);
  }, []);

  // 加载属列表
  useEffect(() => {
    if (!categorySlug) {
      setGenera([]);
      setGenusSlug('');
      setSpecies([]);
      setSpeciesSlug('');
      return;
    }
    fetch(`/api/categories/${encodeURIComponent(categorySlug)}`)
      .then(r => r.json())
      .then(data => setGenera(data.genera || []))
      .catch(() => setGenera([]));
  }, [categorySlug]);

  // 加载品种列表
  useEffect(() => {
    if (!genusSlug) {
      setSpecies([]);
      setSpeciesSlug('');
      return;
    }
    fetch(`/api/genera/${encodeURIComponent(genusSlug)}?category=${encodeURIComponent(categorySlug)}`)
      .then(r => r.json())
      .then(data => setSpecies(data.species || []))
      .catch(() => setSpecies([]));
  }, [genusSlug, categorySlug]);

  const handleConfirm = () => {
    if (!categorySlug) {
      alert('请选择目标板块');
      return;
    }
    
    const selectedCategory = categories.find(c => c.slug === categorySlug);
    const selectedGenus = genera.find(g => g.slug === genusSlug);
    const selectedSpecies = species.find(s => s.slug === speciesSlug);
    
    onConfirm(
      selectedCategory?.id,
      selectedGenus?.id,
      selectedSpecies?.id
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="card mx-4 w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink-800">移动帖子</h3>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-600"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-leaf-100 bg-leaf-50/30 p-3">
          <div className="text-xs text-leaf-700/70 mb-1">当前板块</div>
          <div className="flex items-center gap-2">
            <CategoryIcon icon={currentBoard.icon} name={currentBoard.name} />
            <span className="text-sm font-medium text-ink-700">{currentBoard.name}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">
              <span className="text-rose-500">*</span> 选择科
            </label>
            <select
              value={categorySlug}
              onChange={(e) => {
                setCategorySlug(e.target.value);
                setGenusSlug('');
                setSpeciesSlug('');
              }}
              className="input"
            >
              <option value="">-- 请选择 --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">选择属（可选）</label>
            <select
              value={genusSlug}
              onChange={(e) => {
                setGenusSlug(e.target.value);
                setSpeciesSlug('');
              }}
              className="input"
              disabled={!categorySlug || genera.length === 0}
            >
              <option value="">
                {!categorySlug ? '请先选择科' : genera.length === 0 ? '该科暂无属' : '-- 请选择 --'}
              </option>
              {genera.map((g) => (
                <option key={g.id} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-700">选择品种（可选）</label>
            <select
              value={speciesSlug}
              onChange={(e) => setSpeciesSlug(e.target.value)}
              className="input"
              disabled={!genusSlug || species.length === 0}
            >
              <option value="">
                {!genusSlug ? '请先选择属' : species.length === 0 ? '该属暂无品种' : '-- 请选择 --'}
              </option>
              {species.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline flex-1"
            disabled={loading}
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn-primary flex-1"
            disabled={loading || !categorySlug}
          >
            确认移动
          </button>
        </div>
      </div>
    </div>
  );
}
