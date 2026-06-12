'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api, ApiError } from "@/lib/client-api";
import styles from './SpeciesAiQuestionBox.module.scss';
import { cx } from '@/lib/style-utils';



export function SpeciesAiQuestionBox({
  speciesId,
  speciesName,
  quickQuestions = []




}: {speciesId: string;speciesName: string;quickQuestions?: string[];}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    try {
      const res = await api.post<{answer: string;source: string;model?: string;}>(`/api/species/${speciesId}/ai`, { question: q });
      setAnswer(res.answer);
    } catch (e) {
      setAnswer(e instanceof ApiError ? e.message : 'AI 暂时无法回答，请稍后再试。');
    } finally {
      setBusy(false);
    }
  };

  const askQuick = async (q: string) => {
    setOpen(true);
    setQuestion(q);
    setAnswer('');
    setBusy(true);
    try {
      const res = await api.post<{answer: string;source: string;model?: string;}>(`/api/species/${speciesId}/ai`, { question: q });
      setAnswer(res.answer);
    } catch (e) {
      setAnswer(e instanceof ApiError ? e.message : 'AI 暂时无法回答，请稍后再试。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.r_0ab86672}>
      {quickQuestions.length > 0 &&
      <div className={cx(styles.r_da019856, styles.r_6f7e013d)}>
          {quickQuestions.map((question) =>
        <button
          key={question}
          type="button"
          onClick={() => void askQuick(question)}
          className={cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_a3ea7347, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65, styles.r_fc7473ca, styles.r_eb6abb1f, styles.r_5756b7b4)}>

              <Icon name="check-circle" size={13} className={styles.r_66a36c90} />
              {question}
            </button>
        )}
        </div>
      }
      {!open ?
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_a217b4ea, styles.r_6bceb016, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_e269e58c)}>

          问 AI 这个品种
          <Icon name="arrow-right" size={13} />
        </button> :

      <div className={cx(styles.r_6f7e013d, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_7660b450)}>
          <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`问问 ${speciesName} 的养护问题`}
          className={cx(styles.r_3f2a1ff6, styles.r_6da6a3c3, styles.r_6aef3201, styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_df37b1fd, styles.r_0f3af40e, styles.r_177ce78a)}
          maxLength={300} />

          <div className={cx(styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
            <button type="button" onClick={() => setOpen(false)} className={cx(styles.r_5f22e64f, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_7b89cd85, styles.r_5399e21f)}>
              收起
            </button>
            <button
            type="button"
            disabled={busy || !question.trim()}
            onClick={() => void ask()}
            className={cx(styles.r_5f22e64f, styles.r_6bceb016, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_e269e58c, styles.r_d463b664)}>

              {busy ? '回答中...' : '发送'}
            </button>
          </div>
          {answer && <div className={cx(styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_7054e276, styles.r_eb6abb1f)}>{answer}</div>}
        </div>
      }
    </div>);

}