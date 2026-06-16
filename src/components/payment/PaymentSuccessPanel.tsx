'use client';

import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import styles from './PaymentSuccessPanel.module.scss';

export function PaymentSuccessPanel({
  title = '支付成功',
  description = '当前页面已确认付款,订单状态已更新。',
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title?: string;
  description?: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <Card padding="loose" className={styles.panel}>
      <div className={styles.iconWrap} aria-hidden="true">
        <Icon name="check" size={28} strokeWidth={2.4} />
      </div>
      <div className={styles.title}>{title}</div>
      <div className={styles.description}>{description}</div>
      <div className={styles.actions}>
        <ButtonLink href={primaryHref} size="lg">
          {primaryLabel}
        </ButtonLink>
        {secondaryHref && secondaryLabel ? (
          <ButtonLink href={secondaryHref} variant="outline" size="lg">
            {secondaryLabel}
          </ButtonLink>
        ) : null}
      </div>
    </Card>
  );
}
