/** 大会员套餐定义 */

export const VIP_PLANS = [
  {
    key: 'monthly',
    title: '月卡',
    subtitle: '畅享 30 天大会员',
    amount: 1990,
    pointsCost: 0,
    durationDays: 30,
  },
  {
    key: 'quarterly',
    title: '季卡',
    subtitle: '90 天 · 比月卡省 9.9',
    amount: 4990,
    pointsCost: 0,
    durationDays: 90,
    recommended: true,
  },
  {
    key: 'yearly',
    title: '年卡',
    subtitle: '365 天 · 全年最划算',
    amount: 16800,
    pointsCost: 0,
    durationDays: 365,
  },
  {
    key: 'lifetime',
    title: '终身',
    subtitle: '一次买断 · 永久会员',
    amount: 49900,
    pointsCost: 0,
    durationDays: 99999,
  },
  {
    key: 'monthly_points',
    title: '钻石兑月卡',
    subtitle: '5000 钻石 = 30 天',
    amount: 0,
    pointsCost: 5000,
    durationDays: 30,
  },
] as const;

export type VipPlanKey = (typeof VIP_PLANS)[number]['key'];
