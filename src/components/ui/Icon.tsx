import { cn } from '@/lib/utils';

type IconName =
  | 'home'
  | 'board'
  | 'plants'
  | 'message'
  | 'bell'
  | 'search'
  | 'plus'
  | 'link'
  | 'heart'
  | 'comment'
  | 'share'
  | 'eye'
  | 'menu'
  | 'close'
  | 'user'
  | 'logout'
  | 'check'
  | 'arrow-right'
  | 'edit'
  | 'trash'
  | 'image'
  | 'camera'
  | 'send'
  | 'video'
  | 'vote'
  | 'event'
  | 'settings'
  | 'star'
  | 'info'
  | 'package'
  | 'mail'
  | 'crown'
  | 'diamond'
  | 'lock'
  | 'pin'
  | 'palette'
  | 'globe'
  | 'shop'
  | 'hammer'
  | 'trophy'
  | 'check-circle'
  | 'x-circle';

const paths: Record<IconName, string> = {
  home: 'M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3v-9.5Z',
  board: 'M4 5h7v7H4V5Zm9 0h7v4h-7V5ZM4 14h7v5H4v-5Zm9-3h7v8h-7v-8Z',
  plants: 'M12 22V10M6 8a6 6 0 0 0 6 6 6 6 0 0 0-6-6Zm12 0a6 6 0 0 1-6 6 6 6 0 0 1 6-6Zm-6-6a4 4 0 0 0-4 4 4 4 0 0 0 4-4Zm0 0a4 4 0 0 1 4 4 4 4 0 0 1-4-4Z',
  message: 'M21 12a8 8 0 1 1-3.3-6.5L21 4l-1 4.5A8 8 0 0 1 21 12Z',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Zm4 13a2 2 0 0 0 4 0',
  search: 'm21 21-4.35-4.35M17 10A7 7 0 1 1 3 10a7 7 0 0 1 14 0Z',
  plus: 'M12 5v14M5 12h14',
  link: 'M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1.15-1.15',
  heart:
    'M12 21s-7-4.35-7-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 19 11c0 5.65-7 10-7 10Z',
  comment: 'M21 12a8 8 0 1 1-3.3-6.5L21 4l-1 4.5A8 8 0 0 1 21 12Z',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M18 6 6 18M6 6l12 12',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  check: 'M20 6 9 17l-5-5',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14',
  image: 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Zm-8-6 3-3 5 6M3 19l6-6 4 4',
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2v11ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z',
  video: 'm22 8-6 4 6 4V8ZM14 6H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1Z',
  vote: 'M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  event: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-3a7 7 0 0 0-.1-1.1l2-1.6-2-3.4-2.4.9a7 7 0 0 0-1.9-1.1L14 3h-4l-.6 2.7a7 7 0 0 0-1.9 1.1l-2.4-.9-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .7.1 1.1l-2 1.6 2 3.4 2.4-.9c.6.4 1.2.8 1.9 1.1l.6 2.7h4l.6-2.7c.7-.3 1.3-.7 1.9-1.1l2.4.9 2-3.4-2-1.6c.1-.4.1-.7.1-1.1Z',
  star: 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 18l-6.2 3.1L7 14.2 2 9.3l6.9-1L12 2Z',
  info: 'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20ZM12 8h.01M11 12h1v5h1',
  // 用户菜单 / 设置常用
  package: 'M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.27 6.96 12 12.01l8.73-5.05M12 22.08V12',
  mail: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Zm0 0 8 8 8-8',
  crown: 'm5 16 3-8 4 5 4-5 3 8M5 16h14M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3',
  diamond: 'M6 3h12l4 6-10 12L2 9l4-6Zm0 0 6 6 6-6',
  lock: 'M5 11h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Zm2 0V7a5 5 0 0 1 10 0v4',
  pin: 'M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3.76ZM12 2v1',
  palette: 'M12 22a10 10 0 1 1 0-20c5.5 0 10 4 10 9 0 4-3 5-5 5h-2a2 2 0 0 0-1 4 1.5 1.5 0 0 1-2 2Z',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10Z',
  shop: 'M3 9 4 5h16l1 4M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M9 14h6',
  hammer: 'm15 12-8 8a2 2 0 0 1-3-3l8-8M14.5 5.5l4 4L21 7l-4-4-2.5 2.5Zm0 0L9 11l4 4 5.5-5.5',
  trophy: 'M8 21h8m-4-4V9m0 0a4 4 0 0 0 4-4V3H8v2a4 4 0 0 0 4 4zM6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 0h1.5a2.5 2.5 0 0 1 0 5H18',
  'check-circle': 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zm-7-5l-5 5-3-3-2 2 5 5 7-7-2-2z',
  'x-circle': 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zm-8-4l-4 4 4 4-2 2-4-4-4 4-2-2 4-4-4-4 2-2 4 4 4-4 2 2z',
};

export function Icon({
  name,
  className,
  size = 18,
  strokeWidth = 1.8,
  fill = 'none',
}: {
  name: IconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
  fill?: 'none' | 'currentColor';
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('inline-block shrink-0', className)}
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}

export type { IconName };
