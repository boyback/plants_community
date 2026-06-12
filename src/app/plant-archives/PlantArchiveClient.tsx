'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form } from "radix-ui";
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';
import { api, ApiError } from "@/lib/client-api";
import type { JournalStage } from '@/lib/types';
import { cn } from '@/lib/utils';
import styles from './PlantArchiveClient.module.scss';
import { cx } from '@/lib/style-utils';



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
  stats



}: {items: PlantArchiveItem[];stats: PlantArchiveStats;}) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [sort, setSort] = useState('updated');
  const [view, setView] = useState<"grid" | 'list'>("grid");
  const [editingItem, setEditingItem] = useState<PlantArchiveItem | null>(null);

  const familyOptions = useMemo(() => {
    const names = Array.from(new Set(items.map((item) => item.familyName).filter(Boolean))).sort();
    return [
    { label: '全部分类', value: 'all' },
    ...names.map((name) => ({ label: name, value: name }))];

  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const next = items.filter((item) => {
      const hitKeyword = !keyword || [item.nickname, item.speciesName, item.latinName, item.code, item.genusName].
      join(' ').
      toLowerCase().
      includes(keyword);
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
    <div className={cx(styles.r_b43b4c08, styles.r_8d7541cb)}>
      <header className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_60541e1e, styles.r_8ef2268e, styles.r_0c3bc985)}>
        <div>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_6d623258)}>植物档案</h1>
          <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_7b89cd85)}>管理你实际养护的每一株植物，成长记录会自动汇入对应时间线</p>
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_1004c0c3)}>
          <div className={cx(styles.r_60fbb771, styles.r_426b8b75, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_438b2237)}>
            <span className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_7b89cd85)}>植株总数</span>
            <span className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_6d623258)}>{stats.total}</span>
          </div>
          <Link
            href="/editor?type=journal"
            className={cx(styles.r_52083e7d, styles.r_426b8b75, styles.r_3960ffc2, styles.r_58284b4e, styles.r_5f22e64f, styles.r_6bceb016, styles.r_f0faeb26, styles.r_fc7473ca, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_438b2237, styles.r_56bf8ae8, styles.r_e269e58c)}>

            <Icon name="plus" size={15} />
            添加植株
          </Link>
        </div>
      </header>

      <section className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
        <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_eb6e8b88, styles.r_6d84da9d)}>
          <label className={cx(styles.r_d89972fe, styles.r_0214b4b3)}>
            <Icon name="search" size={16} className={cx(styles.r_da4dbfbc, styles.r_22e59b72, styles.r_d694ba66, styles.r_36b381be, styles.r_66a36c90)} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={cx(styles.r_426b8b75, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_e6038fff, styles.r_fafb9e0b, styles.r_fc7473ca, styles.r_df37b1fd, styles.r_56bf8ae8, styles.r_74046e83, styles.r_608dd26c, styles.r_1491d072)}
              placeholder="搜索植株昵称、档案编号或品种" />

          </label>
          <Select value={family} onValueChange={setFamily} options={familyOptions} />
          <Select
            value={sort}
            onValueChange={setSort}
            options={[
            { label: '最近更新', value: 'updated' },
            { label: '入手时间', value: 'acquired' },
            { label: '记录最多', value: 'records' },
            { label: '照片最多', value: 'photos' }]
            } />

          <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_7ebecbb6, styles.r_eb6a3cef)}>
            <ViewButton active={view === "grid"} icon="board" label="网格视图" onClick={() => setView("grid")} />
            <ViewButton active={view === 'list'} icon="menu" label="列表视图" onClick={() => setView('list')} />
          </div>
        </div>
      </section>

      {filteredItems.length === 0 ?
      <section className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_16a5872e, styles.r_ca6bf630, styles.r_438b2237)}>
          <div className={cx(styles.r_0e12dc7d, styles.r_f3c543ad, styles.r_73a13409, styles.r_7e74e5fe, styles.r_67d66567, styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_5f6a59f1)}>
            <Icon name="plants" size={26} />
          </div>
          <h2 className={cx(styles.r_0ab86672, styles.r_4ee73492, styles.r_69450ef1, styles.r_4ddaa618)}>还没有匹配的植物档案</h2>
          <p className={cx(styles.r_50d0d216, styles.r_fc7473ca, styles.r_7b89cd85)}>发布成长记录帖后，系统会自动生成对应植物档案。</p>
          <Link
          href="/editor?type=journal"
          className={cx(styles.r_fb77735e, styles.r_52083e7d, styles.r_426b8b75, styles.r_3960ffc2, styles.r_58284b4e, styles.r_5f22e64f, styles.r_6bceb016, styles.r_f0faeb26, styles.r_fc7473ca, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_e269e58c)}>

            <Icon name="plus" size={15} />
            添加植株
          </Link>
        </section> :
      view === "grid" ?
      <section className={cx(styles.r_f3c543ad, styles.r_0c3bc985, styles.r_e00ad816, styles.r_b86f7f94, styles.r_0814ebd0)}>
          {filteredItems.map((item) =>
        <PlantCard key={item.id} item={item} onEdit={setEditingItem} />
        )}
        </section> :

      <section className={styles.r_6ed543e2}>
          {filteredItems.map((item) =>
        <PlantListItem key={item.id} item={item} onEdit={setEditingItem} />
        )}
        </section>
      }

      <PlantFormDialog plant={editingItem} open={Boolean(editingItem)} onClose={() => setEditingItem(null)} />
    </div>);

}

