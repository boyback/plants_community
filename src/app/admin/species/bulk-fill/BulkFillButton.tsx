'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import styles from './BulkFillButton.module.scss';
import { cx } from '@/lib/style-utils';



type BoardOption = {id: string;name: string;};
type GenusOption = {id: string;name: string;boardId: string;};
type Candidate = {id: string;name: string;group: string;fields: string[];};
type Result = {scanned: number;updated: number;candidates: Candidate[];};

const fields = [
["growthSpeed", '生长速度'],
['summerDormancy', '夏眠'],
['lightRequirement', '光照需求'],
['idealTemperature', '适宜温度'],
['minTemperature', '最低温度'],
['maxTemperature', '最高温度'],
['humidity', '适宜湿度'],
['soil', '配土建议'],
['riskTips', 'AI 风险提示']] as
const;

export function BulkFillButton({
  boards,
  genera



}: {boards: BoardOption[];genera: GenusOption[];}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [boardId, setBoardId] = useState('');
  const [genusId, setGenusId] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>(fields.map(([key]) => key));
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState('');
  const visibleGenera = useMemo(() => genera.filter((item) => !boardId || item.boardId === boardId), [boardId, genera]);

  const submit = async (dryRun: boolean) => {
    if (busy) return;
    if (!dryRun) {
      const ok = window.confirm('确认批量补齐空缺字段？已有字段不会被覆盖。');
      if (!ok) return;
    }
    setBusy(true);
    setMessage('');
    try {
      const res = await api.post<Result>("/api/admin/species/bulk-fill", {
        dryRun,
        boardId: boardId || undefined,
        genusId: genusId || undefined,
        fields: selectedFields
      });
      setResult(res);
      setMessage(dryRun ? `预览完成：扫描 ${res.scanned} 个品种，命中 ${res.candidates.length} 个候选。` : `执行完成：扫描 ${res.scanned} 个品种，更新 ${res.updated} 个品种。`);
      if (!dryRun) router.refresh();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : '批量补数据失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cx(styles.r_3e7ce58d, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_67d2289d, styles.r_8e63407b)}>
      <div>
        <div className={cx(styles.r_e83a7042, styles.r_67e74965)}>批量补齐默认养护字段</div>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7054e276, styles.r_5c6230d2)}>只处理空字段。建议先预览，再执行。</p>
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_e4d6f343)}>
        <label className={cx(styles.r_359090c2, styles.r_67e74965)}>
          <span className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_2689f395)}>科</span>
          <select value={boardId} onChange={(e) => {setBoardId(e.target.value);setGenusId('');}} className={cx(styles.r_e7a768f9, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_5e10cdb8, styles.r_d5eab218)}>
            <option value="">全部科</option>
            {boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
          </select>
        </label>
        <label className={cx(styles.r_359090c2, styles.r_67e74965)}>
          <span className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_2689f395)}>属</span>
          <select value={genusId} onChange={(e) => setGenusId(e.target.value)} className={cx(styles.r_e7a768f9, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_5e10cdb8, styles.r_d5eab218)}>
            <option value="">全部属</option>
            {visibleGenera.map((genus) => <option key={genus.id} value={genus.id}>{genus.name}</option>)}
          </select>
        </label>
      </div>

      <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
        {fields.map(([key, label]) =>
        <label key={key} className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_67e74965)}>
            <input
            type="checkbox"
            checked={selectedFields.includes(key)}
            onChange={(e) => setSelectedFields((prev) => e.target.checked ? [...prev, key] : prev.filter((item) => item !== key))} />

            {label}
          </label>
        )}
      </div>

      <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
        <button type="button" disabled={busy || selectedFields.length === 0} onClick={() => void submit(true)} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_06f216a1, styles.r_5e10cdb8, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_359090c2, styles.r_e83a7042, styles.r_5c6230d2, styles.r_fab25b39, styles.r_d463b664)}>
          {busy ? '处理中...' : '预览'}
        </button>
        <button type="button" disabled={busy || selectedFields.length === 0} onClick={() => void submit(false)} className={cx(styles.r_5f22e64f, styles.r_4bd8a886, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_359090c2, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_cb937e70, styles.r_d463b664)}>
          执行补齐
        </button>
      </div>

      {message && <div className={cx(styles.r_359090c2, styles.r_67e74965)}>{message}</div>}
      {result?.candidates.length ?
      <div className={cx(styles.r_8aee2b07, styles.r_73fc3fb1, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_d85e2a6f, styles.r_5e10cdb8)}>
          <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
            <tbody>
              {result.candidates.map((item) =>
            <tr key={item.id} className={cx(styles.r_b950dda2, styles.r_5abe4b85, styles.r_989347cb)}>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2689f395, styles.r_399e11a5)}>{item.name}</td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_7b89cd85)}>{item.group}</td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_5c6230d2)}>{item.fields.join(', ')}</td>
                </tr>
            )}
            </tbody>
          </table>
        </div> :
      null}
    </div>);

}