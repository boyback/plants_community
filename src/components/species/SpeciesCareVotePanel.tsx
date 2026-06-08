'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { optionsWithDefault, SPECIES_CARE_FIELDS, type SpeciesCareField } from '@/lib/species-care';

type CareVoteBucket = {
  total: number;
  options: Record<string, number>;
  myValue: string | null;
  users?: Array<{ id: string; name: string; avatar: string }>;
};

type CareVoteResp = {
  fields: Record<string, CareVoteBucket>;
  participantCount?: number;
};

type CareDefaults = Partial<Record<SpeciesCareField, string>>;

export type SpeciesCareProfile = {
  light: string;
  temperature: string;
  watering: string;
  hardiness: string;
  humidity: string;
  ventilation: string;
  soil: string;
  repotCycle: string;
  growthSeason: string;
  fertilizer: string;
  location: string;
  blooming: string;
  dormancy: string;
  fruiting: string;
  propagation: string;
};

export function SpeciesCareVotePanel({
  speciesId,
  defaults,
  profile,
}: {
  speciesId: string;
  defaults: CareDefaults;
  profile: SpeciesCareProfile;
}) {
  const { user } = useAuth();
  const [data, setData] = useState<CareVoteResp | null>(null);
  const [busyField, setBusyField] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<SpeciesCareField | null>(null);
  const [selectedValue, setSelectedValue] = useState('');
  const [showDetails, setShowDetails] = useState(true);

  const load = async () => {
    try {
      setData(await api.get<CareVoteResp>(`/api/species/${speciesId}/care-votes`));
    } catch {
      // Official defaults are enough to render the card.
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speciesId]);

  const submit = async (field: SpeciesCareField, value: string) => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }

    setBusyField(field);
    setErr(null);
    try {
      await api.post(`/api/species/${speciesId}/care-votes`, { field, value });
      await load();
      toast.success('已记录你的养护选择');
      return true;
    } catch (e) {
      const message = e instanceof ApiError ? e.message : '保存失败';
      setErr(message);
      toast.error(message);
      return false;
    } finally {
      setBusyField(null);
    }
  };

  const participantCount = data?.participantCount ?? 0;
  const summaryFields = SPECIES_CARE_FIELDS.map((config) => {
    const officialValue = defaults[config.field]?.trim() || config.fallback;
    const bucket = data?.fields[config.field];
    const topChoice = pickTopChoice(bucket);
    return {
      config,
      bucket,
      myValue: bucket?.myValue ?? null,
      officialValue,
      displayValue: topChoice?.value ?? officialValue,
      options: optionsWithDefault(config.options, officialValue),
    };
  });
  const editingSummary = summaryFields.find(({ config }) => config.field === editingField);

  const openEditor = (summary: (typeof summaryFields)[number]) => {
    setErr(null);
    setEditingField(summary.config.field);
    setSelectedValue(summary.myValue ?? summary.displayValue);
  };

  const closeEditor = () => {
    setEditingField(null);
    setSelectedValue('');
  };

  const confirmSelection = async () => {
    if (!editingSummary || !selectedValue) return;
    const ok = await submit(editingSummary.config.field, selectedValue);
    if (ok) closeEditor();
  };

  return (
    <div className="overflow-hidden rounded-[8px] border border-leaf-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-lg font-bold text-ink-900">养护参数</h2>
          <span className="grid h-4 w-4 place-items-center rounded-full border border-leaf-200 text-[10px] font-semibold text-leaf-700/70">
            i
          </span>
        </div>
        <div className="text-xs text-leaf-700/60">
          基于 <span className="font-semibold text-leaf-700">{participantCount}</span> 位花友反馈
        </div>
      </div>

      <div className="grid gap-px border-y border-leaf-100 bg-leaf-100 sm:grid-cols-2 lg:grid-cols-3">
        {summaryFields.map((summary) => {
          const { config, bucket, displayValue, myValue } = summary;

          return (
            <div
              key={config.field}
              className="grid min-h-[82px] grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-2 bg-white px-4 py-3 text-left transition hover:bg-leaf-50"
            >
              <span className="grid h-9 w-9 place-items-center rounded-[6px] bg-leaf-50">
                <img src={config.iconSrc} alt="" className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink-900">{config.label}</span>
                <span className="mt-0.5 block truncate text-sm font-semibold text-leaf-700">{displayValue}</span>
                <span className="mt-0.5 block text-[10px] text-ink-400">
                  {bucket?.total ? `${bucket.total} 人选择` : '官方建议'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => openEditor(summary)}
                className={cn(
                  'h-8 rounded-[6px] border px-3 text-xs font-semibold transition',
                  myValue
                    ? 'border-leaf-600 bg-leaf-600 text-white hover:bg-leaf-700'
                    : 'border-leaf-100 bg-white text-leaf-700 hover:border-leaf-200 hover:bg-leaf-50',
                )}
              >
                {myValue ? '调整' : '选择'}
              </button>
            </div>
          );
        })}
      </div>

      <Dialog
        open={Boolean(editingSummary)}
        onClose={closeEditor}
        title={editingSummary ? `选择${editingSummary.config.label}` : '选择养护参数'}
        maxWidth="sm"
        actions={
          <>
            <button
              type="button"
              onClick={closeEditor}
              className="flex-1 rounded-[6px] border border-leaf-100 bg-white px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-leaf-50"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!selectedValue || Boolean(editingField && busyField === editingField)}
              onClick={() => void confirmSelection()}
              className="flex-1 rounded-[6px] bg-leaf-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-leaf-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editingField && busyField === editingField ? '保存中...' : '保存选择'}
            </button>
          </>
        }
      >
        {editingSummary && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-[6px] bg-leaf-50 px-3 py-2">
              <span className="grid h-9 w-9 place-items-center rounded-[6px] bg-white">
                <img src={editingSummary.config.iconSrc} alt="" className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-ink-900">{editingSummary.config.label}</div>
                <div className="mt-0.5 text-xs text-leaf-700/70">
                  当前显示: {editingSummary.displayValue}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {editingSummary.options.map((option) => {
                const count = editingSummary.bucket?.options[option] ?? 0;
                const percent = editingSummary.bucket?.total ? Math.round((count / editingSummary.bucket.total) * 100) : 0;
                const checked = selectedValue === option;

                return (
                  <label
                    key={option}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-[6px] border px-3 py-2.5 transition',
                      checked
                        ? 'border-leaf-600 bg-leaf-50 text-leaf-800'
                        : 'border-leaf-100 bg-white text-ink-700 hover:border-leaf-200 hover:bg-leaf-50',
                    )}
                  >
                    <input
                      type="radio"
                      name={`care-${editingSummary.config.field}`}
                      value={option}
                      checked={checked}
                      onChange={() => setSelectedValue(option)}
                      className="h-4 w-4 accent-leaf-600"
                    />
                    <span className="min-w-0 flex-1 font-medium">{option}</span>
                    <span className="shrink-0 text-xs text-ink-400">
                      {count > 0 ? `${count} 人 · ${percent}%` : '可选'}
                    </span>
                  </label>
                );
              })}
            </div>

            {editingSummary.myValue && (
              <div className="text-[11px] text-leaf-700/70">
                你当前选择了 <span className="font-medium text-leaf-700">{editingSummary.myValue}</span>
              </div>
            )}
          </div>
        )}
      </Dialog>
      {showDetails && (
        <div className="grid border-b border-leaf-100 md:grid-cols-2">
          <CareDetailGroup
            iconSrc="/icons/09_environment_module.svg"
            title="环境要求"
            items={[
              { iconSrc: '/icons/02_light_sun.svg', label: '光照', value: profile.light },
              { iconSrc: '/icons/03_temperature.svg', label: '温度', value: profile.temperature },
              { iconSrc: '/icons/04_watering_drop.svg', label: '浇水方式', value: profile.watering },
              { iconSrc: '/icons/05_cold_snowflake.svg', label: '耐寒最低', value: profile.hardiness },
              { iconSrc: '/icons/07_humidity_percent.svg', label: '湿度范围', value: profile.humidity },
              { iconSrc: '/icons/08_ventilation_wind.svg', label: '通风需求', value: profile.ventilation },
            ]}
          />
          <CareDetailGroup
            iconSrc="/icons/10_potting_advice_module.svg"
            title="栽培建议"
            items={[
              { iconSrc: '/icons/13_soil_mix.svg', label: '配土建议', value: profile.soil },
              { iconSrc: '/icons/14_repot_cycle.svg', label: '换盆周期', value: profile.repotCycle },
              { iconSrc: '/icons/06_growth_speed.svg', label: '生长速度', value: profile.growthSeason },
              { iconSrc: '/icons/15_fertilizer.svg', label: '施肥建议', value: profile.fertilizer },
              { iconSrc: '/icons/16_location.svg', label: '摆放位置', value: profile.location },
            ]}
          />
          <CareDetailGroup
            iconSrc="/icons/11_growth_cycle_module.svg"
            title="生长周期"
            items={[
              { iconSrc: '/icons/17_flowering.svg', label: '花期', value: profile.blooming },
              { iconSrc: '/icons/18_dormancy_moon.svg', label: '休眠期', value: profile.dormancy },
              { iconSrc: '/icons/19_fruiting.svg', label: '结果期', value: profile.fruiting },
              { iconSrc: '/icons/20_propagation.svg', label: '繁殖方式', value: profile.propagation },
            ]}
          />
          <div className="border-t border-leaf-100 p-4 md:border-l">
            <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-900">
              <img src="/icons/12_community_consensus_module.svg" alt="" className="h-4 w-4" />
              花友经验共识
            </div>
            <div className="space-y-2">
              {summaryFields.slice(0, 5).map(({ config, bucket, displayValue }, index) => (
                <CareVoteBar
                  key={config.field}
                  label={config.label}
                  value={displayValue}
                  count={bucket?.total ?? 0}
                  tone={index}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {!user && (
        <div className="mx-4 mt-3 rounded-[6px] bg-leaf-50 px-3 py-2 text-[11px] text-leaf-700/70">
          <Link href="/login" className="text-leaf-700 underline">登录</Link> 后参与养护参数选择
        </div>
      )}
      {err && <div className="mx-4 mt-3 rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-rose-700">{err}</div>}
    </div>
  );
}

function CareDetailGroup({
  iconSrc,
  title,
  items,
}: {
  iconSrc: string;
  title: string;
  items: Array<{ iconSrc: string; label: string; value: string }>;
}) {
  return (
    <div className="border-t border-leaf-100 p-4 md:border-l md:first:border-l-0">
      <div className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-900">
        <img src={iconSrc} alt="" className="h-4 w-4" />
        {title}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={`${item.label}-${item.value}`} className="grid grid-cols-[16px_70px_minmax(0,1fr)] items-center gap-2 text-xs">
            <img src={item.iconSrc} alt="" className="h-3.5 w-3.5" />
            <span className="text-ink-500">{item.label}:</span>
            <span className="truncate text-ink-800">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CareVoteBar({
  label,
  value,
  count,
  tone,
}: {
  label: string;
  value: string;
  count: number;
  tone: number;
}) {
  const colors = ['bg-leaf-500', 'bg-sky-500', 'bg-orange-500', 'bg-violet-500', 'bg-teal-500'];
  const width = count > 0 ? Math.min(100, Math.max(24, count * 12)) : 36;

  return (
    <div className="grid grid-cols-[58px_minmax(0,1fr)_56px] items-center gap-2 text-xs">
      <span className="flex items-center gap-1 text-ink-500">
        {label}:
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-16 truncate text-ink-800">{value}</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
          <span className={cn('block h-full rounded-full', colors[tone % colors.length])} style={{ width: `${width}%` }} />
        </span>
      </div>
      <span className="text-right text-ink-500">{count}票</span>
    </div>
  );
}

function pickTopChoice(bucket: CareVoteBucket | undefined) {
  if (!bucket?.total) return null;

  return Object.entries(bucket.options)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
    .map(([value, count]) => ({ value, count }))[0] ?? null;
}
