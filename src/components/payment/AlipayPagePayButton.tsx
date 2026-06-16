'use client';

import { Button } from '@/components/ui/Button';
import styles from './AlipayPagePayButton.module.scss';

export function AlipayPagePayButton({
  pagePayUrl,
}: {
  pagePayUrl?: string;
}) {
  const handleClick = () => {
    if (!pagePayUrl) return;
    window.open(pagePayUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={styles.wrap}>
      <Button type="button" size="lg" onClick={handleClick} disabled={!pagePayUrl}>
        去支付
      </Button>
    </div>
  );
}
