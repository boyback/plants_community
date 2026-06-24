'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from "@/lib/client-api";
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { SpeciesEditForm, type GenusOption, type SpeciesData } from './SpeciesEditForm';
import styles from './AdminSpeciesTable.module.scss';
import { cx } from '@/lib/style-utils';



type SpeciesRow = SpeciesData & {
  genus: {
    id: string;
    name: string;
    slug: string;
    board: {slug: string;name: string;} | null;
  };
  _count: {posts: number;};
};

export function AdminSpeciesTable({
  items,
  genera



}: {items: SpeciesRow[];genera: GenusOption[];}) {
  const router = useRouter();
  const [editing, setEditing] = useState<SpeciesRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SpeciesRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const done = () => {
    close();
    router.refresh();
  };

  const remove = async () => {
    const species = pendingDelete;
    if (!species) return;
    if (deletingId) return;
    setDeletingId(species.id);
    try {
      await api.delete(`/api/admin/species/${species.id}`);
      toast.success('删除成功');
      setPendingDelete(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className={cx(styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
        <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
          <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
            <tr>
              <th className={cx(styles.r_baceed34, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>图</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>中文</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>拉丁</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>属 / 科</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>难度</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>光 / 水 / 冬</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>帖子</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) =>
            <tr key={s.id} className={cx(styles.r_b950dda2, styles.r_358505cf, styles.r_d9a085ef)}>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  <div className={cx(styles.r_d89972fe, styles.r_426b8b75, styles.r_d854e569, styles.r_2cd02d11, styles.r_07389a77, styles.r_ce27a834)}>
                    <Image src={s.cover} alt="" fill className={styles.r_7d85d0c2} unoptimized />
                  </div>
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  {s.genus.board ?
                <Link
                  href={`/plants/${s.genus.board.slug}/${s.genus.slug}/${s.slug}`}
                  target="_blank"
                  className={cx(styles.r_2689f395, styles.r_399e11a5, styles.r_f673f4a7)}>

                      {s.name}
                    </Link> :

                <span className={cx(styles.r_2689f395, styles.r_399e11a5)}>{s.name}</span>
                }
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_90665ca6, styles.r_02eb621e)}>{s.latinName}</td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_d058ca6d)}>
                  <div>{s.genus.name}</div>
                  <div className={styles.r_7b89cd85}>{s.genus.board?.name ?? '未关联板块'}</div>
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_47d65ecb)}>
                  {'★'.repeat(s.difficulty)}
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_1dc571a3, styles.r_02eb621e)}>
                  ☀️ {s.light} · 💧 {s.watering} · ❄️ {s.hardiness}
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0, styles.r_02eb621e)}>
                  {s._count.posts}
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>
                  <div className={cx(styles.r_60fbb771, styles.r_77c08e01, styles.r_44ee8ba0)}>
                    <button
                    type="button"
                    onClick={() => setEditing(s)}
                    className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_5399e21f)}>

                      编辑
                    </button>
                    <button
                    type="button"
                    onClick={() => setPendingDelete(s)}
                    disabled={deletingId === s.id}
                    className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_959f4a9f, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_b54428d1, styles.r_85cfcc24, styles.r_5f533b3a, styles.r_d463b664)}>

                      {deletingId === s.id ? '删除中' : '删除'}
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {items.length === 0 &&
            <tr>
                <td colSpan={8} className={cx(styles.r_0e17f2bd, styles.r_1100bef6, styles.r_ca6bf630, styles.r_7b89cd85)}>
                  没有数据
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => setCreating(true)}
        className={cx(styles.r_7bc55599, styles.r_4c049197, styles.r_82d7e544, styles.r_5f22e64f, styles.r_01d0b06c, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_359090c2, styles.r_2689f395, styles.r_72a4c7cd, styles.r_06bbb431, styles.r_218d0c3a)}>

        + 新建品种
      </button>

      <Dialog
        open={Boolean(editing || creating)}
        onClose={close}
        title={creating ? '新建品种' : editing ? `编辑品种：${editing.name}` : '编辑品种'}
        maxWidth="xl">

        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>保存后留在品种数据列表页</p>
        <div className={styles.r_c07e54fd}>
          <SpeciesEditForm
            species={editing}
            genera={genera}
            onDone={done}
            onCancel={close} />

        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deletingId) setPendingDelete(null);
        }}
        onConfirm={() => void remove()}
        title="删除品种"
        message={pendingDelete ? `确认删除「${pendingDelete.name}」？\n此操作不可撤销。` : ''}
        confirmText={deletingId ? '删除中...' : '删除'}
        cancelText="取消"
        danger />

    </>);

}
