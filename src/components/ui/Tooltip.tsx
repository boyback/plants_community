'use client';

import { isValidElement } from 'react';
import { Tooltip as RadixTooltip } from "radix-ui";
import { cn } from '@/lib/utils';
import styles from './Tooltip.module.scss';
import { cx } from '@/lib/style-utils';



interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  if (!content) return <>{children}</>;

  const trigger = isValidElement(children) ? children : <span className={styles.r_bb0c4bfc}>{children}</span>;

  return (
    <RadixTooltip.Provider delayDuration={180} skipDelayDuration={100}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          {trigger}
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side="top"
            align="center"
            sideOffset={8}
            collisionPadding={8}
            className={cn(cx(styles.r_1faa3b06, styles.r_9945b3fd, styles.r_07389a77, styles.r_01d0b06c, styles.r_d5eab218, styles.r_660d2eff, styles.r_359090c2, styles.r_72a4c7cd, styles.r_06bbb431, styles.r_df37b1fd, styles.r_2089b774, styles.r_2203ce39, styles.r_0bc7c6cf, styles.r_8c31578a, styles.r_26698b65, styles.r_28721945),

            className
            )}
            style={{ width: "max-content", whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>

            {content}
            <RadixTooltip.Arrow className={styles.r_135ae073} width={8} height={4} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>);

}