'use client';

import { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nContext';
import styles from './PaymentQr.module.scss';
import { cx } from '@/lib/style-utils';



export type PayChannel = 'wechat' | 'alipay' | 'escrow';
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
 */
export function PaymentQr({
  text,
  channel,
  status = 'pending',
  scanning = false






}: {text: string;channel: PayChannel;status?: PayQrStatus; /** 是否已被扫码(由后端 alipay.trade.query 推断) */scanning?: boolean;}) {
  const { t } = useI18n();
  const [dataUrl, setDataUrl] = useState<string>('');
  /** 二维码刚生成时有一段预热期(支付宝侧还在落单),期间蒙层"生成中" */
  const [warming, setWarming] = useState<boolean>(true);
  const warmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setWarming(true);
    QRCodeLib.toDataURL(text, {
      width: 256,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#14281f', light: '#ffffff' }
    }).
    then((url) => {
      if (!cancelled) setDataUrl(url);
    }).
    catch((err) => {
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
  }, [text]);

  const channelColor = channel === 'wechat' ? styles.r_b17d6a13 : styles.r_4c3a8aac;
  const channelLabel = channel === 'wechat' ?
  t('checkout.channelWechat') :
  t('checkout.channelAlipay');

  // 仅「已扫码、等待支付」才显示扫描中蒙层
  const showScan = status === 'pending' && scanning && dataUrl !== '';
  const showPaid = status === 'paid';
  const showExpired = status === 'expired';
  const showWarming = warming && dataUrl !== '' && !showPaid && !showExpired && !showScan;

  return (
    <div className={cx(styles.r_a217b4ea, styles.r_5e10cdb8, styles.r_eb6e8b88, styles.r_ed9d3d83)}>
      <div className={cx(styles.r_d89972fe, styles.r_3c8ea328, styles.r_74b2435a, styles.r_2cd02d11, styles.r_07389a77)}>
        {dataUrl ?
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="pay QR" className={cx(styles.r_3c8ea328, styles.r_74b2435a)} /> :

        <div className={cx(styles.r_f3c543ad, styles.r_3c8ea328, styles.r_74b2435a, styles.r_67d66567, styles.r_359090c2, styles.r_6c4cc49e)}>
            {t('checkout.generatingQr', { channel: channelLabel })}
          </div>
        }

        {showWarming && <WarmingOverlay label={t('checkout.warming')} />}
        {showScan && <ScanningOverlay channel={channel} label={t('checkout.scanning')} />}
        {showPaid && <PaidOverlay />}
        {showExpired && <ExpiredOverlay label={t('checkout.qrExpired')} />}
      </div>
      <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_58284b4e, styles.r_1dc571a3, styles.r_2689f395)}>
        <span className={channelColor}>{channelLabel}</span>
        <span className={styles.r_6c4cc49e}>·
          {showWarming ?
          ` ${t('checkout.warming')}` :
          showScan ?
          ` ${t('checkout.scanning')}` :
          ` ${t('checkout.scanWith', { channel: channelLabel })}`
          }
        </span>
      </div>
    </div>);

}

/** 生成中:灰色半透明 + spinner */
function WarmingOverlay({ label }: {label: string;}) {
  return (
    <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_f3c543ad, styles.r_67d66567, styles.r_75fe048d, styles.r_1ca6dd1e)}>
      <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_77a2a20e)}>
        <Spinner className={cx(styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_b17d6a13)} />
        <div className={cx(styles.r_d058ca6d, styles.r_21d33c50)}>{label}</div>
      </div>
    </div>);

}

/** 扫码中:全尺寸蒙层 + 扫描线 + 中央文案 */
function ScanningOverlay({ channel, label }: {channel: PayChannel;label: string;}) {
  return (
    <div
      className={cn(cx("rouyou-qr-scan", styles.r_da4dbfbc, styles.r_7b7df044, styles.r_2cd02d11, styles.r_084ed6ec, styles.r_d88c782b),

      channel === 'alipay' ? "rouyou-qr-scan--alipay" : "rouyou-qr-scan--wechat"
      )}>

      <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_f3c543ad, styles.r_67d66567)}>
        <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_72a4c7cd)}>
          <Spinner className={cx(styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_40ba14f7)} />
          <div className={cx(styles.r_d5eab218, styles.r_ca6bf630, styles.r_d058ca6d, styles.r_2689f395, styles.r_e9fadafb)}>
            {label}
          </div>
        </div>
      </div>
    </div>);

}

function Spinner({ className }: {className?: string;}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(styles.r_afbdd13a, className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round">

      <circle cx="12" cy="12" r="9" strokeOpacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>);

}

function PaidOverlay() {
  return (
    <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_f3c543ad, styles.r_67d66567, styles.r_75fe048d, styles.r_1ca6dd1e)}>
      <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_77a2a20e)}>
        <div className={cx("rouyou-qr-check", styles.r_f3c543ad, styles.r_acaee621, styles.r_baceed34, styles.r_67d66567, styles.r_ac204c10, styles.r_45499621, styles.r_06bbb431)}>
          <svg
            viewBox="0 0 24 24"
            className={cx(styles.r_426b8b75, styles.r_d854e569, styles.r_72a4c7cd)}
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round">

            <polyline points="5 12.5 10.2 17.5 19 8.5" />
          </svg>
        </div>
      </div>
    </div>);

}

function ExpiredOverlay({ label }: {label: string;}) {
  return (
    <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_f3c543ad, styles.r_67d66567, styles.r_75fe048d, styles.r_1ca6dd1e)}>
      <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_44ee8ba0)}>
        <div className={styles.r_751fb0d1}>⌛</div>
        <div className={cx(styles.r_359090c2, styles.r_69335b95)}>{label}</div>
      </div>
    </div>);

}

