'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import { ConfirmPopover } from '@/components/ui/ConfirmPopover';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './AnnouncementClient.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';



export interface Announcement {
  id: string;
  title: string;
  content: string;
  level: string;
  enabled: boolean;
  startAt: string | null;
  endAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const LEVEL_BADGE: Record<string, string> = {
  info: cx(styles.r_2eb3df8f, styles.r_65b7dd19),
  warning: cx(styles.r_735dd972, styles.r_85d79ebf),
  important: cx(styles.r_e0467cf5, styles.r_b54428d1)
};

export function AnnouncementClient({ initial }: {initial: Announcement[];}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);

  const refresh = () => router.refresh();

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/admin/announcements/${id}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '删除失败');
    }
  };

  const toggleEnabled = async (a: Announcement) => {
    try {
      await api.patch(`/api/admin/announcements/${a.id}`, { enabled: !a.enabled });
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    }
  };

  return (
    <div className={styles.r_3e7ce58d}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <div>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>📣 站内公告</h1>
          <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>共 {initial.length} 条</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_72a4c7cd, styles.r_218d0c3a)}>

          + 新建
        </button>
      </div>

      <div className={styles.r_6ed543e2}>
        {initial.map((a) =>
        <article key={a.id} className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_8e63407b)}>
            <header className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
              <span className={cx(styles.r_07389a77, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, LEVEL_BADGE[a.level] ?? styles.r_febec8f2)}>
                {a.level}
              </span>
              <h2 className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{a.title}</h2>
              {!a.enabled &&
            <span className={cx(styles.r_07389a77, styles.r_febec8f2, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_7b89cd85)}>已停用</span>
            }
              <span className={cx(styles.r_fb56d9cf, styles.r_d058ca6d, styles.r_7b89cd85)}>
                {new Date(a.createdAt).toLocaleDateString("zh-CN")}
              </span>
            </header>
            <p className={cx(styles.r_a2edcb1a, styles.r_359090c2, styles.r_eb6abb1f)}>{a.content}</p>
            {(a.startAt || a.endAt) &&
          <div className={cx(styles.r_50d0d216, styles.r_1dc571a3, styles.r_7b89cd85)}>
                窗口:{a.startAt ? new Date(a.startAt).toLocaleString("zh-CN") : '—'}
                {' → '}
                {a.endAt ? new Date(a.endAt).toLocaleString("zh-CN") : '长期'}
              </div>
          }
            <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_b950dda2, styles.r_358505cf, styles.r_ce335a8e, styles.r_359090c2)}>
              <button
              type="button"
              onClick={() => setEditing(a)}
              className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_5399e21f)}>

                编辑
              </button>
              <button
              type="button"
              onClick={() => toggleEnabled(a)}
              className={a.enabled ? cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_5399e21f) : cx(styles.r_07389a77, styles.r_f2b23104, styles.r_d5eab218, styles.r_660d2eff, styles.r_5f6a59f1, styles.r_d8a68f7c)


              }>

                {a.enabled ? '停用' : '启用'}
              </button>
              <ConfirmPopover
              title="确认删除公告"
              message="此操作不可恢复"
              confirmText="删除"
              danger
              onConfirm={() => remove(a.id)}>

                <button
                type="button"
                className={cx(styles.r_07389a77, styles.r_e0467cf5, styles.r_d5eab218, styles.r_660d2eff, styles.r_b54428d1, styles.r_fd25c495)}>

                  删除
                </button>
              </ConfirmPopover>
            </div>
          </article>
        )}
        {initial.length === 0 &&
        <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_a4d0f420, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_7b89cd85)}>
            还没有公告,点右上角「+ 新建」开始
          </div>
        }
      </div>

      {editing &&
      <EditDialog
        announcement={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }} />

      }
    </div>);

}

function EditDialog({
  announcement,
  onClose,
  onSaved




}: {announcement: Announcement | null;onClose: () => void;onSaved: () => void;}) {
  useBodyScrollLock(true);

  const [title, setTitle] = useState(announcement?.title ?? '');
  const [content, setContent] = useState(announcement?.content ?? '');
  const [level, setLevel] = useState(announcement?.level ?? 'info');
  const [enabled, setEnabled] = useState(announcement?.enabled ?? true);
  const [startAt, setStartAt] = useState(
    announcement?.startAt ? toLocal(announcement.startAt) : ''
  );
  const [endAt, setEndAt] = useState(
    announcement?.endAt ? toLocal(announcement.endAt) : ''
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) return setErr('标题必填');
    if (!content.trim()) return setErr('内容必填');
    setErr(null);
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        content: content.trim(),
        level,
        enabled,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        endAt: endAt ? new Date(endAt).toISOString() : undefined
      };
      if (announcement) {
        await api.patch(`/api/admin/announcements/${announcement.id}`, body);
      } else {
        await api.post('/api/admin/announcements', body);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_f3c543ad, styles.r_67d66567, styles.r_094a9df0, styles.r_8e63407b)}
      onClick={onClose}>

      <div
        className={cx(styles.r_6da6a3c3, styles.r_9ef2b581, styles.r_b4168890, styles.r_92bf82f4, styles.r_5e10cdb8, styles.r_0478c89a)}
        onClick={(e) => e.stopPropagation()}>

        <h3 className={cx(styles.r_da019856, styles.r_4ee73492, styles.r_e83a7042)}>
          {announcement ? '编辑公告' : '新建公告'}
        </h3>

        <div className={cx(styles.r_6ed543e2, styles.r_359090c2)}>
          <Field label="标题">
            <Input
              className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120} />

          </Field>
          <Field label="内容">
            <Textarea
              className={cx(styles.r_6da6a3c3, styles.r_7ee36c26, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={5000} />

          </Field>
          <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3)}>
            <Field label="级别">
              <select
                className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
                value={level}
                onChange={(e) => setLevel(e.target.value)}>

                <option value="info">info(普通)</option>
                <option value="warning">warning(提醒)</option>
                <option value="important">important(重要)</option>
              </select>
            </Field>
            <Field label="启用">
              <label className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_77a2a20e)}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)} />

                <span>{enabled ? '立即启用' : '暂停'}</span>
              </label>
            </Field>
          </div>
          <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3)}>
            <Field label="开始时间(可选)">
              <Input
                type="datetime-local"
                className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)} />

            </Field>
            <Field label="结束时间(可选)">
              <Input
                type="datetime-local"
                className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)} />

            </Field>
          </div>
        </div>

        {err &&
        <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>{err}</div>
        }

        <div className={cx(styles.r_fb77735e, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
          <button
            type="button"
            onClick={onClose}
            className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_5399e21f)}>

            取消
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_72a4c7cd, styles.r_218d0c3a)}>

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

function toLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
