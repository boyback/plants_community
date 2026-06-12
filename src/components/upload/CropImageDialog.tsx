'use client';

import { useCallback, useState } from 'react';
import Cropper, { type Area } from "react-easy-crop";
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './CropImageDialog.module.scss';
import { cx } from '@/lib/style-utils';



interface Props {
  src: string;
  onCancel: () => void;
  onConfirm: (croppedUrl: string) => void;
  /** 输出图片尺寸（宽=高），不传则自由尺寸 */
  outputSize?: number;
}

const ASPECT_PRESETS = [
{ label: '自由', value: null },
{ label: "1:1", value: 1 },
{ label: "4:3", value: 4 / 3 },
{ label: "3:4", value: 3 / 4 },
{ label: "16:9", value: 16 / 9 },
{ label: "9:16", value: 9 / 16 }];


export function CropImageDialog({ src, onCancel, onConfirm, outputSize }: Props) {
  useBodyScrollLock(true);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [aspect, setAspect] = useState<number | null>(outputSize ? 1 : null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setAreaPx(areaPixels);
  }, []);

  const applyCustomAspect = () => {
    const w = parseInt(customW, 10);
    const h = parseInt(customH, 10);
    if (w > 0 && h > 0) setAspect(w / h);
  };

  const onConfirmClick = async () => {
    setBusy(true);
    setErr('');
    try {
      if (!areaPx) {setErr('请先调整裁剪框');return;}
      const url = await cropImage(src, areaPx, rotation, flipH, flipV, false, outputSize);
      onConfirm(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '裁剪失败');
    } finally {
      setBusy(false);
    }
  };

  const onSkip = () => {
    if (rotation === 0 && !flipH && !flipV) {onConfirm(src);return;}
    setBusy(true);
    cropImage(src, { x: 0, y: 0, width: 9999, height: 9999 }, rotation, flipH, flipV, true).
    then((url) => onConfirm(url)).
    catch(() => onConfirm(src)).
    finally(() => setBusy(false));
  };

  const hasTransform = rotation !== 0 || flipH || flipV;

  return (
    <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_db1c7bcb, styles.r_8e63407b)} onClick={onCancel}>
      <div
        className={cx(styles.r_60fbb771, styles.r_b1d62136, styles.r_6da6a3c3, styles.r_6199866f, styles.r_8dddea07, styles.r_2cd02d11, styles.r_8a539c7f)}
        onClick={(e) => e.stopPropagation()}>

        {/* 标题栏 */}
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_65fdbade, styles.r_88b684d2, styles.r_f0faeb26, styles.r_1b2d54a3)}>
          <h3 className={cx(styles.r_4ee73492, styles.r_e83a7042)}>✂️ 裁剪图片</h3>
          <button type="button" onClick={onCancel} className={cx(styles.r_69335b95, styles.r_9825203a)}>×</button>
        </div>

        {/* 裁剪区 */}
        <div className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_6da6a3c3, styles.r_2074a75b, styles.r_d45d5957, styles.r_cb11fec3)}>
          <div className={styles.r_d89972fe} style={{ width: '75px', height: '75px' }}>
            <style>{`
              .crop-area { touch-action: none; }
              .crop-area .CropArea__cropArea {
                border: 2px solid white !important;
                box-shadow: 0 0 0 9999em rgba(0,0,0,0.5) !important;
              }
            `}</style>
            <div className={cx("crop-area", styles.r_668b21aa, styles.r_6da6a3c3)}>
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={aspect ?? undefined}
                rotation={rotation}
                cropShape="rect"
                showGrid={true}
                restrictPosition={true}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete} />

            </div>
            {areaPx &&
            <div className={cx(styles.r_da4dbfbc, styles.r_76b1b75b, styles.r_e632769a, styles.r_efaa0701, styles.r_07389a77, styles.r_db1c7bcb, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_201d4d37, styles.r_3032cae0, styles.r_e82ae8be)}>
                {Math.round(areaPx.width)} × {Math.round(areaPx.height)}
              </div>
            }
          </div>
        </div>

        {/* 工具栏 */}
        <div className={cx(styles.r_36e579c0, styles.r_92bf82f4, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_359090c2)}>
          <div className={styles.r_6ed543e2}>
            {/* 提示 */}
            <div className={cx(styles.r_5f22e64f, styles.r_a8a62ca4, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_d058ca6d, styles.r_7054e276, styles.r_21d33c50)}>
              💡 拖动裁剪框移动位置；拖动<strong>四角或四边</strong>调整大小；裁剪框不会超出图片范围
            </div>

            {/* 旋转 */}
            <div>
              <div className={cx(styles.r_d7c1392c, styles.r_69335b95)}>旋转</div>
              <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r - 90) % 360)}
                  className={cx(styles.r_60fbb771, styles.r_36e579c0, styles.r_3960ffc2, styles.r_86843cf1, styles.r_58284b4e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_e7ee55ac, styles.r_5f6a59f1, styles.r_ceb69a6b, styles.r_0a7c2f87, styles.r_5756b7b4, styles.r_fd156e61)}>

                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 4v6h6" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  <span className={styles.r_359090c2}>左转 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className={cx(styles.r_60fbb771, styles.r_36e579c0, styles.r_3960ffc2, styles.r_86843cf1, styles.r_58284b4e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_e7ee55ac, styles.r_5f6a59f1, styles.r_ceb69a6b, styles.r_0a7c2f87, styles.r_5756b7b4, styles.r_fd156e61)}>

                  <span className={styles.r_359090c2}>右转 90°</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 4v6h-6" />
                    <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 镜像翻转 */}
            <div>
              <div className={cx(styles.r_d7c1392c, styles.r_69335b95)}>镜像翻转</div>
              <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
                <button
                  type="button"
                  onClick={() => setFlipH((f) => !f)}
                  className={cx(styles.r_60fbb771, styles.r_36e579c0, styles.r_3960ffc2, styles.r_86843cf1, styles.r_58284b4e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_e7ee55ac, styles.r_0fe7d7d8, styles.r_fd156e61, `${
                  flipH ? cx(styles.r_d3b27cd9, styles.r_45499621, styles.r_72a4c7cd, styles.r_438b2237) : cx(styles.r_691861bc, styles.r_5e10cdb8, styles.r_5f6a59f1, styles.r_0a7c2f87, styles.r_5756b7b4)}`)


                  }>

                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" />
                    <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                  </svg>
                  <span className={styles.r_359090c2}>左右翻转</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipV((f) => !f)}
                  className={cx(styles.r_60fbb771, styles.r_36e579c0, styles.r_3960ffc2, styles.r_86843cf1, styles.r_58284b4e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_e7ee55ac, styles.r_0fe7d7d8, styles.r_fd156e61, `${
                  flipV ? cx(styles.r_d3b27cd9, styles.r_45499621, styles.r_72a4c7cd, styles.r_438b2237) : cx(styles.r_691861bc, styles.r_5e10cdb8, styles.r_5f6a59f1, styles.r_0a7c2f87, styles.r_5756b7b4)}`)


                  }>

                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v3" />
                    <path d="M3 16v3c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-3" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                  </svg>
                  <span className={styles.r_359090c2}>上下翻转</span>
                </button>
              </div>
            </div>

            {/* 比例 */}
            <div>
              <div className={cx(styles.r_d7c1392c, styles.r_69335b95)}>裁剪比例</div>
              <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_58284b4e)}>
                {ASPECT_PRESETS.map((item) =>
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {setAspect(item.value);setCustomW('');setCustomH('');}}
                  className={cx(styles.r_ac204c10, styles.r_0b91436d, styles.r_660d2eff, styles.r_ceb69a6b, `${
                  aspect === item.value && !customW && !customH ? cx(styles.r_45499621, styles.r_72a4c7cd) : cx(styles.r_7ebecbb6, styles.r_5f6a59f1, styles.r_2efc423a)}`)


                  }>

                    {item.label}
                  </button>
                )}
              </div>
              <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e)}>
                <input
                  type="number" min="1" max="100"
                  value={customW}
                  onChange={(e) => {setCustomW(e.target.value);setAspect(null);}}
                  placeholder="宽"
                  className={cx(styles.r_baceed34, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_ca6bf630, styles.r_d058ca6d)} />

                <span className={styles.r_3353f144}>:</span>
                <input
                  type="number" min="1" max="100"
                  value={customH}
                  onChange={(e) => {setCustomH(e.target.value);setAspect(null);}}
                  placeholder="高"
                  className={cx(styles.r_baceed34, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_ca6bf630, styles.r_d058ca6d)} />

                <button
                  type="button" onClick={applyCustomAspect}
                  disabled={!customW || !customH}
                  className={cx(styles.r_5f22e64f, styles.r_45499621, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_72a4c7cd, styles.r_24f5f8c9, styles.r_b29d8adb)}>

                  应用
                </button>
              </div>
            </div>

            {/* 缩放 - 进度条 */}
            <div>
              <div className={cx(styles.r_65281709, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_69335b95)}>
                <span>缩放</span>
                <span className={styles.r_3032cae0}>{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range" min="1" max="3" step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className={cx(styles.r_6da6a3c3, styles.r_5f66c7c0)} />

              <div className={cx(styles.r_15e1b1f4, styles.r_60fbb771, styles.r_8ef2268e, styles.r_1dc571a3, styles.r_3353f144)}>
                <span>1x</span>
                <span>3x</span>
              </div>
            </div>

            {err && <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_595fceba)}>{err}</div>}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_b950dda2, styles.r_88b684d2, styles.r_f0faeb26, styles.r_1b2d54a3)}>
          <div className={styles.r_d058ca6d}>
            {hasTransform ?
            <button
              type="button"
              onClick={() => {setRotation(0);setFlipH(false);setFlipV(false);}}
              className={cx(styles.r_595fceba, styles.r_f673f4a7)}>

                重置变换
              </button> :

            <span className={styles.r_6c4cc49e}>拖拽裁剪框调整区域</span>
            }
          </div>
          <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
            <button type="button" onClick={onCancel} className={styles.r_dd702538} disabled={busy}>
              取消
            </button>
            <button type="button" onClick={onSkip} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_5399e21f)} disabled={busy}>
              跳过裁剪
            </button>
            <button type="button" onClick={onConfirmClick} disabled={busy || !areaPx} className={styles.r_dd702538}>
              {busy ? '处理中…' : '确认裁剪'}
            </button>
          </div>
        </div>
      </div>
    </div>);

}

