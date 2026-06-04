'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api, ApiError } from '@/lib/client-api';

export function SpeciesAiQuestionBox({
  speciesId,
  speciesName,
  quickQuestions = [],
}: {
  speciesId: string;
  speciesName: string;
  quickQuestions?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    try {
      const res = await api.post<{ answer: string; source: string; model?: string }>(`/api/species/${speciesId}/ai`, { question: q });
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
      const res = await api.post<{ answer: string; source: string; model?: string }>(`/api/species/${speciesId}/ai`, { question: q });
      setAnswer(res.answer);
    } catch (e) {
      setAnswer(e instanceof ApiError ? e.message : 'AI 暂时无法回答，请稍后再试。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      {quickQuestions.length > 0 && (
        <div className="mb-4 space-y-2">
          {quickQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => void askQuick(question)}
              className="flex w-full items-center gap-2 rounded-xl border border-leaf-100 bg-sand-50/80 px-4 py-3 text-left text-sm text-ink-700 hover:bg-leaf-50"
            >
              <Icon name="check-circle" size={13} className="text-ink-400" />
              {question}
            </button>
          ))}
        </div>
      )}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-xl bg-leaf-600 px-3 py-2 text-xs font-semibold text-white hover:bg-leaf-700"
        >
          问 AI 这个品种
          <Icon name="arrow-right" size={13} />
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-leaf-100 bg-white p-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`问问 ${speciesName} 的养护问题`}
            className="min-h-20 w-full resize-none rounded-lg bg-leaf-50 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-leaf-300"
            maxLength={300}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs text-ink-500 hover:bg-ink-50">
              收起
            </button>
            <button
              type="button"
              disabled={busy || !question.trim()}
              onClick={() => void ask()}
              className="rounded-lg bg-leaf-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-leaf-700 disabled:opacity-60"
            >
              {busy ? '回答中...' : '发送'}
            </button>
          </div>
          {answer && <div className="rounded-lg bg-leaf-50 px-3 py-2 text-xs leading-5 text-ink-700">{answer}</div>}
        </div>
      )}
    </div>
  );
}
