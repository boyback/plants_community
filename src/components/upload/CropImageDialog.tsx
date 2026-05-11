'use client';

import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

interface Props {
  src: string;
  onCancel: () => void;
  onConfirm: (croppedUrl: string) => void;
}

const ASPECT_PRESETS = [
  { label: '自由', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
];

export function CropImageDialog({ src, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
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
      if (!areaPx) { setErr('请先调整裁剪框'); return; }
      const url = await cropImage(src, areaPx, rotation, flipH, flipV);
      onConfirm(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '裁剪失败');
    } finally {
      setBusy(false);
    }
  };

  const onSkip = () => {
    if (rotation === 0 && !flipH && !flipV) { onConfirm(src); return; }
    setBusy(true);
    cropImage(src, { x: 0, y: 0, width: 9999, height: 9999 }, rotation, flipH, flipV, true)
      .then((url) => onConfirm(url))
      .catch(() => onConfirm(src))
      .finally(() => setBusy(false));
  };

  const hasTransform = rotation !== 0 || flipH || flipV;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="card flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-leaf-100 px-4 py-3">
          <h3 className="text-base font-semibold">✂️ 裁剪图片</h3>
          <button type="button" onClick={onCancel} className="text-leaf-700/70 hover:text-leaf-700">×</button>
        </div>

        {/* 裁剪区 */}
        <div className="relative h-64 w-full flex-shrink-0 bg-black/90 sm:h-72">
          <style>{`
            .crop-area { touch-action: none; }
            .crop-area .CropArea__cropArea {
              border: 2px solid white !important;
              box-shadow: 0 0 0 9999em rgba(0,0,0,0.5) !important;
            }
          `}</style>
          <div className="crop-area h-full w-full">
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
              onCropComplete={onCropComplete}
            />
          </div>
          {areaPx && (
            <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white/80 tabular-nums">
              {Math.round(areaPx.width)} × {Math.round(areaPx.height)}
            </div>
          )}
        </div>

        {/* 工具栏 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 text-xs">
          <div className="space-y-3">
            {/* 提示 */}
            <div className="rounded-lg bg-leaf-50/60 px-3 py-2 text-[11px] leading-5 text-leaf-700/80">
              💡 拖动裁剪框移动位置；拖动<strong>四角或四边</strong>调整大小；裁剪框不会超出图片范围
            </div>

            {/* 旋转 */}
            <div>
              <div className="mb-1.5 text-leaf-700/70">旋转</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r - 90) % 360)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-leaf-200 bg-white py-2.5 text-leaf-700 transition-colors hover:border-leaf-400 hover:bg-leaf-50 active:scale-95"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 4v6h6" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  <span className="text-xs">左转 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-leaf-200 bg-white py-2.5 text-leaf-700 transition-colors hover:border-leaf-400 hover:bg-leaf-50 active:scale-95"
                >
                  <span className="text-xs">右转 90°</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 4v6h-6" />
                    <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 镜像翻转 */}
            <div>
              <div className="mb-1.5 text-leaf-700/70">镜像翻转</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFlipH((f) => !f)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 transition-all active:scale-95 ${
                    flipH
                      ? 'border-leaf-500 bg-leaf-500 text-white shadow-sm'
                      : 'border-leaf-200 bg-white text-leaf-700 hover:border-leaf-400 hover:bg-leaf-50'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" />
                    <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                  </svg>
                  <span className="text-xs">左右翻转</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlipV((f) => !f)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 transition-all active:scale-95 ${
                    flipV
                      ? 'border-leaf-500 bg-leaf-500 text-white shadow-sm'
                      : 'border-leaf-200 bg-white text-leaf-700 hover:border-leaf-400 hover:bg-leaf-50'
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v3" />
                    <path d="M3 16v3c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-3" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                  </svg>
                  <span className="text-xs">上下翻转</span>
                </button>
              </div>
            </div>

            {/* 比例 */}
            <div>
              <div className="mb-1.5 text-leaf-700/70">裁剪比例</div>
              <div className="flex flex-wrap gap-1.5">
                {ASPECT_PRESETS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { setAspect(item.value); setCustomW(''); setCustomH(''); }}
                    className={`rounded-full px-2.5 py-1 transition-colors ${
                      aspect === item.value && !customW && !customH
                        ? 'bg-leaf-500 text-white'
                        : 'bg-leaf-50 text-leaf-700 hover:bg-leaf-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="number" min="1" max="100"
                  value={customW}
                  onChange={(e) => { setCustomW(e.target.value); setAspect(null); }}
                  placeholder="宽"
                  className="w-16 rounded-lg border border-ink-200 px-2 py-1 text-center text-[11px]"
                />
                <span className="text-leaf-700/50">:</span>
                <input
                  type="number" min="1" max="100"
                  value={customH}
                  onChange={(e) => { setCustomH(e.target.value); setAspect(null); }}
                  placeholder="高"
                  className="w-16 rounded-lg border border-ink-200 px-2 py-1 text-center text-[11px]"
                />
                <button
                  type="button" onClick={applyCustomAspect}
                  disabled={!customW || !customH}
                  className="rounded-lg bg-leaf-500 px-2 py-1 text-[10px] text-white hover:bg-leaf-600 disabled:opacity-50"
                >
                  应用
                </button>
              </div>
            </div>

            {/* 缩放 - 进度条 */}
            <div>
              <div className="mb-1 flex items-center justify-between text-leaf-700/70">
                <span>缩放</span>
                <span className="tabular-nums">{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range" min="1" max="3" step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-leaf-500"
              />
              <div className="mt-0.5 flex justify-between text-[10px] text-leaf-700/50">
                <span>1x</span>
                <span>3x</span>
              </div>
            </div>

            {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-600">{err}</div>}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between border-t border-leaf-100 px-4 py-3">
          <div className="text-[11px]">
            {hasTransform ? (
              <button
                type="button"
                onClick={() => { setRotation(0); setFlipH(false); setFlipV(false); }}
                className="text-rose-600 hover:underline"
              >
                重置变换
              </button>
            ) : (
              <span className="text-leaf-700/60">拖拽裁剪框调整区域</span>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className="btn-outline !text-xs" disabled={busy}>
              取消
            </button>
            <button type="button" onClick={onSkip} className="rounded-lg border border-ink-200 px-3 py-2 text-xs hover:bg-ink-50" disabled={busy}>
              跳过裁剪
            </button>
            <button type="button" onClick={onConfirmClick} disabled={busy || !areaPx} className="btn-primary !text-xs">
              {busy ? '处理中…' : '确认裁剪'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function cropImage(
  imageSrc: string, area: Area, rotation: number,
  flipH: boolean, flipV: boolean, transformOnly = false
): Promise<string> {
  const img = await loadImage(imageSrc);
  const rad = (rotation * Math.PI) / 180;
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

  const maxOut = 2048;
  let oW = area.width, oH = area.height;
  if (oW > maxOut || oH > maxOut) {
    const s = maxOut / Math.max(oW, oH);
    oW = Math.round(oW * s);
    oH = Math.round(oH * s);
  }

  const canvas = document.createElement('canvas');
  canvas.width = oW;
  canvas.height = oH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(rotCanvas, area.x, area.y, area.width, area.height, 0, 0, oW, oH);

  return new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(URL.createObjectURL(b)) : reject(new Error('toBlob 失败')),
      'image/jpeg', 0.92
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
