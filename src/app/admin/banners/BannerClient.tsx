'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import { ConfirmPopover } from '@/components/ui/ConfirmPopover';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './BannerClient.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  tint: string;
  orderIdx: number;
  enabled: boolean;
  durationMs: number;
}

const TINT_PRESETS = [
"from-leaf-700/70",
"from-leaf-900/70",
"from-rose-600/60",
"from-amber-600/60",
"from-blue-700/60",
"from-violet-700/60",
"from-ink-900/60",
"from-sand-300/60"];


export function BannerClient({ initial }: {initial: Banner[];}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Banner | 'new' | null>(null);

  const refresh = () => router.refresh();

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/admin/banners/${id}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '删除失败');
    }
  };

  const toggleEnabled = async (b: Banner) => {
    try {
      await api.patch(`/api/admin/banners/${b.id}`, { enabled: !b.enabled });
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    }
  };

  return (
    <div className={styles.r_3e7ce58d}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <div>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>🖼️ 首页 Banner</h1>
          <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>
            共 {initial.length} 张 · orderIdx 越小越靠前 · 单张停留可独立配置(0 = 用全站默认 3000ms)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_72a4c7cd, styles.r_218d0c3a)}>

          + 新建
        </button>
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_1004c0c3, styles.r_2f27a80e)}>
        {initial.map((b) =>
        <article
          key={b.id}
          className={cx(
            styles.r_2cd02d11,
            styles.r_a217b4ea,
            styles.r_ca6bcd4b,
            styles.r_5e10cdb8,
            b.enabled ? styles.r_358505cf : cx(styles.r_959f4a9f, styles.r_0c67ca47)
          )}>

            <div className={cx(styles.r_d89972fe, styles.r_188a6e22, styles.r_ce27a834)}>
              <Image
              src={b.image}
              alt={b.title}
              fill
              className={styles.r_7d85d0c2}
              unoptimized />

              <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_6ae7db2c, styles.r_0fe2b3da, `${b.tint}`)} />
              <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_8e63407b, styles.r_72a4c7cd)}>
                <div className={cx(styles.r_359090c2, styles.r_4f5874c5)}>{b.title}</div>
                <div className={cx(styles.r_15e1b1f4, styles.r_054cb4e3, styles.r_1dc571a3, styles.r_714816ef)}>{b.subtitle}</div>
              </div>
              <div className={cx(styles.r_da4dbfbc, styles.r_7b2d6393, styles.r_9a2db8f9, styles.r_60fbb771, styles.r_44ee8ba0)}>
                {!b.enabled &&
              <span className={cx(styles.r_07389a77, styles.r_e0467cf5, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_b54428d1)}>
                    已停用
                  </span>
              }
                <span className={cx(styles.r_07389a77, styles.r_6c21de57, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_eb6abb1f)}>
                  #{b.orderIdx}
                </span>
              </div>
            </div>
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e, styles.r_b950dda2, styles.r_358505cf, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2)}>
              <div className={styles.r_7b89cd85}>
                停留:{b.durationMs > 0 ? `${b.durationMs}ms` : '默认'}
                {' · '}
                跳转:{b.link}
              </div>
              <div className={cx(styles.r_60fbb771, styles.r_44ee8ba0)}>
                <button
                type="button"
                onClick={() => setEditing(b)}
                className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_5399e21f)}>

                  编辑
                </button>
                <button
                type="button"
                onClick={() => toggleEnabled(b)}
                className={
                b.enabled ? cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_5399e21f) : cx(styles.r_07389a77, styles.r_f2b23104, styles.r_d5eab218, styles.r_660d2eff, styles.r_5f6a59f1, styles.r_d8a68f7c)


                }>

                  {b.enabled ? '停用' : '启用'}
                </button>
                <ConfirmPopover
                title="确认删除 Banner"
                message="此操作不可恢复"
                confirmText="删除"
                danger
                onConfirm={() => remove(b.id)}>

                  <button
                  type="button"
                  className={cx(styles.r_07389a77, styles.r_e0467cf5, styles.r_d5eab218, styles.r_660d2eff, styles.r_b54428d1, styles.r_fd25c495)}>

                    删除
                  </button>
                </ConfirmPopover>
              </div>
            </div>
          </article>
        )}
        {initial.length === 0 &&
        <div className={cx(styles.r_2c955d1b, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_a4d0f420, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_7b89cd85)}>
            还没有 banner,点右上角「+ 新建」开始
          </div>
        }
      </div>

      {editing &&
      <EditDialog
        banner={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }} />

      }
    </div>);

}

