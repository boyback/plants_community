'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import { optionsWithDefault, SPECIES_CARE_FIELDS, type SpeciesCareField } from "@/lib/species-care";
import styles from './SpeciesCareVotePanel.module.scss';
import { cx } from '@/lib/style-utils';



type CareVoteBucket = {
  total: number;
  options: Record<string, number>;
  myValue: string | null;
  users?: Array<{id: string;name: string;avatar: string;}>;
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
  profile




}: {speciesId: string;defaults: CareDefaults;profile: SpeciesCareProfile;}) {
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
    }};useEffect(() => {void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [speciesId]);const submit = async (field: SpeciesCareField, value: string) => {if (!user) {window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);return false;}

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
      options: optionsWithDefault(config.options, officialValue)
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
    <Card padding="none" className={styles.careCard}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3, styles.r_8e63407b)}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e)}>
          <h2 className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_4ddaa618)}>养护参数</h2>
          <span className={cx(styles.r_f3c543ad, styles.r_11e59c6d, styles.r_dc7972eb, styles.r_67d66567, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_1dc571a3, styles.r_e83a7042, styles.r_69335b95)}>
            i
          </span>
        </div>
        <div className={cx(styles.r_359090c2, styles.r_6c4cc49e)}>
          基于 <span className={cx(styles.r_e83a7042, styles.r_5f6a59f1)}>{participantCount}</span> 位花友反馈
        </div>
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_ceb7ac66, styles.r_8b819609, styles.r_88b684d2, styles.r_f2b23104, styles.r_e00ad816, styles.r_19d9b25e)}>
        {summaryFields.map((summary) => {
          const { config, bucket, displayValue, myValue } = summary;

          return (
            <div
              key={config.field}
              className={cx(styles.r_f3c543ad, styles.r_887b5c70, styles.r_cebaa2c8, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_5e10cdb8, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65, styles.r_56bf8ae8, styles.r_5756b7b4)}>

              <span className={cx(styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_67d66567, styles.r_c10ff8c0, styles.r_7ebecbb6)}>
                <img src={config.iconSrc} alt="" className={cx(styles.r_f6fe9024, styles.r_7ec10f86)} />
              </span>
              <span className={styles.r_7e0b7cdf}>
                <span className={cx(styles.r_0214b4b3, styles.r_fc7473ca, styles.r_69450ef1, styles.r_4ddaa618)}>{config.label}</span>
                <span className={cx(styles.r_15e1b1f4, styles.r_0214b4b3, styles.r_f283ea9b, styles.r_fc7473ca, styles.r_e83a7042, styles.r_5f6a59f1)}>{displayValue}</span>
                <span className={cx(styles.r_15e1b1f4, styles.r_0214b4b3, styles.r_1dc571a3, styles.r_66a36c90)}>
                  {bucket?.total ? `${bucket.total} 人选择` : '官方建议'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => openEditor(summary)}
                className={cn(cx(styles.r_ed8a5df7, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_359090c2, styles.r_e83a7042, styles.r_56bf8ae8),

                myValue ? cx(styles.r_3bd65fe8, styles.r_6bceb016, styles.r_72a4c7cd, styles.r_e269e58c) : cx(styles.r_88b684d2, styles.r_5e10cdb8, styles.r_5f6a59f1, styles.r_5aae3db6, styles.r_5756b7b4)


                )}>

                {myValue ? '调整' : '选择'}
              </button>
            </div>);

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
            className={cx(styles.r_36e579c0, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_2689f395, styles.r_02eb621e, styles.r_56bf8ae8, styles.r_5756b7b4)}>

              取消
            </button>
            <button
            type="button"
            disabled={!selectedValue || Boolean(editingField && busyField === editingField)}
            onClick={() => void confirmSelection()}
            className={cx(styles.r_36e579c0, styles.r_c10ff8c0, styles.r_6bceb016, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_2689f395, styles.r_72a4c7cd, styles.r_56bf8ae8, styles.r_e269e58c, styles.r_5f533b3a, styles.r_d463b664)}>

              {editingField && busyField === editingField ? '保存中...' : '保存选择'}
            </button>
          </>
        }>

        {editingSummary &&
        <div className={styles.r_6ed543e2}>
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_c10ff8c0, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f)}>
              <span className={cx(styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_67d66567, styles.r_c10ff8c0, styles.r_5e10cdb8)}>
                <img src={editingSummary.config.iconSrc} alt="" className={cx(styles.r_f6fe9024, styles.r_7ec10f86)} />
              </span>
              <div className={styles.r_7e0b7cdf}>
                <div className={cx(styles.r_e83a7042, styles.r_4ddaa618)}>{editingSummary.config.label}</div>
                <div className={cx(styles.r_15e1b1f4, styles.r_359090c2, styles.r_69335b95)}>
                  当前显示: {editingSummary.displayValue}
                </div>
              </div>
            </div>

            <div className={styles.r_6f7e013d}>
              {editingSummary.options.map((option) => {
              const count = editingSummary.bucket?.options[option] ?? 0;
              const percent = editingSummary.bucket?.total ? Math.round(count / editingSummary.bucket.total * 100) : 0;
              const checked = selectedValue === option;

              return (
                <label
                  key={option}
                  className={cn(cx(styles.r_60fbb771, styles.r_34516836, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_e7ee55ac, styles.r_56bf8ae8),

                  checked ? cx(styles.r_3bd65fe8, styles.r_7ebecbb6, styles.r_e7eab4cb) : cx(styles.r_88b684d2, styles.r_5e10cdb8, styles.r_eb6abb1f, styles.r_5aae3db6, styles.r_5756b7b4)


                  )}>

                    <input
                    type="radio"
                    name={`care-${editingSummary.config.field}`}
                    value={option}
                    checked={checked}
                    onChange={() => setSelectedValue(option)}
                    className={cx(styles.r_11e59c6d, styles.r_dc7972eb, styles.r_aea3b3b7)} />

                    <span className={cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_2689f395)}>{option}</span>
                    <span className={cx(styles.r_012fbd12, styles.r_359090c2, styles.r_66a36c90)}>
                      {count > 0 ? `${count} 人 · ${percent}%` : '可选'}
                    </span>
                  </label>);

            })}
            </div>

            {editingSummary.myValue &&
          <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>
                你当前选择了 <span className={cx(styles.r_2689f395, styles.r_5f6a59f1)}>{editingSummary.myValue}</span>
              </div>
          }
          </div>
        }
      </Dialog>
      {showDetails &&
      <div className={cx(styles.r_f3c543ad, styles.r_65fdbade, styles.r_88b684d2, styles.r_e4d6f343)}>
          <CareDetailGroup
          iconSrc="/icons/09_environment_module.svg"
          title="环境要求"
          items={[
          { iconSrc: '/icons/02_light_sun.svg', label: '光照', value: profile.light },
          { iconSrc: '/icons/03_temperature.svg', label: '温度', value: profile.temperature },
          { iconSrc: '/icons/04_watering_drop.svg', label: '浇水方式', value: profile.watering },
          { iconSrc: '/icons/05_cold_snowflake.svg', label: '耐寒最低', value: profile.hardiness },
          { iconSrc: '/icons/07_humidity_percent.svg', label: '湿度范围', value: profile.humidity },
          { iconSrc: '/icons/08_ventilation_wind.svg', label: '通风需求', value: profile.ventilation }]
          } />

          <CareDetailGroup
          iconSrc="/icons/10_potting_advice_module.svg"
          title="栽培建议"
          items={[
          { iconSrc: '/icons/13_soil_mix.svg', label: '配土建议', value: profile.soil },
          { iconSrc: '/icons/14_repot_cycle.svg', label: '换盆周期', value: profile.repotCycle },
          { iconSrc: '/icons/06_growth_speed.svg', label: '生长速度', value: profile.growthSeason },
          { iconSrc: '/icons/15_fertilizer.svg', label: '施肥建议', value: profile.fertilizer },
          { iconSrc: '/icons/16_location.svg', label: '摆放位置', value: profile.location }]
          } />

          <CareDetailGroup
          iconSrc="/icons/11_growth_cycle_module.svg"
          title="生长周期"
          items={[
          { iconSrc: '/icons/17_flowering.svg', label: '花期', value: profile.blooming },
          { iconSrc: '/icons/18_dormancy_moon.svg', label: '休眠期', value: profile.dormancy },
          { iconSrc: '/icons/19_fruiting.svg', label: '结果期', value: profile.fruiting },
          { iconSrc: '/icons/20_propagation.svg', label: '繁殖方式', value: profile.propagation }]
          } />

          <div className={cx(styles.r_b950dda2, styles.r_88b684d2, styles.r_8e63407b, styles.r_f2be128d)}>
            <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e, styles.r_fc7473ca, styles.r_69450ef1, styles.r_4ddaa618)}>
              <img src="/icons/12_community_consensus_module.svg" alt="" className={cx(styles.r_11e59c6d, styles.r_dc7972eb)} />
              花友经验共识
            </div>
            <div className={styles.r_6f7e013d}>
              {summaryFields.slice(0, 5).map(({ config, bucket, displayValue }, index) =>
            <CareVoteBar
              key={config.field}
              label={config.label}
              value={displayValue}
              count={bucket?.total ?? 0}
              tone={index} />

            )}
            </div>
          </div>
        </div>
      }

      {!user &&
      <div className={cx(styles.r_3a22f30b, styles.r_eccd13ef, styles.r_c10ff8c0, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_d058ca6d, styles.r_69335b95)}>
          <Link href="/login" className={cx(styles.r_5f6a59f1, styles.r_c82b67c8)}>登录</Link> 后参与养护参数选择
        </div>
      }
      {err && <div className={cx(styles.r_3a22f30b, styles.r_eccd13ef, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_b54428d1)}>{err}</div>}
    </Card>);

}

