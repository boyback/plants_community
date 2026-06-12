'use client';

import { useState } from 'react';
import { api, ApiError } from "@/lib/client-api";
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './SpeciesEditDialog.module.scss';
import { cx } from '@/lib/style-utils';



interface Species {
  id: string;
  genusId?: string;
  slug: string;
  name: string;
  latinName: string | null;
  description?: string;
  cover: string | null;
  orderIdx: number;
}

export function SpeciesEditDialog({
  genusId,
  species,
  onClose,
  onSaved





}: {genusId: string;species: Species | null;onClose: () => void;onSaved: () => void;}) {
  useBodyScrollLock(true);

  const [slug, setSlug] = useState(species?.slug ?? '');
  const [name, setName] = useState(species?.name ?? '');
  const [latinName, setLatinName] = useState(species?.latinName ?? '');
  const [description, setDescription] = useState(species?.description ?? '');
  const [cover, setCover] = useState(species?.cover ?? '');
  const [orderIdx, setOrderIdx] = useState(species?.orderIdx ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!slug.trim() || !name.trim()) return setErr('slug / name 必填');
    setBusy(true);
    try {
      const body = {
        genusId,
        slug: slug.trim(),
        name: name.trim(),
        latinName: latinName.trim() || null,
        description: description.trim(),
        cover: cover.trim() || null,
        orderIdx
      };
      if (species) {
        await api.patch(`/api/admin/species/${species.id}`, body);
      } else {
        await api.post('/api/admin/species', body);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_f3c543ad, styles.r_67d66567, styles.r_094a9df0, styles.r_8e63407b)} onClick={onClose}>
      <div className={cx(styles.r_6da6a3c3, styles.r_6199866f, styles.r_b4168890, styles.r_92bf82f4, styles.r_5e10cdb8, styles.r_0478c89a)} onClick={(e) => e.stopPropagation()}>
        <h3 className={cx(styles.r_da019856, styles.r_4ee73492, styles.r_e83a7042)}>{species ? '编辑品种' : '新建品种'}</h3>

        <div className={cx(styles.r_6ed543e2, styles.r_359090c2)}>
          <Field label="slug *">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b)} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="echeveria-elegans" />
          </Field>
          <Field label="中文名 *">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={name} onChange={(e) => setName(e.target.value)} placeholder="月影" />
          </Field>
          <Field label="拉丁名">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_90665ca6)} value={latinName ?? ''} onChange={(e) => setLatinName(e.target.value)} placeholder="Echeveria elegans" />
          </Field>
          <Field label="描述">
            <textarea className={cx(styles.r_6da6a3c3, styles.r_a4197e87, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </Field>
          <Field label="封面图 URL(选填)">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b, styles.r_d058ca6d)} value={cover ?? ''} onChange={(e) => setCover(e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="排序(越小越前)">
            <input type="number" className={cx(styles.r_516b03df, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={orderIdx} onChange={(e) => setOrderIdx(Number(e.target.value))} />
          </Field>
        </div>

        {err && <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>{err}</div>}

        <div className={cx(styles.r_fb77735e, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
          <button type="button" onClick={onClose} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_5399e21f)}>取消</button>
          <button type="button" disabled={busy} onClick={submit} className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_72a4c7cd, styles.r_218d0c3a)}>
            {busy ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>);

}

function Field({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <label className={styles.r_0214b4b3}>
      <div className={cx(styles.r_65281709, styles.r_d058ca6d, styles.r_2689f395, styles.r_02eb621e)}>{label}</div>
      {children}
    </label>);

}
