'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import styles from './TaskRow.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



interface Task {
  id: string;
  slug: string;
  kind: string;
  title: string;
  description: string;
  icon: string;
  rewardPoints: number;
  rewardExp: number;
  target: number;
  triggerEvent: string;
  enabled: boolean;
}

export function TaskRow({ task }: {task: Task;}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    rewardPoints: task.rewardPoints,
    rewardExp: task.rewardExp,
    target: task.target
  });

  const patch = async (body: unknown) => {
    setBusy(true);
    try {
      await api.patch(`/api/admin/tasks/${task.id}`, body);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    void patch(draft).then(() => setEditing(false));
  };

  return (
    <tr className={cx(styles.r_b950dda2, styles.r_358505cf)}>
      <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ enabled: !task.enabled })}
          className={
          task.enabled ? cx(styles.r_07389a77, styles.r_f2b23104, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_5f6a59f1, styles.r_d8a68f7c) : cx(styles.r_07389a77, styles.r_febec8f2, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_02eb621e, styles.r_1e172434)


          }>

          {task.enabled ? '启用' : '停用'}
        </button>
      </td>
      <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <span>{task.icon}</span>
          <div>
            <div className={cx(styles.r_2689f395, styles.r_399e11a5)}>{task.title}</div>
            <div className={cx(styles.r_1dc571a3, styles.r_7b89cd85, styles.r_0e65706b)}>{task.slug}</div>
          </div>
        </div>
      </td>
      <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b, styles.r_d058ca6d, styles.r_02eb621e)}>{task.triggerEvent}</td>

      {editing ?
      <>
          <NumCell value={draft.target} onChange={(v) => setDraft({ ...draft, target: v })} min={1} />
          <NumCell value={draft.rewardPoints} onChange={(v) => setDraft({ ...draft, rewardPoints: v })} />
          <NumCell value={draft.rewardExp} onChange={(v) => setDraft({ ...draft, rewardExp: v })} />
          <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>
            <button
            type="button"
            onClick={save}
            disabled={busy}
            className={cx(styles.r_61816240, styles.r_07389a77, styles.r_6bceb016, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_72a4c7cd)}>

              存
            </button>
            <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraft({
                rewardPoints: task.rewardPoints,
                rewardExp: task.rewardExp,
                target: task.target
              });
            }}
            className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3)}>

              取
            </button>
          </td>
        </> :

      <>
          <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0)}>{task.target}</td>
          <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0, styles.r_595fceba)}>{task.rewardPoints}</td>
          <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0, styles.r_b17d6a13)}>{task.rewardExp}</td>
          <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>
            <button
            type="button"
            onClick={() => setEditing(true)}
            className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_5399e21f)}>

              编辑
            </button>
          </td>
        </>
      }
    </tr>);

}

function NumCell({
  value,
  onChange,
  min = 0




}: {value: number;onChange: (v: number) => void;min?: number;}) {
  return (
    <td className={cx(styles.r_d5eab218, styles.r_660d2eff)}>
      <Input
        type="number"
        min={min}
        className={cx(styles.r_baceed34, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d8e0e382, styles.r_465609a2, styles.r_308fc069, styles.r_d058ca6d, styles.r_3032cae0)}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))} />

    </td>);

}