function PlantFormDialog({
  open,
  onClose,
  plant




}: {open: boolean;onClose: () => void;plant?: PlantArchiveItem | null;}) {
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
    fetch(`/api/species?${params.toString()}`, { signal: controller.signal }).
    then((res) => res.json()).
    then((data) => {
      if (!Array.isArray(data)) return;
      const next = [...data] as SpeciesOption[];
      if (plant && !next.some((item) => item.id === plant.speciesId)) {
        next.unshift({
          id: plant.speciesId,
          name: plant.speciesName,
          latinName: plant.latinName,
          familySlug: '',
          genusSlug: ''
        });
      }
      setSpecies(next);
    }).
    catch(() => null);
    return () => {
      controller.abort();
    };
  }, [open, plant]);

  const nicknamePlaceholder = selectedSpecies ?
  `${selectedSpecies.name} #xx号` :
  '品种名 #xx号';

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
          currentStageLabel: plant!.currentStage === 'other' ? plant!.currentStageLabel || undefined : undefined
        }),
        note
      };
      const saved = editing ?
      await api.patch<{id: string;}>(`/api/my-plants/${plant!.id}`, payload) :
      await api.post<{id: string;}>("/api/my-plants", payload);
      toast.success(editing ? '植物档案已更新' : '植物档案已创建');
      onClose();
      router.refresh();
      if (!editing) router.push("/plant-archives");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : editing ? '保存失败，请稍后重试' : '创建失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={editing ? '编辑' : '新增'} maxWidth="lg">
      <Form.Root onSubmit={submit} className={styles.r_b43b4c08}>
        <div className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_9ac94195, styles.r_eb6e8b88, styles.r_359090c2, styles.r_7054e276, styles.r_02eb621e)}>
          植物档案由成长记录帖自动创建和维护，这里只调整已有档案的基础信息。
        </div>

        <div className={styles.r_3e7ce58d}>
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
                    label: `${item.name} · ${item.latinName}`
                  }))} />

              </Form.Control>
              <Form.Message match="valueMissing" className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_fa512798)}>请选择品种</Form.Message>
            </FormRow>
          </Form.Field>

          <Form.Field name="nickname">
            <FormRow label="植株昵称" required>
              <Form.Control asChild>
                <input
                  required
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  className={styles.r_426b8b75}
                  placeholder={nicknamePlaceholder}
                  maxLength={50} />

              </Form.Control>
              <Form.Message match="valueMissing" className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_fa512798)}>请填写植株昵称</Form.Message>
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
                  className={styles.r_426b8b75} />

              </Form.Control>
              <Form.Message match="valueMissing" className={cx(styles.r_b6b02c0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_fa512798)}>请选择入手时间</Form.Message>
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
                className={styles.r_6a5890f4} />

            </div>
          </FormRow>
        </div>

        <div className={cx(styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e, styles.r_b950dda2, styles.r_88b684d2, styles.r_173fa8f0)}>
          <button type="button" onClick={onClose} className={cx(styles.r_426b8b75, styles.r_af7490b1, styles.r_fc7473ca)}>取消</button>
          <Form.Submit disabled={submitting} className={cx(styles.r_426b8b75, styles.r_af7490b1, styles.r_fc7473ca)}>
            {submitting ? '保存中...' : editing ? '保存' : '创建'}
          </Form.Submit>
        </div>
      </Form.Root>
    </Dialog>);

}

