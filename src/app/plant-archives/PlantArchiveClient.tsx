'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form } from 'radix-ui';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client-api';
import type { JournalStage } from '@/lib/types';
import { cn } from '@/lib/utils';

export type PlantArchiveStatus = 'healthy' | 'watching' | 'needs_attention' | 'dormant' | 'ended';

export type PlantArchiveItem = {
  id: string;
  code: string;
  speciesId: string;
  nickname: string;
  speciesName: string;
  latinName: string;
  familyName: string;
  genusName: string;
  cover: string | null;
  status: PlantArchiveStatus;
  statusLabel: string;
  currentStage: JournalStage;
  currentStageLabel: string;
  durationLabel: string;
  lastUpdateLabel: string;
  latestStageLabel: string;
  latestNote: string;
  journalCount: number;
  journalPostId: string | null;
  recordCount: number;
  imageCount: number;
  updatedAt: string;
  acquiredAt: string;
  note: string;
};

export type PlantArchiveStats = {
  total: number;
  healthy: number;
  watching: number;
  needs: number;
  dormant: number;
};

type SpeciesOption = {
  id: string;
  name: string;
  latinName: string;
  familySlug: string;
  genusSlug: string;
};

export function PlantArchiveClient({
  items,
  stats,
}: {
  items: PlantArchiveItem[];
  stats: PlantArchiveStats;
}) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [sort, setSort] = useState('updated');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [editingItem, setEditingItem] = useState<PlantArchiveItem | null>(null);

  const familyOptions = useMemo(() => {
    const names = Array.from(new Set(items.map((item) => item.familyName).filter(Boolean))).sort();
    return [
      { label: '全部分类', value: 'all' },
      ...names.map((name) => ({ label: name, value: name })),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const next = items.filter((item) => {
      const hitKeyword = !keyword || [item.nickname, item.speciesName, item.latinName, item.code, item.genusName]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
      const hitFamily = family === 'all' || item.familyName === family;
      return hitKeyword && hitFamily;
    });

    return [...next].sort((a, b) => {
      if (sort === 'acquired') return new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime();
      if (sort === 'records') return b.recordCount - a.recordCount;
      if (sort === 'photos') return b.imageCount - a.imageCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [family, items, query, sort]);

  return (
    <div className="space-y-5 pb-20">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-950">植物档案</h1>
          <p className="mt-1 text-sm text-ink-500">管理你实际养护的每一株植物，成长记录会自动汇入对应时间线</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 items-center gap-2 rounded-lg border border-leaf-100 bg-white px-3 shadow-sm">
            <span className="text-xs font-medium text-ink-500">植株总数</span>
            <span className="text-lg font-bold text-ink-950">{stats.total}</span>
          </div>
          <Link
            href="/editor?type=journal"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-leaf-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-leaf-700"
          >
            <Icon name="plus" size={15} />
            添加植株
          </Link>
        </div>
      </header>

      <section className="rounded-lg border border-leaf-100 bg-white shadow-sm">
        <div className="grid gap-3 p-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto]">
          <label className="relative block">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-10 w-full rounded-lg border border-leaf-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-leaf-400 focus:ring-2 focus:ring-leaf-100"
              placeholder="搜索植株昵称、档案编号或品种"
            />
          </label>
          <Select value={family} onValueChange={setFamily} options={familyOptions} />
          <Select
            value={sort}
            onValueChange={setSort}
            options={[
              { label: '最近更新', value: 'updated' },
              { label: '入手时间', value: 'acquired' },
              { label: '记录最多', value: 'records' },
              { label: '照片最多', value: 'photos' },
            ]}
          />
          <div className="grid grid-cols-2 rounded-lg border border-leaf-200 bg-leaf-50 p-1">
            <ViewButton active={view === 'grid'} icon="board" label="网格视图" onClick={() => setView('grid')} />
            <ViewButton active={view === 'list'} icon="menu" label="列表视图" onClick={() => setView('list')} />
          </div>
        </div>
      </section>

      {filteredItems.length === 0 ? (
        <section className="rounded-lg border border-leaf-100 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-leaf-50 text-leaf-700">
            <Icon name="plants" size={26} />
          </div>
          <h2 className="mt-4 text-base font-bold text-ink-900">还没有匹配的植物档案</h2>
          <p className="mt-2 text-sm text-ink-500">发布成长记录帖后，系统会自动生成对应植物档案。</p>
          <Link
            href="/editor?type=journal"
            className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-lg bg-leaf-600 px-4 text-sm font-semibold text-white hover:bg-leaf-700"
          >
            <Icon name="plus" size={15} />
            添加植株
          </Link>
        </section>
      ) : view === 'grid' ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredItems.map((item) => (
            <PlantCard key={item.id} item={item} onEdit={setEditingItem} />
          ))}
        </section>
      ) : (
        <section className="space-y-3">
          {filteredItems.map((item) => (
            <PlantListItem key={item.id} item={item} onEdit={setEditingItem} />
          ))}
        </section>
      )}

      <PlantFormDialog plant={editingItem} open={Boolean(editingItem)} onClose={() => setEditingItem(null)} />
    </div>
  );
}

function PlantFormDialog({
  open,
  onClose,
  plant,
}: {
  open: boolean;
  onClose: () => void;
  plant?: PlantArchiveItem | null;
}) {
  const router = useRouter();
  const [species, setSpecies] = useState<SpeciesOption[]>([]);
  const [speciesId, setSpeciesId] = useState('');
  const [nickname, setNickname] = useState('');
  const [acquiredAt, setAcquiredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const selectedSpecies = species.find((item) => item.id === speciesId) ?? null;
  const editing = Boolean(plant);

  useEffect(() => {
    if (!open) return;
    setSpeciesId(plant?.speciesId ?? '');
    setNickname(plant?.nickname ?? '');
    setAcquiredAt(plant?.acquiredAt ? plant.acquiredAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setNote(plant?.note ?? '');
  }, [open, plant]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: '500' });
    fetch(`/api/species?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const next = [...data] as SpeciesOption[];
        if (plant && !next.some((item) => item.id === plant.speciesId)) {
          next.unshift({
            id: plant.speciesId,
            name: plant.speciesName,
            latinName: plant.latinName,
            familySlug: '',
            genusSlug: '',
          });
        }
        setSpecies(next);
      })
      .catch(() => null);
    return () => {
      controller.abort();
    };
  }, [open, plant]);

  const nicknamePlaceholder = selectedSpecies
    ? `${selectedSpecies.name} #xx号`
    : '品种名 #xx号';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!speciesId) {
      toast.error('请选择品种');
      return;
    }
    if (!nickname.trim()) {
      toast.error('请填写植株昵称');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        speciesId,
        nickname: nickname.trim(),
        acquiredAt,
        ...(editing && {
          currentStage: plant!.currentStage,
          currentStageLabel: plant!.currentStage === 'other' ? plant!.currentStageLabel || undefined : undefined,
        }),
        note,
      };
      const saved = editing
        ? await api.patch<{ id: string }>(`/api/my-plants/${plant!.id}`, payload)
        : await api.post<{ id: string }>('/api/my-plants', payload);
      toast.success(editing ? '植物档案已更新' : '植物档案已创建');
      onClose();
      router.refresh();
      if (!editing) router.push('/plant-archives');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : editing ? '保存失败，请稍后重试' : '创建失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={editing ? '编辑' : '新增'} maxWidth="lg">
      <Form.Root onSubmit={submit} className="space-y-5">
        <div className="rounded-lg border border-leaf-100 bg-leaf-50/50 p-3 text-xs leading-5 text-ink-600">
          植物档案由成长记录帖自动创建和维护，这里只调整已有档案的基础信息。
        </div>

        <div className="space-y-4">
          <Form.Field name="species">
            <FormRow label="选择品种" required>
              <Form.Control asChild>
                <Select
                  required
                  searchable
                  value={speciesId}
                  onValueChange={setSpeciesId}
                  placeholder={species.length > 0 ? '选择品种' : '正在加载品种...'}
                  searchPlaceholder="搜索品种中文名、拉丁名"
                  options={species.map((item) => ({
                    value: item.id,
                    label: `${item.name} · ${item.latinName}`,
                  }))}
                />
              </Form.Control>
              <Form.Message match="valueMissing" className="mt-1 block text-xs text-rose-500">请选择品种</Form.Message>
            </FormRow>
          </Form.Field>

          <Form.Field name="nickname">
            <FormRow label="植株昵称" required>
              <Form.Control asChild>
                <input
                  required
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  className="input h-10"
                  placeholder={nicknamePlaceholder}
                  maxLength={50}
                />
              </Form.Control>
              <Form.Message match="valueMissing" className="mt-1 block text-xs text-rose-500">请填写植株昵称</Form.Message>
            </FormRow>
          </Form.Field>

          <Form.Field name="acquiredAt">
            <FormRow label="入手时间" required>
              <Form.Control asChild>
                <input
                  required
                  type="date"
                  value={acquiredAt}
                  onChange={(event) => setAcquiredAt(event.target.value)}
                  className="input h-10"
                />
              </Form.Control>
              <Form.Message match="valueMissing" className="mt-1 block text-xs text-rose-500">请选择入手时间</Form.Message>
            </FormRow>
          </Form.Field>

          <FormRow label="备注">
            <div>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="来源、盆号、配土等信息，可选"
                maxLength={1000}
                showCount
                className="min-h-[112px]"
              />
            </div>
          </FormRow>
        </div>

        <div className="flex justify-end gap-2 border-t border-leaf-100 pt-4">
          <button type="button" onClick={onClose} className="btn-outline h-10 !px-4 text-sm">取消</button>
          <Form.Submit disabled={submitting} className="btn-primary h-10 !px-4 text-sm">
            {submitting ? '保存中...' : editing ? '保存' : '创建'}
          </Form.Submit>
        </div>
      </Form.Root>
    </Dialog>
  );
}

function ViewButton({ active, icon, label, onClick }: { active: boolean; icon: 'board' | 'menu'; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('grid h-8 w-9 place-items-center rounded-md transition', active ? 'bg-white text-leaf-700 shadow-sm' : 'text-ink-500')}
      aria-label={label}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

function FormRow({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-start">
      <div className="pt-2 text-xs font-semibold text-ink-700">
        {required && <span className="text-rose-500">*</span>} {label}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function PlantCard({ item, onEdit }: { item: PlantArchiveItem; onEdit: (item: PlantArchiveItem) => void }) {
  const router = useRouter();
  const href = plantPrimaryHref(item);

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push(href);
        }
      }}
      className="cursor-pointer overflow-hidden rounded-lg border border-leaf-100 bg-white shadow-sm transition hover:border-leaf-200 focus:outline-none focus:ring-2 focus:ring-leaf-200"
    >
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] bg-leaf-50">
          {item.cover ? (
            <Image src={item.cover} alt={item.nickname} fill unoptimized className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-leaf-700">
              <Icon name="plants" size={38} />
            </div>
          )}
          <span className={cn('absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold', statusClass(item.status))}>
            {item.statusLabel}
          </span>
          <span className="absolute bottom-3 right-3 rounded-lg bg-ink-900/70 px-2 py-1 text-[11px] font-semibold text-white">
            {item.code}
          </span>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={href} className="line-clamp-1 text-base font-bold text-ink-950 hover:text-leaf-700">
              {item.nickname}
            </Link>
            <div className="mt-1 line-clamp-1 text-xs text-ink-500">{item.speciesName} · <span className="italic">{item.latinName}</span></div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(item);
              }}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-leaf-50 hover:text-leaf-700"
              aria-label="编辑植株"
            >
              <Icon name="edit" size={15} />
            </button>
            <Link href={href} className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-leaf-50 hover:text-leaf-700" aria-label={item.journalPostId ? '查看成长帖' : '发布成长记录'}>
              <Icon name="arrow-right" size={15} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-leaf-50/70 p-2 text-center text-[11px]">
          <MiniMeta label="养护" value={item.durationLabel} />
          <MiniMeta label="记录" value={`${item.recordCount} 条`} />
          <MiniMeta label="照片" value={`${item.imageCount} 张`} />
        </div>

        <p className="line-clamp-2 min-h-[40px] text-sm leading-5 text-ink-600">
          {item.latestNote || `${item.latestStageLabel} · ${item.lastUpdateLabel}`}
        </p>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
          <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">{item.familyName || '未分类'} / {item.genusName || '未关联属'}</span>
          <span className="rounded-full bg-leaf-50 px-2 py-1 text-leaf-700">成长帖 {item.journalCount}</span>
        </div>
      </div>
    </article>
  );
}