async function cropImage(
imageSrc: string, area: Area, rotation: number,
flipH: boolean, flipV: boolean, transformOnly = false,
outputSize?: number)
: Promise<string> {
  const img = await loadImage(imageSrc);
  const rad = rotation * Math.PI / 180;
  const absSin = Math.abs(Math.sin(rad));
  const absCos = Math.abs(Math.cos(rad));
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const rotW = Math.ceil(imgW * absCos + imgH * absSin);
  const rotH = Math.ceil(imgW * absSin + imgH * absCos);

  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = rotW;
  rotCanvas.height = rotH;
  const rotCtx = rotCanvas.getContext('2d')!;
  rotCtx.translate(rotW / 2, rotH / 2);
  rotCtx.rotate(rad);
  rotCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  rotCtx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);

  if (transformOnly) {
    return new Promise<string>((resolve, reject) => {
      rotCanvas.toBlob(
        (b) => b ? resolve(URL.createObjectURL(b)) : reject(new Error('toBlob 失败')),
        'image/jpeg', 0.92
      );
    });
  }

  // 输出尺寸
  let oW = outputSize || area.width;
  let oH = outputSize || area.height;
  if (!outputSize) {
    const maxOut = 2048;
    if (oW > maxOut || oH > maxOut) {
      const s = maxOut / Math.max(oW, oH);
      oW = Math.round(oW * s);
      oH = Math.round(oH * s);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = oW;
  canvas.height = oH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(rotCanvas, area.x, area.y, area.width, area.height, 0, 0, oW, oH);

  return new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(URL.createObjectURL(b)) : reject(new Error('toBlob 失败')),
      'image/png'
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
