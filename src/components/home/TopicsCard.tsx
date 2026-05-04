import Link from 'next/link';

const topics = [
  { tag: '度夏', count: 1243, hot: true },
  { tag: '配土', count: 842 },
  { tag: '玉露', count: 612 },
  { tag: '叶插', count: 431, hot: true },
  { tag: '生石花', count: 378 },
  { tag: '仙人球', count: 329 },
  { tag: '胧月', count: 287 },
  { tag: '黑腐', count: 184 },
];

export function TopicsCard() {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-ink-800">🔥 热门话题</div>
        <Link href="/board" className="text-[11px] text-leaf-700 hover:underline">
          更多 →
        </Link>
      </div>
      <ul className="space-y-1.5">
        {topics.map((t, i) => (
          <li key={t.tag}>
            <Link
              href={`/board`}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-leaf-50"
            >
              <span className="flex items-center gap-2">
                <span
                  className={
                    i < 3
                      ? 'inline-grid h-5 w-5 place-items-center rounded-md bg-leaf-500 text-[11px] font-bold text-white'
                      : 'inline-grid h-5 w-5 place-items-center rounded-md bg-leaf-50 text-[11px] font-bold text-leaf-600'
                  }
                >
                  {i + 1}
                </span>
                <span>#{t.tag}</span>
                {t.hot && (
                  <span className="rounded bg-rose-50 px-1 text-[10px] text-rose-600">HOT</span>
                )}
              </span>
              <span className="text-[11px] text-leaf-600/70">{t.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
