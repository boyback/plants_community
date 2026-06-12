'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { toast } from '@/components/ui/Toast';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './MovePostDialog.module.scss';
import { cx } from '@/lib/style-utils';



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
  onConfirm: (boardId?: string, genusId?: string, speciesId?: string) => void;
  onCancel: () => void;
}

/**
 * 移贴对话框 - 三级板块选择
 */
export function MovePostDialog({ currentBoard, onConfirm, onCancel }: MovePostDialogProps) {
  useBodyScrollLock(true);

  const [boards, setCategories] = useState<Board[]>([]);
  const [genera, setGenera] = useState<Board[]>([]);
  const [species, setSpecies] = useState<Board[]>([]);

  const [categorySlug, setCategorySlug] = useState('');
  const [genusSlug, setGenusSlug] = useState('');
  const [speciesSlug, setSpeciesSlug] = useState('');

  const [loading, setLoading] = useState(false);

  // 加载科列表
  useEffect(() => {
    fetch('/api/boards').
    then((r) => r.json()).
    then((data) => setCategories(data)).
    catch(() => null);
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
    fetch(`/api/boards/${encodeURIComponent(categorySlug)}`).
    then((r) => r.json()).
    then((data) => setGenera(data.genera || [])).
    catch(() => setGenera([]));
  }, [categorySlug]);

  // 加载品种列表
  useEffect(() => {
    if (!genusSlug) {
      setSpecies([]);
      setSpeciesSlug('');
      return;
    }
    fetch(`/api/genera/${encodeURIComponent(genusSlug)}?board=${encodeURIComponent(categorySlug)}`).
    then((r) => r.json()).
    then((data) => setSpecies(data.species || [])).
    catch(() => setSpecies([]));
  }, [genusSlug, categorySlug]);

  const handleConfirm = () => {
    if (!categorySlug) {
      toast.error('请选择目标板块');
      return;
    }

    const selectedCategory = boards.find((c) => c.slug === categorySlug);
    const selectedGenus = genera.find((g) => g.slug === genusSlug);
    const selectedSpecies = species.find((s) => s.slug === speciesSlug);

    onConfirm(
      selectedCategory?.id,
      selectedGenus?.id,
      selectedSpecies?.id
    );
  };

  return (
    <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_53bb3a28)} onClick={onCancel}>
      <div className={cx(styles.r_3a22f30b, styles.r_6da6a3c3, styles.r_6199866f, styles.r_0478c89a)} onClick={(e) => e.stopPropagation()}>
        <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <h3 className={cx(styles.r_42536e69, styles.r_e83a7042, styles.r_399e11a5)}>移动帖子</h3>
          <button
            type="button"
            onClick={onCancel}
            className={cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_67d66567, styles.r_0c5e9137, styles.r_66a36c90, styles.r_9cab05a6, styles.r_dd42d0c0)}>

            <Icon name="close" size={16} />
          </button>
        </div>

        <div className={cx(styles.r_da019856, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_54720a96, styles.r_eb6e8b88)}>
          <div className={cx(styles.r_359090c2, styles.r_69335b95, styles.r_65281709)}>当前板块</div>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
            <CategoryIcon icon={currentBoard.icon} name={currentBoard.name} />
            <span className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f)}>{currentBoard.name}</span>
          </div>
        </div>

        <div className={styles.r_6ed543e2}>
          <div>
            <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f)}>
              <span className={styles.r_fa512798}>*</span> 选择科
            </label>
            <select
              value={categorySlug}
              onChange={(e) => {
                setCategorySlug(e.target.value);
                setGenusSlug('');
                setSpeciesSlug('');
              }}
              className="input">

              <option value="">-- 请选择 --</option>
              {boards.map((c) =>
              <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              )}
            </select>
          </div>

          <div>
            <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f)}>选择属（可选）</label>
            <select
              value={genusSlug}
              onChange={(e) => {
                setGenusSlug(e.target.value);
                setSpeciesSlug('');
              }}
              className="input"
              disabled={!categorySlug || genera.length === 0}>

              <option value="">
                {!categorySlug ? '请先选择科' : genera.length === 0 ? '该科暂无属' : '-- 请选择 --'}
              </option>
              {genera.map((g) =>
              <option key={g.id} value={g.slug}>
                  {g.name}
                </option>
              )}
            </select>
          </div>

          <div>
            <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f)}>选择品种（可选）</label>
            <select
              value={speciesSlug}
              onChange={(e) => setSpeciesSlug(e.target.value)}
              className="input"
              disabled={!genusSlug || species.length === 0}>

              <option value="">
                {!genusSlug ? '请先选择属' : species.length === 0 ? '该属暂无品种' : '-- 请选择 --'}
              </option>
              {species.map((s) =>
              <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              )}
            </select>
          </div>
        </div>

        <div className={cx(styles.r_31f25533, styles.r_60fbb771, styles.r_1004c0c3)}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.r_36e579c0}
            disabled={loading}>

            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={styles.r_36e579c0}
            disabled={loading || !categorySlug}>

            确认移动
          </button>
        </div>
      </div>
    </div>);

}
