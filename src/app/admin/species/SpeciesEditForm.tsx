'use client';

import { useId, useState } from 'react';
import { api, ApiError } from "@/lib/client-api";
import { MultiImageUploadGrid } from '@/components/upload/MultiImageUploadGrid';
import { UploadField } from '@/components/upload/UploadField';
import {
  COVER_POSITIONS,
  parseSpeciesGallery,
  SPECIES_GALLERY_CATEGORIES,
  stringifySpeciesGallery,
  stringifySpeciesGalleryForCover } from
"@/lib/species-gallery";
import styles from './SpeciesEditForm.module.scss';
import { cx } from '@/lib/style-utils';



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
  onCancel





}: {species: SpeciesData | null;genera: GenusOption[];onDone?: () => void;onCancel?: () => void;}) {
  const isNew = !species;
  const [genusId, setGenusId] = useState(species?.genusId ?? genera[0]?.id ?? '');
  const [slug, setSlug] = useState(species?.slug ?? '');
  const [name, setName] = useState(species?.name ?? '');
  const [latinName, setLatinName] = useState(species?.latinName ?? '');
  const [alias, setAlias] = useState(species?.alias ?? "[]");
  const [description, setDescription] = useState(species?.description ?? '');
  const [cover, setCover] = useState(species?.cover ?? '');
  const initialGallery = parseSpeciesGallery(species?.gallery);
  const [gallery, setGallery] = useState(species?.gallery ?? "[]");
  const [coverPosition, setCoverPosition] = useState(initialGallery.coverPosition ?? 'center center');
  const [difficulty, setDifficulty] = useState(species?.difficulty ?? 2);
  const [light, setLight] = useState(species?.light ?? '散射光');
  const [watering, setWatering] = useState(species?.watering ?? '见干见湿');
  const [hardiness, setHardiness] = useState(species?.hardiness ?? '0°C');
  const [tips, setTips] = useState(species?.tips ?? "[]");
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
  const [riskTips, setRiskTips] = useState(species?.riskTips ?? "[]");

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
        alias: alias.trim() || "[]",
        description: description.trim(),
        cover: cover.trim(),
        gallery: galleryForSave(),
        difficulty,
        light: light.trim(),
        watering: watering.trim(),
        hardiness: hardiness.trim(),
        tips: tips.trim() || "[]",
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
        riskTips: riskTips.trim() || "[]"
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
    <div className={cx(styles.r_3e7ce58d, styles.r_359090c2)}>
      {err && <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_b54428d1)}>{err}</div>}

      <Section title="基础信息">
        <Field label="属 *">
          <select
            className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
            value={genusId}
            onChange={(e) => setGenusId(e.target.value)}>

            {genera.map((g) =>
            <option key={g.id} value={g.id}>
                {g.label}
              </option>
            )}
          </select>
        </Field>
        <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3)}>
          <Field label="slug *">
            <input
              className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b)}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="luna" />

          </Field>
          <Field label="中文名 *">
            <input
              className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="月迷" />

          </Field>
        </div>
        <Field label="拉丁学名 *">
          <input
            className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_90665ca6)}
            value={latinName}
            onChange={(e) => setLatinName(e.target.value)}
            placeholder="Echeveria 'Luna'" />

        </Field>
        <Field label="别名 JSON 数组">
          <input
            className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b, styles.r_d058ca6d)}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder={'["月夜","月光"]'} />

        </Field>
        <Field label="描述">
          <textarea
            className={cx(styles.r_dd9ce2a7, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000} />

        </Field>
      </Section>

      <Section title="封面与图集">
        <Field label="封面图 *">
          <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_1004c0c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_60e1dfd7, styles.r_eb6e8b88, styles.r_020ba687, styles.r_9f76a62f)}>
            <UploadField
              kind="image"
              value={cover ? [cover] : []}
              onChange={handleCoverChange}
              max={1}
              simpleMode
              className={cx(styles.r_6da6a3c3, styles.r_934e8d33)}
              itemClassName={cx(styles.r_271c257f, styles.r_5f22e64f, styles.r_5e10cdb8)}
              itemImageClassName={styles.r_b1104f41} />

            <div className={cx(styles.r_359090c2, styles.r_7054e276, styles.r_69335b95)}>
              <div className={cx(styles.r_2689f395, styles.r_eb6abb1f)}>单张封面图</div>
              <div>使用发帖页封面图样式。不限制比例，列表缩略图和详情页大图按场景裁切。</div>
              <select
                value={coverPosition}
                onChange={(e) => setCoverPosition(e.target.value)}
                className={cx(styles.r_50d0d216, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_d5eab218, styles.r_ec0091ee, styles.r_359090c2, styles.r_eb6abb1f)}>

                {COVER_POSITIONS.map((item) =>
                <option key={item.value} value={item.value}>{item.label}</option>
                )}
              </select>
            </div>
          </div>
        </Field>

        <Field label="图集">
          <div className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_eb6e8b88)}>
            <MultiImageUploadGrid
              value={parseSpeciesGallery(gallery).items.map((item) => item.url).filter((url) => url !== cover)}
              onChange={(arr) => {
                const existing = parseSpeciesGallery(gallery);
                const byUrl = new Map(existing.items.map((item) => [item.url, item]));
                setGallery(stringifySpeciesGallery({
                  ...existing,
                  coverPosition,
                  items: arr.
                  filter((url) => url !== cover).
                  map((url, index) => ({
                    ...byUrl.get(url),
                    url,
                    orderIdx: index
                  }))
                }));
              }}
              max={9}
              showAddWhileUploading
              showCount
              gridClassName={cx(styles.r_be2e831b, styles.r_77a2a20e, styles.r_898c0bcb, styles.r_74713240)}
              tileClassName={cx(styles.r_3a2c0af3, styles.r_6da6a3c3)}
              tileImageClassName={styles.r_7d85d0c2}
              firstItemLabel="首图"
              hideAddButton={false}
              squareTiles
              squareAddButton
              helpText={
              <>
                  <div>最多上传 9 张，支持一次选择多张，可拖拽调整顺序。封面图不会重复进入图集。</div>
                  <div>参考富文本图片弹窗上传组件，支持 jpg / png / webp / gif / heic。</div>
                </>
              } />

            <GalleryMetaEditor
              gallery={gallery}
              cover={cover}
              coverPosition={coverPosition}
              onChange={setGallery} />

          </div>
        </Field>
      </Section>

      <Section title="养护数据">
        <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3)}>
          <Field label="难度 1-5">
            <input
              type="number"
              min={1}
              max={5}
              className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))} />

          </Field>
          <Field label="光照">
            <input
              className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
              value={light}
              onChange={(e) => setLight(e.target.value)}
              placeholder="散射光" />

          </Field>
          <Field label="浇水">
            <input
              className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
              value={watering}
              onChange={(e) => setWatering(e.target.value)}
              placeholder="见干见湿" />

          </Field>
          <Field label="耐寒度">
            <input
              className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
              value={hardiness}
              onChange={(e) => setHardiness(e.target.value)}
              placeholder="-2°C" />

          </Field>
          <Field label="生长速度">
            <input
              className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
              value={growthSpeed}
              onChange={(e) => setGrowthSpeed(e.target.value)}
              placeholder="中等 / 较快 / 较慢" />

          </Field>
          <Field label="夏眠">
            <input
              className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
              value={summerDormancy}
              onChange={(e) => setSummerDormancy(e.target.value)}
              placeholder="不明显 / 明显 / 强" />

          </Field>
        </div>
        <Field label="养护要点 JSON 数组">
          <textarea
            className={cx(styles.r_dd9ce2a7, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b, styles.r_d058ca6d)}
            value={tips}
            onChange={(e) => setTips(e.target.value)}
            placeholder={'["夏季避免暴晒","冬季控水"]'} />

        </Field>
      </Section>

      <Section title="环境需求">
        <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3)}>
          <Field label="光照需求">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={lightRequirement} onChange={(e) => setLightRequirement(e.target.value)} placeholder="充足阳光 / 散射光" />
          </Field>
          <Field label="适宜温度">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={idealTemperature} onChange={(e) => setIdealTemperature(e.target.value)} placeholder="15-28°C" />
          </Field>
          <Field label="最低温度">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={minTemperature} onChange={(e) => setMinTemperature(e.target.value)} placeholder="5°C" />
          </Field>
          <Field label="最高温度">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={maxTemperature} onChange={(e) => setMaxTemperature(e.target.value)} placeholder="35°C" />
          </Field>
          <Field label="适宜湿度">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={humidity} onChange={(e) => setHumidity(e.target.value)} placeholder="20%-60%" />
          </Field>
          <Field label="配土建议">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={soil} onChange={(e) => setSoil(e.target.value)} placeholder="颗粒土 70%+" />
          </Field>
        </div>
      </Section>

      <Section title="风险提示">
        <Field label="风险提示 JSON 数组">
          <textarea
            className={cx(styles.r_dd9ce2a7, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b, styles.r_d058ca6d)}
            value={riskTips}
            onChange={(e) => setRiskTips(e.target.value)}
            placeholder={'["夏季高温闷湿易黑腐","长期缺光易徒长"]'} />

        </Field>
      </Section>

      <Section title="SEO 与补充信息">
        <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_1004c0c3)}>
          <Field label="花期">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={blooming} onChange={(e) => setBlooming(e.target.value)} placeholder="春季" />
          </Field>
          <Field label="原产地">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={originRegion} onChange={(e) => setOriginRegion(e.target.value)} placeholder="墨西哥" />
          </Field>
          <Field label="生长型">
            <input className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)} value={growthType} onChange={(e) => setGrowthType(e.target.value)} placeholder="夏型" />
          </Field>
        </div>
      </Section>

      <div className={cx(styles.r_60fbb771, styles.r_77c08e01, styles.r_b950dda2, styles.r_358505cf, styles.r_173fa8f0)}>
        <div className={cx(styles.r_fb56d9cf, styles.r_60fbb771, styles.r_77a2a20e)}>
          <button
            type="button"
            onClick={onCancel}
            className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_5399e21f)}>

            取消
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_72a4c7cd, styles.r_218d0c3a)}>

            {busy ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>);

}

