/**
 * 等级与权限定义
 *
 * 等级 1~10 阶梯,每级对应不同 EXP 阈值与解锁权限。
 */

export type Permission =
  | 'comment'           // 发评论
  | 'post:rich'         // 发长文贴 / 图文贴
  | 'post:short'        // 发短内容贴
  | 'post:image'        // 帖子带图
  | 'post:video'        // 视频贴
  | 'post:vote'         // 投票贴
  | 'post:event'        // EVENT 贴
  | 'post:collect'      // 收藏帖子
  | 'market:buy'        // 商品购买
  | 'market:sell'       // C2C 出售
  | 'market:pin'        // 置顶请求
  | 'badge:choose';     // 自选徽章

export interface LevelDef {
  level: number;
  name: string;       // 等级别名
  expRequired: number; // 累计 EXP 达到此值即解锁该等级
  permissions: Permission[]; // 该等级新增解锁的权限
  perks: string[];    // 给用户看的简短描述
}

/**
 * 关键设计:
 * - permissions 使用「累积」语义,低等级权限自动包含在高等级里(由 hasPermission 实现)
 */
export const LEVELS: LevelDef[] = [
  { level: 1,  name: '新苗',       expRequired: 0,     permissions: ['comment', 'post:short'],     perks: ['可发评论', '可发短内容贴'] },
  { level: 2,  name: '小苗',       expRequired: 50,    permissions: ['post:collect'],              perks: ['可收藏帖子'] },
  { level: 3,  name: '幼株',       expRequired: 150,   permissions: ['post:rich'],                 perks: ['可发长文贴 · 图文贴'] },
  { level: 4,  name: '青株',       expRequired: 350,   permissions: ['post:image'],                perks: ['发帖可带图'] },
  { level: 5,  name: '成株',       expRequired: 700,   permissions: ['post:video', 'market:buy'],  perks: ['可发视频贴', '可在交易区购买'] },
  { level: 6,  name: '大株',       expRequired: 1200,  permissions: ['post:vote'],                 perks: ['可发投票贴'] },
  { level: 7,  name: '老桩',       expRequired: 2000,  permissions: ['post:event'],                perks: ['可发 EVENT 贴'] },
  { level: 8,  name: '园艺师',     expRequired: 3500,  permissions: ['market:sell'],               perks: ['可在交易区出售'] },
  { level: 9,  name: '大师',       expRequired: 6000,  permissions: ['market:pin'],                perks: ['可申请置顶帖子'] },
  { level: 10, name: '宗师',       expRequired: 10000, permissions: ['badge:choose'],              perks: ['自选展示徽章'] },
];

export const ALL_PERMISSIONS: Permission[] = [
  'comment',
  'post:short',
  'post:rich',
  'post:image',
  'post:video',
  'post:vote',
  'post:event',
  'post:collect',
  'market:buy',
  'market:sell',
  'market:pin',
  'badge:choose',
];

/** 由累计 EXP 计算应有等级 */
export function levelByExp(exp: number): number {
  return levelByExpFromDefs(exp, LEVELS);
}

export function levelByExpFromDefs(exp: number, levels: Pick<LevelDef, 'level' | 'expRequired'>[]): number {
  let lv = 1;
  for (const def of [...levels].sort((a, b) => a.level - b.level)) {
    if (exp >= def.expRequired) lv = def.level;
    else break;
  }
  return lv;
}

/** 当前等级累计应有的所有权限(自动包含低等级权限) */
export function permissionsForLevel(level: number): Permission[] {
  const set = new Set<Permission>();
  for (const def of LEVELS) {
    if (def.level <= level) {
      for (const p of def.permissions) set.add(p);
    }
  }
  return [...set];
}

/** 判断用户是否拥有某权限 */
export function hasPermission(
  user:
    | {
        level: number;
        grantedPermissions?: Permission[];
        revokedPermissions?: Permission[];
      }
    | null
    | undefined,
  perm: Permission
): boolean {
  if (!user) return false;
  if (user.revokedPermissions?.includes(perm)) return false;
  if (user.grantedPermissions?.includes(perm)) return true;
  return permissionsForLevel(user.level).includes(perm);
}

/** 距离下一级所需 EXP */
export function expProgress(exp: number) {
  return expProgressFromDefs(exp, LEVELS);
}

export function expProgressFromDefs(exp: number, levels: Pick<LevelDef, 'level' | 'name' | 'expRequired'>[]) {
  const ordered = [...levels].sort((a, b) => a.level - b.level);
  const current = levelByExpFromDefs(exp, ordered);
  const next = ordered.find((l) => l.level === current + 1);
  if (!next) {
    return {
      level: current,
      currentLevelExp: exp,
      nextLevelExp: exp,
      percent: 100,
      pointsToNext: 0,
      isMax: true,
    };
  }
  const currentDef = ordered.find((l) => l.level === current)!;
  const start = currentDef.expRequired;
  const end = next.expRequired;
  const percent = Math.min(100, Math.round(((exp - start) / (end - start)) * 100));
  return {
    level: current,
    currentLevelExp: exp - start,
    nextLevelExp: end - start,
    percent,
    pointsToNext: end - exp,
    isMax: false,
  };
}

/** 等级权限给用户看的友好提示 */
export const PERMISSION_LABEL: Record<Permission, string> = {
  comment: '发评论',
  'post:rich': '发长文贴 / 图文贴',
  'post:short': '发短内容贴',
  'post:image': '发帖带图',
  'post:video': '发视频贴',
  'post:vote': '发投票贴',
  'post:event': '发 EVENT 贴',
  'post:collect': '收藏帖子',
  'market:buy': '交易区购买',
  'market:sell': '交易区出售',
  'market:pin': '申请置顶',
  'badge:choose': '自选徽章',
};

/** 缺少某权限时,给前端提示去做什么 */
export function permissionHint(perm: Permission): string {
  const def = LEVELS.find((l) => l.permissions.includes(perm));
  if (!def) return '权限不足';
  return `需要 Lv.${def.level}「${def.name}」`;
}

/**
 * 查询解锁某权限所需的最低等级定义。
 * 返回 { level, name } 供 UI 层 i18n 拼接。
 */
export function PERMISSION_LEVEL(perm: Permission): { level: number; name: string } | null {
  const def = LEVELS.find((l) => l.permissions.includes(perm));
  return def ? { level: def.level, name: def.name } : null;
}
