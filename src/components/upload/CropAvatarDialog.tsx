'use client';

import { useCallback, useState } from 'react';
import Cropper, { type Area } from "react-easy-crop";
import { Icon } from '@/components/ui/Icon';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './CropAvatarDialog.module.scss';
import { cx } from '@/lib/style-utils';



interface Props {
  /** 待裁剪的原始图片 URL(blob: 或 dataURL) */
  src: string;
  /** 是否是 GIF(GIF 不裁剪保留动画 — 仅展示原图,点确定直接返回原 blob) */
  isGif?: boolean;
  onCancel: () => void;
  onConfirm: (out: {blob: Blob;preview: string;}) => void;
}

const OUTPUT_SIZE = 512; // 输出 512x512 头像

/**
 * 头像裁剪对话框
 *
 * 行为:
 *   - 静态图(jpg/png/webp/heic→jpg/...) → react-easy-crop 拖拽缩放裁剪 1:1 输出 PNG
 *   - GIF(动图) → 不裁剪,直接预览原图,点确定返回原始 blob(保留动画)
 */
export function CropAvatarDialog({ src, isGif, onCancel, onConfirm }: Props) {
  useBodyScrollLock(true);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setAreaPx(areaPixels);
  }, []);

  const onConfirmClick = async () => {
    setBusy(true);
    setErr('');
    try {
      if (isGif) {
        // GIF 不裁剪,直接 fetch 原 blob
        const resp = await fetch(src);
        const blob = await resp.blob();
        onConfirm({ blob, preview: src });
        return;
      }
      if (!areaPx) {
        setErr('请先调整裁剪框');
        return;
      }
      const blob = await cropImageToBlob(src, areaPx, OUTPUT_SIZE);
      const preview = URL.createObjectURL(blob);
      onConfirm({ blob, preview });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '裁剪失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_f3c543ad, styles.r_67d66567, styles.r_db1c7bcb, styles.r_8e63407b)}
      onClick={onCancel}>

      <div
        className={cx(styles.r_6da6a3c3, styles.r_9794ab45, styles.r_2cd02d11, styles.r_8a539c7f)}
        onClick={(e) => e.stopPropagation()}>

        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_65fdbade, styles.r_88b684d2, styles.r_f0faeb26, styles.r_1b2d54a3)}>
          <h3 className={cx(styles.r_4ee73492, styles.r_e83a7042)}>
            {isGif ? '🎬 GIF 头像预览' : '✂️ 裁剪头像'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className={cx(styles.r_69335b95, styles.r_9825203a)}>

            ×
          </button>
        </div>

        {/* 裁剪区 */}
        <div className={cx(styles.r_d89972fe, styles.r_ff4a6777, styles.r_6da6a3c3, styles.r_d45d5957)}>
          {isGif ?
          // GIF 直接展示,不裁剪
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="GIF 预览"
            className={cx(styles.r_0214b4b3, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_b1104f41)} /> :


          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete} />

          }
        </div>

        {/* 工具栏 */}
        <div className={cx(styles.r_6ed543e2, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_359090c2)}>
          {!isGif &&
          <div>
              <div className={cx(styles.r_65281709, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_69335b95)}>
                <span>缩放</span>
                <span>{zoom.toFixed(1)}x</span>
              </div>
              <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className={cx(styles.r_6da6a3c3, styles.r_5f66c7c0)} />

            </div>
          }
          {isGif &&
          <div className={cx(styles.r_5f22e64f, styles.r_a8a62ca4, styles.r_7660b450, styles.r_d058ca6d, styles.r_21d33c50)}>
              ℹ️ GIF 头像保留动画,不进行裁剪
            </div>
          }
          {err && <div className={styles.r_595fceba}>{err}</div>}
          <div className={cx(styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e, styles.r_b950dda2, styles.r_88b684d2, styles.r_ce335a8e)}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.r_dd702538}
              disabled={busy}>

              取消
            </button>
            <button
              type="button"
              onClick={onConfirmClick}
              disabled={busy || !isGif && !areaPx}
              className={styles.r_dd702538}>

              <Icon name="check" size={12} />
              {busy ? '处理中…' : '确定使用'}
            </button>
          </div>
        </div>
      </div>
    </div>);

}

/**
 * 把图片按裁剪区域绘制到 canvas → toBlob(PNG)
 */
async function cropImageToBlob(
imageSrc: string,
area: Area,
outputSize: number)
: Promise<Blob> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 不可用');

  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error('toBlob 失败')),
      'image/png',
      0.92
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });
}
