import type { JournalStage, JournalEndReason } from './types';

/** 阶段元信息:emoji + 颜色 + 中文 fallback。i18n key: journal.stage.<key> */
export const STAGE_META: Record<string, { emoji: string; zh: string; color: string }> = {
  germinate: { emoji: '🌱', zh: '发芽', color: 'journal-stage journal-stage--germinate' },
  growing: { emoji: '🌿', zh: '成长', color: 'journal-stage journal-stage--growing' },
  flowering: { emoji: '🌸', zh: '开花', color: 'journal-stage journal-stage--flowering' },
  fruiting: { emoji: '🍒', zh: '结果', color: 'journal-stage journal-stage--fruiting' },
  withering: { emoji: '🥀', zh: '枯萎', color: 'journal-stage journal-stage--withering' },
  repot: { emoji: '🪴', zh: '换盆', color: 'journal-stage journal-stage--repot' },
  cutting: { emoji: '✂️', zh: '扦插', color: 'journal-stage journal-stage--cutting' },
  summer: { emoji: '☀️', zh: '度夏', color: 'journal-stage journal-stage--summer' },
  winter: { emoji: '❄️', zh: '越冬', color: 'journal-stage journal-stage--winter' },
  pest: { emoji: '🐛', zh: '虫害', color: 'journal-stage journal-stage--pest' },
  watering: { emoji: '💧', zh: '浇水', color: 'journal-stage journal-stage--watering' },
  other: { emoji: '📌', zh: '其他', color: 'journal-stage journal-stage--other' },
};

export const ALL_STAGES: JournalStage[] = [
  'germinate',
  'growing',
  'flowering',
  'fruiting',
  'withering',
  'repot',
  'cutting',
  'summer',
  'winter',
  'pest',
  'watering',
  'other',
];

export const END_REASON_META: Record<JournalEndReason, { emoji: string; zh: string }> = {
  alive: { emoji: '🌱', zh: '仍在养' },
  withered: { emoji: '🥀', zh: '枯死' },
  gifted: { emoji: '🎁', zh: '送人' },
  finished: { emoji: '✅', zh: '正常结束' },
  other: { emoji: '📌', zh: '其他' },
};

export function isKnownJournalStage(value: unknown): value is JournalStage {
  return typeof value === 'string' && (ALL_STAGES as string[]).includes(value);
}

export function normalizeJournalStages(input: unknown, fallback?: JournalStage | string | null): JournalStage[] {
  const raw = Array.isArray(input) ? input : typeof input === 'string' ? [input] : [];
  const stages = raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  if (stages.length > 0) return Array.from(new Set(stages));
  return typeof fallback === 'string' && fallback.trim() ? [fallback.trim()] : [];
}

export function parseJournalStages(value: unknown, fallback?: JournalStage | string | null): JournalStage[] {
  if (Array.isArray(value)) return normalizeJournalStages(value, fallback);
  if (typeof value === 'string' && value.trim()) {
    try {
      return normalizeJournalStages(JSON.parse(value), fallback);
    } catch {
      return normalizeJournalStages(value, fallback);
    }
  }
  return normalizeJournalStages([], fallback);
}

export function journalStageLabels(stages: JournalStage[], stageLabel?: string | null): string[] {
  return stages.map((stage) => {
    if (stage === 'other') return stageLabel || STAGE_META.other.zh;
    return STAGE_META[stage]?.zh ?? stage;
  });
}

export function primaryJournalStage(stages: JournalStage[], fallback: JournalStage = 'other'): JournalStage {
  const firstKnown = stages.find(isKnownJournalStage);
  if (firstKnown) return firstKnown;
  return isKnownJournalStage(fallback) ? fallback : 'other';
}