function EditDialog({
  banner,
  onClose,
  onSaved




}: {banner: Banner | null;onClose: () => void;onSaved: () => void;}) {
  useBodyScrollLock(true);

  const [title, setTitle] = useState(banner?.title ?? '');
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? '');
  const [image, setImage] = useState(banner?.image ?? '');
  const [link, setLink] = useState(banner?.link ?? '/');
  const [tint, setTint] = useState(banner?.tint ?? TINT_PRESETS[0]);
  const [orderIdx, setOrderIdx] = useState(banner?.orderIdx ?? 0);
  const [enabled, setEnabled] = useState(banner?.enabled ?? true);
  const [durationMs, setDurationMs] = useState(banner?.durationMs ?? 0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return setErr('标题必填');
    if (!subtitle.trim()) return setErr('副标题必填');
    if (!image.trim()) return setErr('图片 URL 必填');
    setBusy(true);
    setErr(null);
    try {
      const body = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        image: image.trim(),
        link: link.trim() || '/',
        tint,
        orderIdx,
        enabled,
        durationMs
      };
      if (banner) {
        await api.patch(`/api/admin/banners/${banner.id}`, body);
      } else {
        await api.post('/api/admin/banners', body);
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
        className={cx(styles.r_6da6a3c3, styles.r_2cc8041e, styles.r_b4168890, styles.r_92bf82f4, styles.r_5e10cdb8, styles.r_0478c89a)}
        onClick={(e) => e.stopPropagation()}>

        <h3 className={cx(styles.r_da019856, styles.r_4ee73492, styles.r_e83a7042)}>{banner ? '编辑 Banner' : '新建 Banner'}</h3>

        <div className={cx(styles.r_6ed543e2, styles.r_359090c2)}>
          <Field label="标题">
            <Input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label="副标题">
            <Input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={500} />
          </Field>
          <Field label="图片 URL">
            <Input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b, styles.r_d058ca6d)} value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
          </Field>
          {image &&
          <div className={cx(styles.r_d89972fe, styles.r_188a6e22, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ce27a834)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)} />
              <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_6ae7db2c, styles.r_0fe2b3da, `${tint}`)} />
            </div>
          }
          <Field label="跳转链接">
            <Input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={link} onChange={(e) => setLink(e.target.value)} placeholder="/board/jingtian" />
          </Field>
          <Field label="遮罩色调 class">
            <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_58284b4e)}>
              {TINT_PRESETS.map((t) =>
              <button
                key={t}
                type="button"
                onClick={() => setTint(t)}
                className={cx(
                  styles.r_07389a77,
                  styles.r_d5eab218,
                  styles.r_660d2eff,
                  styles.r_0e65706b,
                  styles.r_1dc571a3,
                  tint === t ? cx(styles.r_01d0b06c, styles.r_72a4c7cd) : cx(styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_5399e21f)
                )}>

                  {t}
                </button>
              )}
            </div>
          </Field>
          <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_1004c0c3)}>
            <Field label="排序(越小越前)">
              <Input type="number" className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={orderIdx} onChange={(e) => setOrderIdx(Number(e.target.value))} />
            </Field>
            <Field label="停留(ms,0=默认 3000)">
              <Input type="number" className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={durationMs} onChange={(e) => setDurationMs(Number(e.target.value))} min={0} max={60000} step={500} />
            </Field>
            <Field label="启用">
              <label className={cx(styles.r_52083e7d, styles.r_e7a768f9, styles.r_3960ffc2, styles.r_77a2a20e)}>
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                <span>{enabled ? '启用' : '停用'}</span>
              </label>
            </Field>
          </div>
        </div>

        {err && <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>{err}</div>}

        <div className={cx(styles.r_fb77735e, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
          <button type="button" onClick={onClose} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_5399e21f)}>
            取消
          </button>
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