function PlantListItem({ item, onEdit }: { item: PlantArchiveItem; onEdit: (item: PlantArchiveItem) => void }) {
  const router = useRouter();
  const href = plantPrimaryHref(item);

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push(href);
        }
      }}
      className="grid cursor-pointer gap-4 rounded-lg border border-leaf-100 bg-white p-3 shadow-sm transition hover:border-leaf-200 focus:outline-none focus:ring-2 focus:ring-leaf-200 sm:grid-cols-[128px,minmax(0,1fr)_240px]"
    >
      <Link href={href} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-leaf-50 sm:aspect-square">
        {item.cover ? (
          <Image src={item.cover} alt={item.nickname} fill unoptimized className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-leaf-700">
            <Icon name="plants" size={30} />
          </div>
        )}
      </Link>
      <div className="min-w-0 py-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', statusClass(item.status))}>{item.statusLabel}</span>
          <span className="text-xs text-ink-400">{item.code}</span>
          <span className="text-xs text-ink-400">{item.lastUpdateLabel}</span>
        </div>
        <Link href={href} className="mt-2 block truncate text-lg font-bold text-ink-950 hover:text-leaf-700">
          {item.nickname}
        </Link>
        <div className="mt-1 truncate text-xs text-ink-500">{item.speciesName} · <span className="italic">{item.latinName}</span></div>
        <p className="mt-3 line-clamp-2 text-sm leading-5 text-ink-600">{item.latestNote || '暂无成长记录，发布记录后会自动汇入时间线。'}</p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(item);
          }}
          className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-leaf-100 bg-white px-3 text-xs font-semibold text-leaf-700 hover:bg-leaf-50"
        >
          <Icon name="edit" size={14} />
          编辑植株
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-leaf-50 pt-3 text-center text-[11px] sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
        <MiniMeta label="养护" value={item.durationLabel} />
        <MiniMeta label="记录" value={`${item.recordCount} 条`} />
        <MiniMeta label="阶段" value={item.latestStageLabel} />
      </div>
    </article>
  );
}

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-ink-400">{label}</div>
      <div className="mt-1 truncate font-semibold text-ink-800">{value}</div>
    </div>
  );
}

function plantPrimaryHref(item: PlantArchiveItem) {
  return item.journalPostId ? `/post/${item.journalPostId}` : '/editor?type=journal';
}

export function statusLabel(status: PlantArchiveStatus) {
  switch (status) {
    case 'healthy':
      return '健康';
    case 'watching':
      return '关注中';
    case 'needs_attention':
      return '需要关注';
    case 'dormant':
      return '休眠中';
    case 'ended':
      return '已结束';
  }
}

function statusClass(status: PlantArchiveStatus) {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-50 text-emerald-700';
    case 'watching':
      return 'bg-sky-50 text-sky-700';
    case 'needs_attention':
      return 'bg-rose-50 text-rose-700';
    case 'dormant':
      return 'bg-amber-50 text-amber-700';
    case 'ended':
      return 'bg-ink-100 text-ink-600';
  }
}
