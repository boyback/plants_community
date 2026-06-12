'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './ContributionReviewActions.module.scss';
import { cx } from '@/lib/style-utils';



export function ContributionReviewActions({
  id,
  disabled,
  images,
  existingImages





}: {id: string;disabled?: boolean;images?: string[];existingImages?: string[];}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>(images ?? []);
  const [cover, setCover] = useState('');
  const [preview, setPreview] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const existingSet = new Set(existingImages ?? []);
  useBodyScrollLock(Boolean(preview));

  const review = async (status: 'approved' | 'rejected', applyToSpecies = false) => {
    if (busy || disabled) return;
    setBusy(applyToSpecies ? 'apply' : status);
    try {
      const applyOptions = images?.length ?
      {
        images: selectedImages.length > 0 ? selectedImages : images,
        cover: cover || undefined
      } :
      undefined;
      await api.patch(`/api/admin/species/contributions/${id}/review`, {
        status,
        applyToSpecies,
        applyOptions,
        reviewNote: reviewNote.trim() || undefined
      });
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '审核失败');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.r_6f7e013d}>
      {preview &&
      <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_95a04d1b, styles.r_0478c89a)} onClick={() => setPreview('')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className={cx(styles.r_a201da4b, styles.r_c0980a65, styles.r_a217b4ea, styles.r_5e10cdb8, styles.r_b1104f41)} />
        </div>
      }

      {images?.length ?
      <div className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_7660b450, styles.r_2eba0d65)}>
          <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1dc571a3, styles.r_7b89cd85)}>
            <span>写入图片</span>
            <button
            type="button"
            disabled={disabled || Boolean(busy)}
            onClick={() => setSelectedImages(selectedImages.length === images.length ? [] : images)}
            className={cx(styles.r_2689f395, styles.r_5f6a59f1, styles.r_b29d8adb)}>

              {selectedImages.length === images.length ? '清空' : '全选'}
            </button>
          </div>
          <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_44ee8ba0)}>
            {images.map((url, index) => {
            const checked = selectedImages.includes(url);
            const duplicated = existingSet.has(url);
            return (
              <div
                key={url}
                className={cx(styles.r_d89972fe, styles.r_2cd02d11, styles.r_07389a77, styles.r_ca6bcd4b, `${checked ? styles.r_d3b27cd9 : cx(styles.r_358505cf, styles.r_0b8c506a)}`)}
                title={`图片 ${index + 1}`}>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className={cx(styles.r_508ebf85, styles.r_6da6a3c3, styles.r_3bbc8c13, styles.r_7d85d0c2)} onClick={() => setPreview(url)} />
                  <button
                  type="button"
                  disabled={disabled || Boolean(busy)}
                  onClick={() => {
                    setSelectedImages((prev) => prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]);
                    if (cover === url) setCover('');
                  }}
                  className={cx(styles.r_da4dbfbc, styles.r_7971386c, styles.r_c55dcda2, styles.r_07389a77, styles.r_6c21de57, styles.r_d8e0e382, styles.r_e0988086, styles.r_e83a7042, styles.r_eb6abb1f)}>

                    {checked ? '选中' : '跳过'}
                  </button>
                  {duplicated && <span className={cx(styles.r_da4dbfbc, styles.r_57045bd8, styles.r_7971386c, styles.r_07389a77, styles.r_25f650b2, styles.r_d8e0e382, styles.r_e0988086, styles.r_e83a7042, styles.r_72a4c7cd)}>重复</span>}
                </div>);

          })}
          </div>
          <select
          value={cover}
          disabled={disabled || Boolean(busy)}
          onChange={(e) => setCover(e.target.value)}
          className={cx(styles.r_50d0d216, styles.r_d0a52b31, styles.r_6da6a3c3, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_d5eab218, styles.r_1dc571a3, styles.r_df37b1fd, styles.r_df4824ca)}>

            <option value="">不改封面</option>
            {selectedImages.map((url, index) =>
          <option key={url} value={url}>设第 {index + 1} 张为封面</option>
          )}
          </select>
        </div> :
      null}

      <textarea
        value={reviewNote}
        disabled={disabled || Boolean(busy)}
        onChange={(e) => setReviewNote(e.target.value)}
        placeholder="审核备注，可选"
        className={cx(styles.r_0cfe3fb5, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_df37b1fd, styles.r_df4824ca)}
        maxLength={500} />


      <div className={cx(styles.r_60fbb771, styles.r_77c08e01, styles.r_44ee8ba0)}>
        <button
          type="button"
          disabled={disabled || Boolean(busy)}
          onClick={() => void review('approved', true)}
          className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_2689f395, styles.r_85d79ebf, styles.r_3e162340, styles.r_5f533b3a, styles.r_b29d8adb)}>

          {busy === 'apply' ? '写入中...' : '写入并通过'}
        </button>
        <button
          type="button"
          disabled={disabled || Boolean(busy)}
          onClick={() => void review('approved')}
          className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_2689f395, styles.r_5f6a59f1, styles.r_5756b7b4, styles.r_5f533b3a, styles.r_b29d8adb)}>

          {busy === 'approved' ? '通过中...' : '通过'}
        </button>
        <button
          type="button"
          disabled={disabled || Boolean(busy)}
          onClick={() => void review('rejected')}
          className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_959f4a9f, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_2689f395, styles.r_b54428d1, styles.r_85cfcc24, styles.r_5f533b3a, styles.r_b29d8adb)}>

          {busy === 'rejected' ? '拒绝中...' : '拒绝'}
        </button>
      </div>
    </div>);

}
