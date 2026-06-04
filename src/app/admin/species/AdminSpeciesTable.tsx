'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/client-api';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { SpeciesEditForm, type GenusOption, type SpeciesData } from './SpeciesEditForm';

type SpeciesRow = SpeciesData & {
  genus: {
    id: string;
    name: string;
    slug: string;
    board: { slug: string; name: string } | null;
  };
  _count: { posts: number };
};

export function AdminSpeciesTable({
  items,
  genera,
}: {
  items: SpeciesRow[];
  genera: GenusOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<SpeciesRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SpeciesRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const done = () => {
    close();
    router.refresh();
  };

  const remove = async () => {
    const species = pendingDelete;
    if (!species) return;
    if (deletingId) return;
    setDeletingId(species.id);
    try {
      await api.delete(`/api/admin/species/${species.id}`);
      setPendingDelete(null);
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="w-16 px-3 py-2 text-left">图</th>
              <th className="px-3 py-2 text-left">中文</th>
              <th className="px-3 py-2 text-left">拉丁</th>
              <th className="px-3 py-2 text-left">属 / 科</th>
              <th className="px-3 py-2 text-right">难度</th>
              <th className="px-3 py-2 text-left">光 / 水 / 冬</th>
              <th className="px-3 py-2 text-right">帖子</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                <td className="px-3 py-2">
                  <div className="relative h-10 w-10 overflow-hidden rounded bg-ink-50">
                    <Image src={s.cover} alt="" fill className="object-cover" unoptimized />
                  </div>
                </td>
                <td className="px-3 py-2">
                  {s.genus.board ? (
                    <Link
                      href={`/plants/${s.genus.board.slug}/${s.genus.slug}/${s.slug}`}
                      target="_blank"
                      className="font-medium text-ink-800 hover:underline"
                    >
                      {s.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink-800">{s.name}</span>
                  )}
                </td>
                <td className="px-3 py-2 italic text-ink-600">{s.latinName}</td>
                <td className="px-3 py-2 text-[11px]">
                  <div>{s.genus.name}</div>
                  <div className="text-ink-500">{s.genus.board?.name ?? '未关联板块'}</div>
                </td>
                <td className="px-3 py-2 text-right text-amber-600">
                  {'★'.repeat(s.difficulty)}
                </td>
                <td className="px-3 py-2 text-[10px] text-ink-600">
                  ☀️ {s.light} · 💧 {s.watering} · ❄️ {s.hardiness}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-600">
                  {s._count.posts}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(s)}
                      className="rounded border border-ink-200 px-2 py-1 text-[10px] hover:bg-ink-50"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(s)}
                      disabled={deletingId === s.id}
                      className="rounded border border-rose-200 px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === s.id ? '删除中' : '删除'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-ink-500">
                  没有数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="fixed bottom-6 right-6 rounded-lg bg-ink-800 px-4 py-2 text-xs font-medium text-white shadow-lg hover:bg-ink-700"
      >
        + 新建品种
      </button>

      {(editing || creating) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/45 px-4 py-8">
          <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">
                  {creating ? '新建品种' : `编辑品种：${editing!.name}`}
                </h2>
                <p className="mt-1 text-xs text-ink-500">保存后留在品种数据列表页</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs hover:bg-ink-50"
              >
                关闭
              </button>
            </div>
            <div className="max-h-[calc(100vh-140px)] overflow-y-auto p-5">
              <SpeciesEditForm
                species={editing}
                genera={genera}
                onDone={done}
                onCancel={close}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deletingId) setPendingDelete(null);
        }}
        onConfirm={() => void remove()}
        title="删除品种"
        message={pendingDelete ? `确认删除「${pendingDelete.name}」？\n此操作不可撤销。` : ''}
        confirmText={deletingId ? '删除中...' : '删除'}
        cancelText="取消"
        danger
      />
    </>
  );
}
