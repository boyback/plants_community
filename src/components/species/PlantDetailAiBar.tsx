'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api, ApiError } from '@/lib/client-api';

export function PlantDetailAiBar({
  speciesId,
  name,
}: {
  speciesId: string;
  name: string;
}) {
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
      const res = await api.post<{ answer: string }>(`/api/species/${speciesId}/ai`, { question: q });
      setAnswer(res.answer);
    } catch (e) {
      setAnswer(e instanceof ApiError ? e.message : 'AI 图鉴助手暂时无法回答，请稍后再试。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-[292px] right-4 z-30 hidden rounded-2xl border border-leaf-100 bg-white/94 p-3 shadow-[0_16px_44px_rgba(39,65,35,0.14)] backdrop-blur lg:block">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-leaf-50 text-3xl">AI</span>
        <div className="w-52 shrink-0">
          <div className="font-bold text-ink-900">AI 图鉴助手</div>
          <div className="mt-1 text-xs text-ink-500">有任何关于 {name} 的问题都可以问我。</div>
        </div>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {qs.map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy}
              onClick={() => void ask(q)}
              className="shrink-0 rounded-full border border-leaf-100 px-4 py-2 text-xs text-ink-700 hover:bg-leaf-50 disabled:opacity-60"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex h-11 w-[320px] shrink-0 items-center gap-2 rounded-full border border-leaf-100 bg-white px-4"
          onSubmit={(e) => {
            e.preventDefault();
            void ask();
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-700 outline-none placeholder:text-ink-400"
            placeholder="输入你的问题..."
          />
          <button type="submit" disabled={busy || !question.trim()} className="grid h-8 w-8 place-items-center rounded-full bg-leaf-600 text-white disabled:opacity-50">
            <Icon name="send" size={14} />
          </button>
        </form>
      </div>
      {answer && (
        <div className="mt-3 rounded-xl bg-leaf-50 px-4 py-3 text-sm leading-6 text-ink-700">
          {answer}
        </div>
      )}
    </div>
  );
}
