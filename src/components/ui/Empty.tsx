export function Empty({
  icon = '🌵',
  title = '这里什么都没有',
  desc,
}: {
  icon?: string;
  title?: string;
  desc?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-leaf-200 bg-white/50 py-14 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <div className="text-sm font-medium text-ink-800">{title}</div>
      {desc && <div className="mt-1 text-xs text-leaf-700/70">{desc}</div>}
    </div>
  );
}
