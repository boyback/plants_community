import type { JournalStage, JournalEndReason } from './types';

/** 阶段元信息:emoji + 颜色 + 中文 fallback。i18n key: journal.stage.<key> */
export const STAGE_META: Record<
  JournalStage,
  { emoji: string; zh: string; color: string }
> = {
  germinate: { emoji: '🌱', zh: '发芽', color: 'bg-leaf-50 text-leaf-700 border-leaf-200' },
  growing: { emoji: '🌿', zh: '成长', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  flowering: { emoji: '🌸', zh: '开花', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  fruiting: { emoji: '🍒', zh: '结果', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  withering: { emoji: '🥀', zh: '枯萎', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  repot: { emoji: '🪴', zh: '换盆', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  cutting: { emoji: '✂️', zh: '扦插', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  summer: { emoji: '☀️', zh: '度夏', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  winter: { emoji: '❄️', zh: '越冬', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  pest: { emoji: '🐛', zh: '虫害', color: 'bg-red-50 text-red-700 border-red-200' },
  watering: { emoji: '💧', zh: '浇水', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  other: { emoji: '📌', zh: '其他', color: 'bg-leaf-50 text-leaf-700 border-leaf-200' },
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