function ViewButton({ active, icon, label, onClick }: {active: boolean;icon: 'board' | 'menu';label: string;onClick: () => void;}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_ae2181c7, styles.r_67d66567, styles.r_421ac2be, styles.r_56bf8ae8), active ? cx(styles.r_5e10cdb8, styles.r_5f6a59f1, styles.r_438b2237) : styles.r_7b89cd85)}
      aria-label={label}>

      <Icon name={icon} size={16} />
    </button>);

}

function FormRow({ label, required = false, children }: {label: string;required?: boolean;children: React.ReactNode;}) {
  return (
    <div className={cx(styles.r_f3c543ad, styles.r_77a2a20e, styles.r_94822715, styles.r_64cac80d)}>
      <div className={cx(styles.r_f46b61a9, styles.r_359090c2, styles.r_e83a7042, styles.r_eb6abb1f)}>
        {required && <span className={styles.r_fa512798}>*</span>} {label}
      </div>
      <div className={styles.r_7e0b7cdf}>{children}</div>
    </div>);

}

function PlantCard({ item, onEdit }: {item: PlantArchiveItem;onEdit: (item: PlantArchiveItem) => void;}) {
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
      className={cx(styles.r_34516836, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237, styles.r_56bf8ae8, styles.r_5aae3db6, styles.r_55d048eb, styles.r_608dd26c, styles.r_b02b69f5)}>

      <Link href={href} className={styles.r_0214b4b3}>
        <div className={cx(styles.r_d89972fe, styles.r_357868ab, styles.r_7ebecbb6)}>
          {item.cover ?
          <Image src={item.cover} alt={item.nickname} fill unoptimized className={styles.r_7d85d0c2} /> :

          <div className={cx(styles.r_f3c543ad, styles.r_668b21aa, styles.r_67d66567, styles.r_5f6a59f1)}>
              <Icon name="plants" size={38} />
            </div>
          }
          <span className={cn(cx(styles.r_da4dbfbc, styles.r_22e59b72, styles.r_8782d84c, styles.r_ac204c10, styles.r_0b91436d, styles.r_660d2eff, styles.r_359090c2, styles.r_e83a7042), statusClass(item.status))}>
            {item.statusLabel}
          </span>
          <span className={cx(styles.r_da4dbfbc, styles.r_49af11eb, styles.r_c100b64c, styles.r_5f22e64f, styles.r_95a04d1b, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_e83a7042, styles.r_72a4c7cd)}>
            {item.code}
          </span>
        </div>
      </Link>
      <div className={cx(styles.r_6ed543e2, styles.r_8e63407b)}>
        <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_8ef2268e, styles.r_1004c0c3)}>
          <div className={styles.r_7e0b7cdf}>
            <Link href={href} className={cx(styles.r_f50e2015, styles.r_4ee73492, styles.r_69450ef1, styles.r_6d623258, styles.r_9825203a)}>
              {item.nickname}
            </Link>
            <div className={cx(styles.r_b6b02c0e, styles.r_f50e2015, styles.r_359090c2, styles.r_7b89cd85)}>{item.speciesName} · <span className={styles.r_90665ca6}>{item.latinName}</span></div>
          </div>
          <div className={cx(styles.r_60fbb771, styles.r_012fbd12, styles.r_44ee8ba0)}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(item);
              }}
              className={cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_67d66567, styles.r_5f22e64f, styles.r_66a36c90, styles.r_5756b7b4, styles.r_9825203a)}
              aria-label="编辑植株">

              <Icon name="edit" size={15} />
            </button>
            <Link href={href} className={cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_67d66567, styles.r_5f22e64f, styles.r_66a36c90, styles.r_5756b7b4, styles.r_9825203a)} aria-label={item.journalPostId ? '查看成长帖' : '发布成长记录'}>
              <Icon name="arrow-right" size={15} />
            </Link>
          </div>
        </div>

        <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_52f53b18, styles.r_7660b450, styles.r_ca6bf630, styles.r_d058ca6d)}>
          <MiniMeta label="养护" value={item.durationLabel} />
          <MiniMeta label="记录" value={`${item.recordCount} 条`} />
          <MiniMeta label="照片" value={`${item.imageCount} 张`} />
        </div>

        <p className={cx(styles.r_054cb4e3, styles.r_bb37cef0, styles.r_fc7473ca, styles.r_7054e276, styles.r_02eb621e)}>
          {item.latestNote || `${item.latestStageLabel} · ${item.lastUpdateLabel}`}
        </p>

        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_d058ca6d, styles.r_7b89cd85)}>
          <span className={cx(styles.r_ac204c10, styles.r_63b9410b, styles.r_d5eab218, styles.r_660d2eff, styles.r_d250453a)}>{item.familyName || '未分类'} / {item.genusName || '未关联属'}</span>
          <span className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_660d2eff, styles.r_5f6a59f1)}>成长帖 {item.journalCount}</span>
        </div>
      </div>
    </article>);

}