function CareDetailGroup({
  iconSrc,
  title,
  items




}: {iconSrc: string;title: string;items: Array<{iconSrc: string;label: string;value: string;}>;}) {
  return (
    <div className={cx(styles.r_b950dda2, styles.r_88b684d2, styles.r_8e63407b, styles.r_f2be128d, styles.r_6131404e)}>
      <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e, styles.r_fc7473ca, styles.r_69450ef1, styles.r_4ddaa618)}>
        <img src={iconSrc} alt="" className={cx(styles.r_11e59c6d, styles.r_dc7972eb)} />
        {title}
      </div>
      <div className={styles.r_6f7e013d}>
        {items.map((item) =>
        <div key={`${item.label}-${item.value}`} className={cx(styles.r_f3c543ad, styles.r_7f62d6b5, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2)}>
            <img src={item.iconSrc} alt="" className={cx(styles.r_7fc7f732, styles.r_bf600f8e)} />
            <span className={styles.r_7b89cd85}>{item.label}:</span>
            <span className={cx(styles.r_f283ea9b, styles.r_399e11a5)}>{item.value}</span>
          </div>
        )}
      </div>
    </div>);

}

function CareVoteBar({
  label,
  value,
  count,
  tone





}: {label: string;value: string;count: number;tone: number;}) {
  const colors = [styles.r_45499621, styles.r_fcdeb311, styles.r_d0adf729, styles.r_aea07fd2, styles.r_4b68e768];
  const width = count > 0 ? Math.min(100, Math.max(24, count * 12)) : 36;

  return (
    <div className={cx(styles.r_f3c543ad, styles.r_452679f4, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2)}>
      <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_7b89cd85)}>
        {label}:
      </span>
      <div className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_3960ffc2, styles.r_77a2a20e)}>
        <span className={cx(styles.r_baceed34, styles.r_f283ea9b, styles.r_399e11a5)}>{value}</span>
        <span className={cx(styles.r_095acb27, styles.r_36e579c0, styles.r_2cd02d11, styles.r_ac204c10, styles.r_febec8f2)}>
          <span className={cn(cx(styles.r_0214b4b3, styles.r_668b21aa, styles.r_ac204c10), colors[tone % colors.length])} style={{ width: `${width}%` }} />
        </span>
      </div>
      <span className={cx(styles.r_308fc069, styles.r_7b89cd85)}>{count}票</span>
    </div>);

}

function pickTopChoice(bucket: CareVoteBucket | undefined) {
  if (!bucket?.total) return null;

  return Object.entries(bucket.options).
  sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN")).
  map(([value, count]) => ({ value, count }))[0] ?? null;
}
