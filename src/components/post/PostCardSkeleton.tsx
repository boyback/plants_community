/**
 * PostCard 骨架屏占位
 * 高度随机化,模拟瀑布流真实卡片不同高度,避免加载时视觉抖动太明显
 */
export function PostCardSkeleton({ variant }: { variant?: number }) {
  // 用 variant 决定图片高度;不传时按一组循环高度避免全相同
  const idx =
    typeof variant === 'number'
      ? variant
      : Math.floor(Math.random() * HEIGHTS.length);
  const h = HEIGHTS[idx % HEIGHTS.length];
  return (
    <div className="card animate-pulse overflow-hidden">
      <div className={`w-full bg-leaf-100/70 ${h}`} />
      <div className="space-y-2 p-3">
        {/* 标题占位 */}
        <div className="h-3 w-4/5 rounded bg-leaf-100/70" />
        <div className="h-3 w-3/5 rounded bg-leaf-100/60" />
        {/* meta 占位 */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-leaf-100/70" />
            <div className="h-2.5 w-16 rounded bg-leaf-100/60" />
          </div>
          <div className="h-2.5 w-12 rounded bg-leaf-100/50" />
        </div>
      </div>
    </div>
  );
}

const HEIGHTS = ['h-44', 'h-52', 'h-60', 'h-48', 'h-56', 'h-64', 'h-40', 'h-72'];