function PlantListItem({ item, onEdit }: {item: PlantArchiveItem;onEdit: (item: PlantArchiveItem) => void;}) {
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
      className={cx(styles.r_f3c543ad, styles.r_34516836, styles.r_0c3bc985, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_eb6e8b88, styles.r_438b2237, styles.r_56bf8ae8, styles.r_5aae3db6, styles.r_55d048eb, styles.r_608dd26c, styles.r_b02b69f5, styles.r_38a9bbc5)}>

      <Link href={href} className={cx(styles.r_d89972fe, styles.r_357868ab, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_9fc8328d)}>
        {item.cover ?
        <Image src={item.cover} alt={item.nickname} fill unoptimized className={styles.r_7d85d0c2} /> :

        <div className={cx(styles.r_f3c543ad, styles.r_668b21aa, styles.r_67d66567, styles.r_5f6a59f1)}>
            <Icon name="plants" size={30} />
          </div>
        }
      </Link>
      <div className={cx(styles.r_7e0b7cdf, styles.r_660d2eff)}>
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <span className={cn(cx(styles.r_ac204c10, styles.r_0b91436d, styles.r_660d2eff, styles.r_359090c2, styles.r_e83a7042), statusClass(item.status))}>{item.statusLabel}</span>
          <span className={cx(styles.r_359090c2, styles.r_66a36c90)}>{item.code}</span>
          <span className={cx(styles.r_359090c2, styles.r_66a36c90)}>{item.lastUpdateLabel}</span>
        </div>
        <Link href={href} className={cx(styles.r_50d0d216, styles.r_0214b4b3, styles.r_f283ea9b, styles.r_42536e69, styles.r_69450ef1, styles.r_6d623258, styles.r_9825203a)}>
          {item.nickname}
        </Link>
        <div className={cx(styles.r_b6b02c0e, styles.r_f283ea9b, styles.r_359090c2, styles.r_7b89cd85)}>{item.speciesName} · <span className={styles.r_90665ca6}>{item.latinName}</span></div>
        <p className={cx(styles.r_eccd13ef, styles.r_054cb4e3, styles.r_fc7473ca, styles.r_7054e276, styles.r_02eb621e)}>{item.latestNote || '暂无成长记录，发布记录后会自动汇入时间线。'}</p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(item);
          }}
          className={cx(styles.r_eccd13ef, styles.r_52083e7d, styles.r_ed8a5df7, styles.r_3960ffc2, styles.r_58284b4e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_359090c2, styles.r_e83a7042, styles.r_5f6a59f1, styles.r_5756b7b4)}>

          <Icon name="edit" size={14} />
          编辑植株
        </button>
      </div>
      <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_77a2a20e, styles.r_b950dda2, styles.r_5ff6a729, styles.r_ce335a8e, styles.r_ca6bf630, styles.r_d058ca6d, styles.r_e9708e04, styles.r_c0c13d8a, styles.r_c455710c, styles.r_b83cc5cd)}>
        <MiniMeta label="养护" value={item.durationLabel} />
        <MiniMeta label="记录" value={`${item.recordCount} 条`} />
        <MiniMeta label="阶段" value={item.latestStageLabel} />
      </div>
    </article>);

}

function MiniMeta({ label, value }: {label: string;value: string;}) {
  return (
    <div className={styles.r_7e0b7cdf}>
      <div className={styles.r_66a36c90}>{label}</div>
      <div className={cx(styles.r_b6b02c0e, styles.r_f283ea9b, styles.r_e83a7042, styles.r_399e11a5)}>{value}</div>
    </div>);

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
      return cx(styles.r_d01e7232, styles.r_cf2c3db6);
    case 'watching':
      return cx(styles.r_63b9410b, styles.r_d250453a);
    case 'needs_attention':
      return cx(styles.r_0759a0f1, styles.r_b54428d1);
    case 'dormant':
      return cx(styles.r_67d2289d, styles.r_85d79ebf);
    case 'ended':
      return cx(styles.r_febec8f2, styles.r_02eb621e);
  }
}