'use client';

import { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nContext';

export type PayChannel = 'wechat' | 'alipay';
export type PayQrStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'refunded';

/** 二维码生成后的"预热窗口":此期间禁止扫码(支付宝侧还在落单) */
const WARMUP_MS = 3000;

/**
 * 支付二维码:三态渲染
 *   1. pending,未扫码    → 清晰二维码,无动画
 *   2. pending + scanning → 扫描光束动画("已扫码,请支付")
 *   3. paid              → 遮罩 + 绿色圆勾
 *   4. expired           → 遮罩 + ⌛"已过期"
 *
 *   - text 为 http(s) URL 时,使用 qrcode 真实渲染
 *   - text 为 mock://... 时,渲染"演示二维码"占位(点阵,不可扫)
 */
export function PaymentQr({
  text,
  channel,
  status = 'pending',
  scanning = false,
}: {
  text: string;
  channel: PayChannel;
  status?: PayQrStatus;
  /** 是否已被扫码(由后端 alipay.trade.query 推断) */
  scanning?: boolean;
}) {
  const { t } = useI18n();
  const isReal = /^https?:\/\//.test(text);
  const [dataUrl, setDataUrl] = useState<string>('');
  /** 二维码刚生成时有一段预热期(支付宝侧还在落单),期间蒙层"生成中" */
  const [warming, setWarming] = useState<boolean>(true);
  const warmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isReal) {
      setWarming(false);
      return;
    }
    let cancelled = false;
    setWarming(true);
    QRCodeLib.toDataURL(text, {
      width: 256,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#14281f', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch((err) => {
        console.warn('[PaymentQr] render failed:', err);
      });
    if (warmTimer.current) clearTimeout(warmTimer.current);
    warmTimer.current = setTimeout(() => {
      if (!cancelled) setWarming(false);
    }, WARMUP_MS);
    return () => {
      cancelled = true;
      if (warmTimer.current) clearTimeout(warmTimer.current);
    };
  }, [text, isReal]);

  const channelColor = channel === 'wechat' ? 'text-leaf-600' : 'text-blue-600';
  const channelLabel = channel === 'wechat'
    ? t('checkout.channelWechat')
    : t('checkout.channelAlipay');

  if (!isReal) {
    return <MockQr text={text} channel={channel} status={status} scanning={scanning} />;
  }

  // 仅「已扫码、等待支付」才显示扫描中蒙层
  const showScan = status === 'pending' && scanning && dataUrl !== '';
  const showPaid = status === 'paid';
  const showExpired = status === 'expired';
  const showWarming = warming && dataUrl !== '' && !showPaid && !showExpired && !showScan;

  return (
    <div className="rounded-xl bg-white p-3 shadow">
      <div className="relative h-48 w-48 overflow-hidden rounded">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="pay QR" className="h-48 w-48" />
        ) : (
          <div className="grid h-48 w-48 place-items-center text-xs text-leaf-700/60">
            {t('checkout.generatingQr', { channel: channelLabel })}
          </div>
        )}

        {showWarming && <WarmingOverlay label={t('checkout.warming')} />}
        {showScan && <ScanningOverlay channel={channel} label={t('checkout.scanning')} />}
        {showPaid && <PaidOverlay />}
        {showExpired && <ExpiredOverlay label={t('checkout.qrExpired')} />}
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-medium">
        <span className={channelColor}>{channelLabel}</span>
        <span className="text-leaf-700/60">·
          {showWarming
            ? ` ${t('checkout.warming')}`
            : showScan
            ? ` ${t('checkout.scanning')}`
            : ` ${t('checkout.scanWith', { channel: channelLabel })}`
          }
        </span>
      </div>
    </div>
  );
}

/** 生成中:灰色半透明 + spinner */
function WarmingOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-white/85 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
        <Spinner className="h-8 w-8 text-leaf-600" />
        <div className="text-[11px] text-leaf-700/80">{label}</div>
      </div>
    </div>
  );
}

/** 扫码中:全尺寸蒙层 + 扫描线 + 中央文案 */
function ScanningOverlay({ channel, label }: { channel: PayChannel; label: string }) {
  return (
    <div
      className={cn(
        'rouyou-qr-scan absolute inset-0 overflow-hidden bg-ink-900/55 backdrop-blur-[1px]',
        channel === 'alipay' ? 'rouyou-qr-scan--alipay' : 'rouyou-qr-scan--wechat'
      )}
    >
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-2 text-white">
          <Spinner className="h-8 w-8 text-white/90" />
          <div className="px-2 text-center text-[11px] font-medium leading-tight">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('animate-spin', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}

function PaidOverlay() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-white/85 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
        <div className="rouyou-qr-check grid h-16 w-16 place-items-center rounded-full bg-leaf-500 shadow-lg">
          <svg
            viewBox="0 0 24 24"
            className="h-10 w-10 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="5 12.5 10.2 17.5 19 8.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ExpiredOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-white/85 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-1">
        <div className="text-3xl">⌛</div>
        <div className="text-xs text-leaf-700/70">{label}</div>
      </div>
    </div>
  );
}

/** 本地假二维码点阵(不可扫,只是占位) */
function MockQr({
  text,
  channel,
  status,
  scanning,
}: {
  text: string;
  channel: PayChannel;
  status: PayQrStatus;
  scanning: boolean;
}) {
  const { t } = useI18n();
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
    return h;
  };
  const seed = hash(text);
  const dots = Array.from({ length: 21 * 21 }).map((_, i) =>
    ((seed + i * 13) & 0b11) === 0 ? 1 : 0
  );
  const showScan = status === 'pending' && scanning;
  return (
    <div className="rounded-xl bg-white p-3 shadow">
      <div className="relative h-48 w-48 overflow-hidden rounded">
        <div
          className="grid h-full w-full gap-px"
          style={{ gridTemplateColumns: 'repeat(21, 1fr)' }}
        >
          {dots.map((d, i) => {
            const row = Math.floor(i / 21);
            const col = i % 21;
            const inCorner =
              (row < 7 && col < 7) ||
              (row < 7 && col >= 14) ||
              (row >= 14 && col < 7);
            const cornerEdge =
              (row === 0 || row === 6 || col === 0 || col === 6) && row < 7 && col < 7
                ? true
                : (row === 0 || row === 6 || col === 14 || col === 20) &&
                  row < 7 && col >= 14
                ? true
                : (row === 14 || row === 20 || col === 0 || col === 6) &&
                  row >= 14 && col < 7
                ? true
                : false;
            const cornerCenter =
              (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
              (row >= 2 && row <= 4 && col >= 16 && col <= 18) ||
              (row >= 16 && row <= 18 && col >= 2 && col <= 4);
            const filled = inCorner ? cornerEdge || cornerCenter : !!d;
            return (
              <span
                key={i}
                className={cn('block', filled ? 'bg-ink-900' : 'bg-white')}
              />
            );
          })}
        </div>
        {showScan && <ScanningOverlay channel={channel} label={t('checkout.scanning')} />}
        {status === 'paid' && <PaidOverlay />}
        {status === 'expired' && <ExpiredOverlay label={t('checkout.qrExpired')} />}
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-medium">
        <span className={channel === 'wechat' ? 'text-leaf-600' : 'text-blue-600'}>
          {channel === 'wechat' ? t('checkout.channelWechat') : t('checkout.channelAlipay')}
        </span>
        <span className="text-leaf-700/60">· {t('checkout.demoQr')}</span>
      </div>
    </div>
  );
}
