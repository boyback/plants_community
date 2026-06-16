'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from "@/lib/client-api";
import styles from './SpeciesSimilarityEditor.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



type SimilarityItem = {
  similarSpeciesId: string;
  score: number;
  reason: string;
  name?: string;
  latinName?: string;
};

type SpeciesOption = {
  id: string;
  slug: string;
  name: string;
  latinName: string;
  familySlug: string;
  genusSlug: string;
};

export function SpeciesSimilarityEditor({ speciesId }: {speciesId?: string;}) {
  const [items, setItems] = useState<SimilarityItem[]>([]);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<SpeciesOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [syncReverse, setSyncReverse] = useState(true);

  useEffect(() => {
    if (!speciesId) return;
    let cancelled = false;
    setLoading(true);
    api.get<Array<{similarSpeciesId: string;score: number;reason: string | null;name: string;latinName: string;}>>(`/api/admin/species/${speciesId}/similarities`).
    then((rows) => {
      if (cancelled) return;
      setItems(rows.map((row) => ({
        similarSpeciesId: row.similarSpeciesId,
        score: row.score,
        reason: row.reason ?? '',
        name: row.name,
        latinName: row.latinName
      })));
    }).
    catch((e) => {
      if (!cancelled) setErr(e instanceof ApiError ? e.message : '加载相似品种失败');
    }).
    finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [speciesId]);

  useEffect(() => {
    if (!speciesId || query.trim().length < 1) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      api.get<SpeciesOption[]>(`/api/species?q=${encodeURIComponent(query.trim())}&limit=12&excludeId=${encodeURIComponent(speciesId)}`).
      then((rows) => {
        if (!cancelled) setOptions(rows);
      }).
      catch(() => {
        if (!cancelled) setOptions([]);
      }).
      finally(() => {
        if (!cancelled) setSearching(false);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, speciesId]);

  const selectedIds = useMemo(() => new Set(items.map((item) => item.similarSpeciesId)), [items]);

  const addOption = (option: SpeciesOption) => {
    if (selectedIds.has(option.id)) return;
    setItems((prev) => [
    ...prev,
    {
      similarSpeciesId: option.id,
      score: 80,
      reason: '',
      name: option.name,
      latinName: option.latinName
    }]
    );
    setQuery('');
    setOptions([]);
  };

  const save = async () => {
    if (!speciesId) return;
    setErr(null);
    setSaving(true);
    try {
      await api.put(`/api/admin/species/${speciesId}/similarities`, {
        syncReverse,
        items: items.map((item) => ({
          speciesId: item.similarSpeciesId,
          score: Number(item.score) || 80,
          reason: item.reason.trim()
        }))
      });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '保存相似品种失败');
    } finally {
      setSaving(false);
    }
  };

  if (!speciesId) {
    return <div className={cx(styles.r_5f22e64f, styles.r_ce27a834, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_7b89cd85)}>新建品种保存后再配置相似品种。</div>;
  }

  return (
    <div className={styles.r_6ed543e2}>
      {err && <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_b54428d1)}>{err}</div>}
      {loading && <div className={cx(styles.r_5f22e64f, styles.r_ce27a834, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_7b89cd85)}>加载中...</div>}

      <div className={styles.r_d89972fe}>
        <Input
          className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索中文名 / 拉丁名 / slug" />

        {(options.length > 0 || searching) &&
        <div className={cx(styles.r_da4dbfbc, styles.r_c78facc7, styles.r_d8cdcad2, styles.r_5e8a03e0, styles.r_145745bf, styles.r_b6b02c0e, styles.r_8aee2b07, styles.r_92bf82f4, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_06bbb431)}>
            {searching && <div className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_7b89cd85)}>搜索中...</div>}
            {options.map((option) =>
          <button
            key={option.id}
            type="button"
            disabled={selectedIds.has(option.id)}
            onClick={() => addOption(option)}
            className={cx(styles.r_0214b4b3, styles.r_6da6a3c3, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65, styles.r_5756b7b4, styles.r_5f533b3a, styles.r_b29d8adb)}>

                <div className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{option.name}</div>
                <div className={cx(styles.r_d058ca6d, styles.r_7b89cd85)}>{option.latinName} · {option.familySlug}/{option.genusSlug}</div>
              </button>
          )}
          </div>
        }
      </div>

      <div className={styles.r_6f7e013d}>
        {items.map((item, index) =>
        <div key={item.similarSpeciesId} className={cx(styles.r_f3c543ad, styles.r_5abf8245, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_7660b450)}>
            <div className={cx(styles.r_7e0b7cdf, styles.r_5f22e64f, styles.r_ce27a834, styles.r_0e17f2bd, styles.r_03b4dd7f)}>
              <div className={cx(styles.r_f283ea9b, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{item.name ?? item.similarSpeciesId}</div>
              {item.latinName && <div className={cx(styles.r_f283ea9b, styles.r_d058ca6d, styles.r_90665ca6, styles.r_7b89cd85)}>{item.latinName}</div>}
            </div>
            <Input
            type="number"
            min={1}
            max={100}
            className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
            value={item.score}
            onChange={(e) => setItems((prev) => prev.map((row, i) => i === index ? { ...row, score: Number(e.target.value) } : row))} />

            <Input
            className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f)}
            value={item.reason}
            onChange={(e) => setItems((prev) => prev.map((row, i) => i === index ? { ...row, reason: e.target.value } : row))}
            placeholder="相似理由" />

            <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
            className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_959f4a9f, styles.r_d5eab218, styles.r_660d2eff, styles.r_b54428d1, styles.r_85cfcc24)}>

              删除
            </button>
          </div>
        )}
      </div>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
        <label className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2, styles.r_02eb621e)}>
          <input type="checkbox" checked={syncReverse} onChange={(e) => setSyncReverse(e.target.checked)} />
          同步双向关系
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_72a4c7cd, styles.r_218d0c3a, styles.r_d463b664)}>

          {saving ? '保存中...' : '保存相似关系'}
        </button>
      </div>
    </div>);

}
