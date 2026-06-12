'use client';

import { HoverCard as RadixHoverCard } from "radix-ui";
import { cn } from '@/lib/utils';
import styles from './HoverCard.module.scss';
import { cx } from '@/lib/style-utils';



type HoverCardProps = {
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
};

export function HoverCard({ children, openDelay = 120, closeDelay = 120 }: HoverCardProps) {
  return (
    <RadixHoverCard.Root openDelay={openDelay} closeDelay={closeDelay}>
      {children}
    </RadixHoverCard.Root>);

}

export function HoverCardTrigger({ children }: {children: React.ReactNode;}) {
  return (
    <RadixHoverCard.Trigger asChild>
      {children}
    </RadixHoverCard.Trigger>);

}

export function HoverCardContent({
  children,
  className,
  align = 'end',
  side = 'bottom',
  sideOffset = 8,
  ...props






}: React.HTMLAttributes<HTMLDivElement> & {children: React.ReactNode;className?: string;align?: 'start' | 'center' | 'end';side?: 'top' | 'right' | 'bottom' | 'left';sideOffset?: number;}) {
  return (
    <RadixHoverCard.Portal>
      <RadixHoverCard.Content
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={8}
        {...props}
        className={cn(cx(styles.r_181b2866, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_23d3773a, styles.r_5e10cdb8, styles.r_06bbb431, styles.r_df37b1fd, styles.r_2089b774, styles.r_a9faa555, styles.r_0bc7c6cf, styles.r_33b203f5, styles.r_26698b65, styles.r_3424811d),

        className
        )}>

        {children}
        <RadixHoverCard.Arrow className={cx(styles.r_34208978, styles.r_55221f27)} width={16} height={8} />
      </RadixHoverCard.Content>
    </RadixHoverCard.Portal>);

}