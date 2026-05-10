'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { UploadField } from '@/components/upload/UploadField';

interface SpeciesData {
  id: string;
  genusId: string;
  slug: string;
  name: string;
  latinName: string;
  alias: string | null;
  description: string;
  cover: string;
  gallery: string;
  difficulty: number;
  light: string;
  watering: string;
  hardiness: string;
  tips: string;
  blooming: string | null;
  originRegion: string | null;
  growthType: string | null;
}

interface GenusOption {
  id: string;
  label: string;
}

export function SpeciesEditForm({
  species,
  genera,
}: {
  species: SpeciesData | null;
  genera: GenusOption[];
}) {
  const router = useRouter();
  const isNew = !species;
  const [genusId, setGenusId] = useState(species?.genusId ?? genera[0]?.id ?? '');
  const [slug, setSlug] = useState(species?.slug ?? '');
  const [name, setName] = useState(species?.name ?? '');
  const [latinName, setLatinName] = useState(species?.latinName ?? '');
  const [alias, setAlias] = useState(species?.alias ?? '[]');
  const [description, setDescription] = useState(species?.description ?? '');
  const [cover, setCover] = useState(species?.cover ?? '');
  const [gallery, setGallery] = useState(species?.gallery ?? '[]');
  const [difficulty, setDifficulty] = useState(species?.difficulty ?? 2);
  const [light, setLight] = useState(species?.light ?? '散射光');
  const [watering, setWatering] = useState(species?.watering ?? '见干见湿');
  const [hardiness, setHardiness] = useState(species?.hardiness ?? '0°C');
  const [tips, setTips] = useState(species?.tips ?? '[]');
  const [blooming, setBlooming] = useState(species?.blooming ?? '');
  const [originRegion, setOriginRegion] = useState(species?.originRegion ?? '');
  const [growthType, setGrowthType] = useState(species?.growthType ?? '');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!genusId) return setErr('属必选');
    if (!slug.trim() || !name.trim() || !latinName.trim() || !cover.trim()) {
      return setErr('slug / name / latinName / cover 必填');
    }
    setBusy(true);
    try {
      const body = {
        genusId,
        slug: slug.trim(),
        name: name.trim(),
        latinName: latinName.trim(),
        alias: alias.trim() || '[]',
        description: description.trim(),
        cover: cover.trim(),
        gallery: gallery.trim() || '[]',
        difficulty,
        light: light.trim(),
        watering: watering.trim(),
        hardiness: hardiness.trim(),
        tips: tips.trim() || '[]',
        blooming: blooming.trim() || null,
        originRegion: originRegion.trim() || null,
        growthType: growthType.trim() || null,
      };
      if (isNew) {
        await api.post('/api/admin/species', body);
      } else {
        await api.patch(`/api/admin/species/${species!.id}`, body);
      }
      router.push('/admin/species');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!species) return;
    if (!confirm(`确认删除「${species.name}」?`)) return;
    setBusy(true);
    try {
      await api.delete(`/api/admin/species/${species.id}`);
      router.push('/admin/species');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '删除失败');
      setBusy(false);
    }
  };

  return (
    <div className="card max-w-3xl space-y-4 p-6 text-xs">
      {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{err}</div>}

      <Section title="基础信息">
        <Field label="属(必选)*">
          <select
            className="w-full rounded-lg border border-ink-200 px-3 py-2"
            value={genusId}
            onChange={(e) => setGenusId(e.target.value)}
          >
            {genera.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="slug *">
            <input
              className="w-full rounded-lg border border-ink-200 px-3 py-2 font-mono"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="luna"
            />
          </Field>
          <Field label="中文俗名 *">
            <input
              className="w-full rounded-lg border border-ink-200 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="月迷"
            />
          </Field>
        </div>
        <Field label="拉丁学名 *">
          <input
            className="w-full rounded-lg border border-ink-200 px-3 py-2 italic"
            value={latinName}
            onChange={(e) => setLatinName(e.target.value)}
            placeholder="Echeveria 'Luna'"
          />
        </Field>
        <Field label="别名(JSON 数组)">
          <input
            className="w-full rounded-lg border border-ink-200 px-3 py-2 font-mono text-[11px]"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder='["月夜","月光"]'
          />
        </Field>
        <Field label="描述">
          <textarea
            className="w-full min-h-[80px] rounded-lg border border-ink-200 px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </Field>
      </Section>

      <Section title="图片">
        <Field label="封面图 *">
          <UploadField
            kind="image"
            value={cover ? [cover] : []}
            onChange={(arr) => setCover(arr[0] ?? '')}
            max={1}
          />
        </Field>
        <Field label="图集(可选,展示在品种详情页)">
          <UploadField
            kind="image"
            value={parseGalleryJson(gallery)}
            onChange={(arr) => setGallery(JSON.stringify(arr))}
            max={9}
          />
          <div className="mt-1 text-[10px] text-ink-500">
            最多 9 张,首张可作为详情页大图,其他作为缩略
          </div>
        </Field>
      </Section>

      <Section title="养护数据">
        <div className="grid grid-cols-2 gap-3">
          <Field label="难度(1-5,管理员预设)">
            <input
              type="number"
              min={1}
              max={5}
              className="w-full rounded-lg border border-ink-200 px-3 py-2"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
            />
            <div className="mt-1 text-[10px] text-ink-500">
              注:用户登录后可对此打分,前台显示用户平均分
            </div>
          </Field>
          <Field label="光照">
            <input
              className="w-full rounded-lg border border-ink-200 px-3 py-2"
              value={light}
              onChange={(e) => setLight(e.target.value)}
              placeholder="散射光"
            />
          </Field>
          <Field label="浇水">
            <input
              className="w-full rounded-lg border border-ink-200 px-3 py-2"
              value={watering}
              onChange={(e) => setWatering(e.target.value)}
              placeholder="见干见湿"
            />
          </Field>
          <Field label="耐寒度">
            <input
              className="w-full rounded-lg border border-ink-200 px-3 py-2"
              value={hardiness}
              onChange={(e) => setHardiness(e.target.value)}
              placeholder="-2°C"
            />
          </Field>
        </div>
        <Field label="养护要点(JSON 数组)">
          <textarea
            className="w-full min-h-[80px] rounded-lg border border-ink-200 px-3 py-2 font-mono text-[11px]"
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            placeholder='["夏季避免暴晒","冬季控水"]'
          />
        </Field>
      </Section>

      <Section title="补充信息(选填)">
        <div className="grid grid-cols-3 gap-3">
          <Field label="花期">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={blooming} onChange={(e) => setBlooming(e.target.value)} placeholder="春季" />
          </Field>
          <Field label="原产地">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={originRegion} onChange={(e) => setOriginRegion(e.target.value)} placeholder="墨西哥" />
          </Field>
          <Field label="生长型">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={growthType} onChange={(e) => setGrowthType(e.target.value)} placeholder="夏型" />
          </Field>
        </div>
      </Section>

      <div className="flex justify-between border-t border-ink-100 pt-4">
        {!isNew && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-lg bg-rose-100 px-3 py-2 text-rose-700 hover:bg-rose-200"
          >
            删除品种
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/admin/species')}
            className="rounded-lg border border-ink-200 px-3 py-2 hover:bg-ink-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="rounded-lg bg-ink-800 px-3 py-2 text-white hover:bg-ink-700"
          >
            {busy ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 border-b border-ink-100 pb-1 text-sm font-semibold text-ink-700">{title}</div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-medium text-ink-600">{label}</div>
      {children}
    </label>
  );
}

function parseGalleryJson(s: string): string[] {
  try {
    const arr = JSON.parse(s || '[]');
    return Array.isArray(arr) ? arr.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}