function Section({ title, children }: {title: string;children: React.ReactNode;}) {
  return (
    <section>
      <div className={cx(styles.r_a77ed4d9, styles.r_65fdbade, styles.r_358505cf, styles.r_569eb162, styles.r_fc7473ca, styles.r_e83a7042, styles.r_eb6abb1f)}>{title}</div>
      <div className={styles.r_6ed543e2}>{children}</div>
    </section>);

}

function Field({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div className={styles.r_0214b4b3}>
      <div className={cx(styles.r_65281709, styles.r_d058ca6d, styles.r_2689f395, styles.r_02eb621e)}>{label}</div>
      {children}
    </div>);

}

function GalleryMetaEditor({
  gallery,
  cover,
  coverPosition,
  onChange





}: {gallery: string;cover: string;coverPosition: string;onChange: (value: string) => void;}) {
  const data = parseSpeciesGallery(gallery);
  const items = data.items.filter((item) => item.url !== cover);
  const categoryListId = useId();

  if (items.length === 0) return null;

  const updateItem = (url: string, patch: {category?: string;note?: string;}) => {
    onChange(stringifySpeciesGallery({
      ...data,
      coverPosition,
      items: data.items.map((item) => item.url === url ? { ...item, ...patch } : item)
    }));
  };

  return (
    <div className={cx(styles.r_eccd13ef, styles.r_6f7e013d)}>
      <div className={cx(styles.r_d058ca6d, styles.r_2689f395, styles.r_02eb621e)}>图集分类与说明</div>
      <datalist id={categoryListId}>
        {SPECIES_GALLERY_CATEGORIES.map((category) =>
        <option key={category} value={category} />
        )}
      </datalist>
      {items.map((item, index) =>
      <div key={item.url} className={cx(styles.r_f3c543ad, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_74f84935, styles.r_7660b450, styles.r_3db7838e, styles.r_9f76a62f)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt="" className={cx(styles.r_73a13409, styles.r_baceed34, styles.r_07389a77, styles.r_5e10cdb8, styles.r_7d85d0c2)} />
          <input
          list={categoryListId}
          value={item.category ?? ''}
          onChange={(e) => updateItem(item.url, { category: e.target.value || undefined })}
          className={cx(styles.r_ed8a5df7, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_5e10cdb8, styles.r_d5eab218, styles.r_d058ca6d)}
          placeholder={`自动分类 ${index + 1}`} />

          <input
          value={item.note ?? ''}
          onChange={(e) => updateItem(item.url, { note: e.target.value })}
          className={cx(styles.r_ed8a5df7, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_5e10cdb8, styles.r_d5eab218, styles.r_d058ca6d)}
          placeholder="图片说明，可选" />

        </div>
      )}
    </div>);

}