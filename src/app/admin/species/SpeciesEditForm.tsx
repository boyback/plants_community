'use client';

import { useId, useState } from 'react';
import { api, ApiError } from '@/lib/client-api';
import { MultiImageUploadGrid } from '@/components/upload/MultiImageUploadGrid';
import { UploadField } from '@/components/upload/UploadField';
import {
  COVER_POSITIONS,
  parseSpeciesGallery,
  SPECIES_GALLERY_CATEGORIES,
  stringifySpeciesGallery,
  stringifySpeciesGalleryForCover,
} from '@/lib/species-gallery';

export interface SpeciesData {
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
  growthSpeed: string | null;
  summerDormancy: string | null;
  lightRequirement: string | null;
  idealTemperature: string | null;
  minTemperature: string | null;
  maxTemperature: string | null;
  humidity: string | null;
  soil: string | null;
  riskTips: string | null;
}

export interface GenusOption {
  id: string;
  label: string;
}

export function SpeciesEditForm({
  species,
  genera,
  onDone,
  onCancel,
}: {
  species: SpeciesData | null;
  genera: GenusOption[];
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const isNew = !species;
  const [genusId, setGenusId] = useState(species?.genusId ?? genera[0]?.id ?? '');
  const [slug, setSlug] = useState(species?.slug ?? '');
  const [name, setName] = useState(species?.name ?? '');
  const [latinName, setLatinName] = useState(species?.latinName ?? '');
  const [alias, setAlias] = useState(species?.alias ?? '[]');
  const [description, setDescription] = useState(species?.description ?? '');
  const [cover, setCover] = useState(species?.cover ?? '');
  const initialGallery = parseSpeciesGallery(species?.gallery);
  const [gallery, setGallery] = useState(species?.gallery ?? '[]');
  const [coverPosition, setCoverPosition] = useState(initialGallery.coverPosition ?? 'center center');
  const [difficulty, setDifficulty] = useState(species?.difficulty ?? 2);
  const [light, setLight] = useState(species?.light ?? '散射光');
  const [watering, setWatering] = useState(species?.watering ?? '见干见湿');
  const [hardiness, setHardiness] = useState(species?.hardiness ?? '0°C');
  const [tips, setTips] = useState(species?.tips ?? '[]');
  const [blooming, setBlooming] = useState(species?.blooming ?? '');
  const [originRegion, setOriginRegion] = useState(species?.originRegion ?? '');
  const [growthType, setGrowthType] = useState(species?.growthType ?? '');
  const [growthSpeed, setGrowthSpeed] = useState(species?.growthSpeed ?? '');
  const [summerDormancy, setSummerDormancy] = useState(species?.summerDormancy ?? '');
  const [lightRequirement, setLightRequirement] = useState(species?.lightRequirement ?? '');
  const [idealTemperature, setIdealTemperature] = useState(species?.idealTemperature ?? '');
  const [minTemperature, setMinTemperature] = useState(species?.minTemperature ?? '');
  const [maxTemperature, setMaxTemperature] = useState(species?.maxTemperature ?? '');
  const [humidity, setHumidity] = useState(species?.humidity ?? '');
  const [soil, setSoil] = useState(species?.soil ?? '');
  const [riskTips, setRiskTips] = useState(species?.riskTips ?? '[]');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const galleryForSave = (nextCover = cover) => {
    return stringifySpeciesGalleryForCover(parseSpeciesGallery(gallery), nextCover.trim(), coverPosition);
  };

  const handleCoverChange = (arr: string[]) => {
    const nextCover = arr[0] ?? '';
    setCover(nextCover);
    setGallery((prev) => {
      return stringifySpeciesGalleryForCover(parseSpeciesGallery(prev), nextCover.trim(), coverPosition);
    });
  };

  const submit = async () => {
    setErr(null);
    if (!genusId) return setErr('属必选');
    if (!slug.trim() || !name.trim() || !latinName.trim() || !cover.trim()) {
      return setErr('slug / 中文名 / 拉丁名 / 封面图 必填');
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
        gallery: galleryForSave(),
        difficulty,
        light: light.trim(),
        watering: watering.trim(),
        hardiness: hardiness.trim(),
        tips: tips.trim() || '[]',
        blooming: blooming.trim() || null,
        originRegion: originRegion.trim() || null,
        growthType: growthType.trim() || null,
        growthSpeed: growthSpeed.trim() || null,
        summerDormancy: summerDormancy.trim() || null,
        lightRequirement: lightRequirement.trim() || null,
        idealTemperature: idealTemperature.trim() || null,
        minTemperature: minTemperature.trim() || null,
        maxTemperature: maxTemperature.trim() || null,
        humidity: humidity.trim() || null,
        soil: soil.trim() || null,
        riskTips: riskTips.trim() || '[]',
      };

      if (isNew) {
        await api.post('/api/admin/species', body);
      } else {
        await api.patch(`/api/admin/species/${species!.id}`, body);
      }
      onDone?.();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{err}</div>}

      <Section title="基础信息">
        <Field label="属 *">
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
          <Field label="中文名 *">
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
        <Field label="别名 JSON 数组">
          <input
            className="w-full rounded-lg border border-ink-200 px-3 py-2 font-mono text-[11px]"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder='["月夜","月光"]'
          />
        </Field>
        <Field label="描述">
          <textarea
            className="min-h-[80px] w-full rounded-lg border border-ink-200 px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </Field>
      </Section>

      <Section title="封面与图集">
        <Field label="封面图 *">
          <div className="flex flex-col gap-3 rounded-lg border border-leaf-100 bg-leaf-50/20 p-3 sm:flex-row sm:items-center">
            <UploadField
              kind="image"
              value={cover ? [cover] : []}
              onChange={handleCoverChange}
              max={1}
              simpleMode
              className="w-full sm:w-48"
              itemClassName="h-36 rounded-lg bg-white"
              itemImageClassName="object-contain"
            />
            <div className="text-xs leading-5 text-leaf-700/70">
              <div className="font-medium text-ink-700">单张封面图</div>
              <div>使用发帖页封面图样式。不限制比例，列表缩略图和详情页大图按场景裁切。</div>
              <select
                value={coverPosition}
                onChange={(e) => setCoverPosition(e.target.value)}
                className="mt-2 w-full rounded-lg border border-leaf-100 bg-white px-2 py-1.5 text-xs text-ink-700"
              >
                {COVER_POSITIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Field>

        <Field label="图集">
          <div className="rounded-lg border border-leaf-100 bg-white p-3">
            <MultiImageUploadGrid
              value={parseSpeciesGallery(gallery).items.map((item) => item.url).filter((url) => url !== cover)}
              onChange={(arr) => {
                const existing = parseSpeciesGallery(gallery);
                const byUrl = new Map(existing.items.map((item) => [item.url, item]));
                setGallery(stringifySpeciesGallery({
                  ...existing,
                  coverPosition,
                  items: arr
                    .filter((url) => url !== cover)
                    .map((url, index) => ({
                      ...byUrl.get(url),
                      url,
                      orderIdx: index,
                    })),
                }));
              }}
              max={9}
              showAddWhileUploading
              showCount
              gridClassName="grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5"
              tileClassName="h-[96px] w-full"
              tileImageClassName="object-cover"
              firstItemLabel="首图"
              hideAddButton={false}
              squareTiles
              squareAddButton
              helpText={
                <>
                  <div>最多上传 9 张，支持一次选择多张，可拖拽调整顺序。封面图不会重复进入图集。</div>
                  <div>参考富文本图片弹窗上传组件，支持 jpg / png / webp / gif / heic。</div>
                </>
              }
            />
            <GalleryMetaEditor
              gallery={gallery}
              cover={cover}
              coverPosition={coverPosition}
              onChange={setGallery}
            />
          </div>
        </Field>
      </Section>

      <Section title="养护数据">
        <div className="grid grid-cols-2 gap-3">
          <Field label="难度 1-5">
            <input
              type="number"
              min={1}
              max={5}
              className="w-full rounded-lg border border-ink-200 px-3 py-2"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
            />
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
          <Field label="生长速度">
            <input
              className="w-full rounded-lg border border-ink-200 px-3 py-2"
              value={growthSpeed}
              onChange={(e) => setGrowthSpeed(e.target.value)}
              placeholder="中等 / 较快 / 较慢"
            />
          </Field>
          <Field label="夏眠">
            <input
              className="w-full rounded-lg border border-ink-200 px-3 py-2"
              value={summerDormancy}
              onChange={(e) => setSummerDormancy(e.target.value)}
              placeholder="不明显 / 明显 / 强"
            />
          </Field>
        </div>
        <Field label="养护要点 JSON 数组">
          <textarea
            className="min-h-[80px] w-full rounded-lg border border-ink-200 px-3 py-2 font-mono text-[11px]"
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            placeholder='["夏季避免暴晒","冬季控水"]'
          />
        </Field>
      </Section>

      <Section title="环境需求">
        <div className="grid grid-cols-2 gap-3">
          <Field label="光照需求">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={lightRequirement} onChange={(e) => setLightRequirement(e.target.value)} placeholder="充足阳光 / 散射光" />
          </Field>
          <Field label="适宜温度">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={idealTemperature} onChange={(e) => setIdealTemperature(e.target.value)} placeholder="15-28°C" />
          </Field>
          <Field label="最低温度">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={minTemperature} onChange={(e) => setMinTemperature(e.target.value)} placeholder="5°C" />
          </Field>
          <Field label="最高温度">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={maxTemperature} onChange={(e) => setMaxTemperature(e.target.value)} placeholder="35°C" />
          </Field>
          <Field label="适宜湿度">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={humidity} onChange={(e) => setHumidity(e.target.value)} placeholder="20%-60%" />
          </Field>
          <Field label="配土建议">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={soil} onChange={(e) => setSoil(e.target.value)} placeholder="颗粒土 70%+" />
          </Field>
        </div>
      </Section>

      <Section title="风险提示">
        <Field label="风险提示 JSON 数组">
          <textarea
            className="min-h-[80px] w-full rounded-lg border border-ink-200 px-3 py-2 font-mono text-[11px]"
            value={riskTips}
            onChange={(e) => setRiskTips(e.target.value)}
            placeholder='["夏季高温闷湿易黑腐","长期缺光易徒长"]'
          />
        </Field>
      </Section>

      <Section title="SEO 与补充信息">
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

      <div className="flex justify-end border-t border-ink-100 pt-4">
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
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
    <div className="block">
      <div className="mb-1 text-[11px] font-medium text-ink-600">{label}</div>
      {children}
    </div>
  );
}

function GalleryMetaEditor({
  gallery,
  cover,
  coverPosition,
  onChange,
}: {
  gallery: string;
  cover: string;
  coverPosition: string;
  onChange: (value: string) => void;
}) {
  const data = parseSpeciesGallery(gallery);
  const items = data.items.filter((item) => item.url !== cover);
  const categoryListId = useId();

  if (items.length === 0) return null;

  const updateItem = (url: string, patch: { category?: string; note?: string }) => {
    onChange(stringifySpeciesGallery({
      ...data,
      coverPosition,
      items: data.items.map((item) => item.url === url ? { ...item, ...patch } : item),
    }));
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="text-[11px] font-medium text-ink-600">图集分类与说明</div>
      <datalist id={categoryListId}>
        {SPECIES_GALLERY_CATEGORIES.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      {items.map((item, index) => (
        <div key={item.url} className="grid gap-2 rounded-lg border border-ink-100 bg-ink-50/40 p-2 sm:grid-cols-[64px_150px_1fr] sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt="" className="h-14 w-16 rounded bg-white object-cover" />
          <input
            list={categoryListId}
            value={item.category ?? ''}
            onChange={(e) => updateItem(item.url, { category: e.target.value || undefined })}
            className="h-8 rounded border border-ink-200 bg-white px-2 text-[11px]"
            placeholder={`自动分类 ${index + 1}`}
          />
          <input
            value={item.note ?? ''}
            onChange={(e) => updateItem(item.url, { note: e.target.value })}
            className="h-8 rounded border border-ink-200 bg-white px-2 text-[11px]"
            placeholder="图片说明，可选"
          />
        </div>
      ))}
    </div>
  );
}
