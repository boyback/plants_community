'use client';

import { useState } from 'react';

export function AlipayPagePayButton({
  pagePayUrl,
}: {
  pagePayUrl: string;
}) {
  const [submitted, setSubmitted] = useState(false);

  const handleClick = () => {
    setSubmitted(true);
    window.location.assign(pagePayUrl);
  };

  return (
    <div
      style={{
        minHeight: 220,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        color: 'rgb(var(--ink-600))',
        fontSize: 14,
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        style={{
          minWidth: 180,
          height: 44,
          border: 0,
          borderRadius: 8,
          background: '#1677ff',
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        去支付宝支付
      </button>
      <div>
        {submitted ? '正在跳转到支付宝收银台...' : '点击按钮后将跳转到支付宝收银台'}
      </div>
    </div>
  );
}
