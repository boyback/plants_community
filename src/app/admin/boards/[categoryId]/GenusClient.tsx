'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import { DangerConfirmPopover } from '@/components/ui/ConfirmPopover';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './GenusClient.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';



interface Genus {
  id: string;
  boardId: string | null;
  slug: string;
  name: string;
  latinName: string | null;
  description: string;
  cover: string | null;
  orderIdx: number;
  speciesCount: number;
  postCount: number;
}

export function GenusClient({
  boardId,
  initial



}: {boardId: string;initial: Genus[];}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Genus | 'new' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const remove = async (g: Genus) => {
    if (g.speciesCount > 0 || g.postCount > 0) {
      toast.error('该属下还有品种或帖子,无法删除');
      return;
    }
    setBusy(g.id);
    try {
      await api.delete(`/api/admin/genera/${g.id}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '删除失败');
    } finally {
      setBusy(null);
    }
  };

  const updateOrder = async (g: Genus, n: number) => {
    if (n === g.orderIdx) return;
    setBusy(g.id);
    try {
      await api.patch(`/api/admin/genera/${g.id}`, { orderIdx: n });
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.r_3e7ce58d}>
      <div className={cx(styles.r_60fbb771, styles.r_77c08e01)}>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_72a4c7cd, styles.r_218d0c3a)}>

          + 新建属
        </button>
      </div>

      <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
        <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
          <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
            <tr>
              <th className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_2eba0d65)}>名字 / slug</th>
              <th className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_2eba0d65)}>拉丁名</th>
              <th className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_308fc069)}>品种/帖</th>
              <th className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_ca6bf630)}>排序</th>
              <th className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_308fc069)}>操作</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((g) =>
            <tr key={g.id} className={cx(styles.r_b950dda2, styles.r_358505cf, styles.r_d9a085ef)}>
                <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f)}>
                  <div className={styles.r_2689f395}>{g.name}</div>
                  <div className={cx(styles.r_1dc571a3, styles.r_7b89cd85, styles.r_0e65706b)}>{g.slug}</div>
                </td>
                <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_90665ca6, styles.r_02eb621e)}>{g.latinName ?? '—'}</td>
                <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0, styles.r_02eb621e)}>
                  {g.speciesCount} / {g.postCount}
                </td>
                <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_ca6bf630)}>
                  <Input
                  type="number"
                  defaultValue={g.orderIdx}
                  onBlur={(e) => updateOrder(g, Number(e.target.value))}
                  disabled={busy === g.id}
                  className={cx(styles.r_7e74e5fe, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_45d82811, styles.r_465609a2, styles.r_ca6bf630, styles.r_d058ca6d)} />

                </td>
                <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_308fc069)}>
                  <Link
                  href={`/admin/species?genusId=${g.id}`}
                  className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_5399e21f)}>

                    品种
                  </Link>
                  <button
                  type="button"
                  onClick={() => setEditing(g)}
                  className={cx(styles.r_f58b0257, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_5399e21f)}>

                    编辑
                  </button>
                  <DangerConfirmPopover
                  title={`确定删除「${g.name}」属？`}
                  message="此操作不可恢复"
                  confirmText="确定"
                  onConfirm={() => remove(g)}>

                    <button
                    type="button"
                    disabled={busy === g.id}
                    className={cx(styles.r_f58b0257, styles.r_07389a77, styles.r_e0467cf5, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_b54428d1, styles.r_fd25c495)}>

                      删除
                    </button>
                  </DangerConfirmPopover>
                </td>
              </tr>
            )}
            {initial.length === 0 &&
            <tr>
                <td colSpan={5} className={cx(styles.r_0e17f2bd, styles.r_1100bef6, styles.r_ca6bf630, styles.r_7b89cd85)}>
                  还没有属,点右上角「+ 新建属」开始
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      {editing &&
      <GenusEditDialog
        boardId={boardId}
        genus={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }} />

      }
    </div>);

}

function GenusEditDialog({
  boardId,
  genus,
  onClose,
  onSaved





}: {boardId: string;genus: Genus | null;onClose: () => void;onSaved: () => void;}) {
  useBodyScrollLock(true);

  const [slug, setSlug] = useState(genus?.slug ?? '');
  const [name, setName] = useState(genus?.name ?? '');
  const [latinName, setLatinName] = useState(genus?.latinName ?? '');
  const [description, setDescription] = useState(genus?.description ?? '');
  const [cover, setCover] = useState(genus?.cover ?? '');
  const [orderIdx, setOrderIdx] = useState(genus?.orderIdx ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!slug.trim() || !name.trim()) return setErr('slug / name 必填');
    setBusy(true);
    try {
      const body = {
        boardId,
        slug: slug.trim(),
        name: name.trim(),
        latinName: latinName.trim() || null,
        description: description.trim(),
        cover: cover.trim() || null,
        orderIdx
      };
      if (genus) {
        await api.patch(`/api/admin/genera/${genus.id}`, body);
      } else {
        await api.post('/api/admin/genera', body);
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
        <h3 className={cx(styles.r_da019856, styles.r_4ee73492, styles.r_e83a7042)}>{genus ? '编辑属' : '新建属'}</h3>

        <div className={cx(styles.r_6ed543e2, styles.r_359090c2)}>
          <Field label="slug *">
            <Input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b)} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="echeveria" />
          </Field>
          <Field label="中文名 *">
            <Input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={name} onChange={(e) => setName(e.target.value)} placeholder="拟石莲花属" />
          </Field>
          <Field label="拉丁名">
            <Input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_90665ca6)} value={latinName ?? ''} onChange={(e) => setLatinName(e.target.value)} placeholder="Echeveria" />
          </Field>
          <Field label="描述">
            <Textarea className={cx(styles.r_6da6a3c3, styles.r_a4197e87, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </Field>
          <Field label="封面图 URL(选填)">
            <Input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b, styles.r_d058ca6d)} value={cover ?? ''} onChange={(e) => setCover(e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="排序(越小越前)">
            <Input type="number" className={cx(styles.r_516b03df, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={orderIdx} onChange={(e) => setOrderIdx(Number(e.target.value))} />
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
