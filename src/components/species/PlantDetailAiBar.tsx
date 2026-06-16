'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api, ApiError } from "@/lib/client-api";
import styles from './PlantDetailAiBar.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



export function PlantDetailAiBar({
  speciesId,
  name



}: {speciesId: string;name: string;}) {
  const qs = [`${name}为什么叶尖发红?`, `${name}夏天如何养护?`, `${name}怎么快速爆盆?`, `${name}和相似品种区别?`];
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async (text = question) => {
    const q = text.trim();
    if (!q || busy) return;
    setQuestion(q);
    setBusy(true);
    try {
      const res = await api.post<{answer: string;}>(`/api/species/${speciesId}/ai`, { question: q });
      setAnswer(res.answer);
    } catch (e) {
      setAnswer(e instanceof ApiError ? e.message : 'AI 图鉴助手暂时无法回答，请稍后再试。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cx(styles.r_7bc55599, styles.r_c1b9bd61, styles.r_cbe9a3cb, styles.r_5a438c30, styles.r_0f2fff0a, styles.r_99d72c7f, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_b49f72a9, styles.r_eb6e8b88, styles.r_ea4112ba, styles.r_0b2e8c28, styles.r_d0ce7c24)}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_0c3bc985)}>
        <span className={cx(styles.r_f3c543ad, styles.r_73a13409, styles.r_7e74e5fe, styles.r_012fbd12, styles.r_67d66567, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_751fb0d1)}>AI</span>
        <div className={cx(styles.r_a26e37b0, styles.r_012fbd12)}>
          <div className={cx(styles.r_69450ef1, styles.r_4ddaa618)}>AI 图鉴助手</div>
          <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>有任何关于 {name} 的问题都可以问我。</div>
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_77a2a20e, styles.r_1384f66f)}>
          {qs.map((q) =>
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => void ask(q)}
            className={cx(styles.r_012fbd12, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_359090c2, styles.r_eb6abb1f, styles.r_5756b7b4, styles.r_d463b664)}>

              {q}
            </button>
          )}
        </div>
        <form
          className={cx(styles.r_60fbb771, styles.r_f82f0c25, styles.r_57f3afcd, styles.r_012fbd12, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_f0faeb26)}
          onSubmit={(e) => {
            e.preventDefault();
            void ask();
          }}>

          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className={cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_7f19cdf4, styles.r_fc7473ca, styles.r_eb6abb1f, styles.r_df37b1fd, styles.r_e4a886d4)}
            placeholder="输入你的问题..." />

          <button type="submit" disabled={busy || !question.trim()} className={cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_67d66567, styles.r_ac204c10, styles.r_6bceb016, styles.r_72a4c7cd, styles.r_b29d8adb)}>
            <Icon name="send" size={14} />
          </button>
        </form>
      </div>
      {answer &&
      <div className={cx(styles.r_eccd13ef, styles.r_a217b4ea, styles.r_7ebecbb6, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_18550d59, styles.r_eb6abb1f)}>
          {answer}
        </div>
      }
    </div>);

}
