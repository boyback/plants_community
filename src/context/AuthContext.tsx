'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import type { User, EquipState } from '@/lib/types';
import { api, ApiError } from '@/lib/client-api';

interface VipState {
  isVip: boolean;
  lifetime: boolean;
  expireAt: string | null;
}

interface ExpProgressInfo {
  level: number;
  currentLevelExp: number;
  nextLevelExp: number;
  percent: number;
  pointsToNext: number;
  isMax: boolean;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signedInToday: boolean;
  signInStreak: number;
  /** 今日全站已签到人数 */
  todaySignedCount: number;
  exp: number;
  expProgress: ExpProgressInfo | null;
  pointsBalance: number;
  vip: VipState;
  equip: EquipState;
  login: (name: string, password: string) => Promise<{ ok: boolean; msg?: string }>;
  register: (name: string, password: string) => Promise<{ ok: boolean; msg?: string }>;
  logout: () => Promise<void>;
  signIn: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEFAULT_VIP: VipState = { isVip: false, lifetime: false, expireAt: null };

export function AuthProvider({
  children,
  initialUser,
  initialSignInStreak = 0,
  initialSignedInToday = false,
  initialExp = 0,
  initialExpProgress = null,
  initialPointsBalance = 0,
  initialVip = DEFAULT_VIP,
  initialEquip = {},
}: {
  children: ReactNode;
  initialUser?: User | null;
  initialSignInStreak?: number;
  initialSignedInToday?: boolean;
  initialExp?: number;
  initialExpProgress?: ExpProgressInfo | null;
  initialPointsBalance?: number;
  initialVip?: VipState;
  initialEquip?: EquipState;
}) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState(!initialUser);
  const [signedInToday, setSignedInToday] = useState(initialSignedInToday);
  const [signInStreak, setSignInStreak] = useState(initialSignInStreak);
  const [todaySignedCount, setTodaySignedCount] = useState(0);
  const [exp, setExp] = useState(initialExp);
  const [expProgressState, setExpProgressState] = useState<ExpProgressInfo | null>(
    initialExpProgress
  );
  const [pointsBalance, setPointsBalance] = useState(initialPointsBalance);
  const [vip, setVip] = useState<VipState>(initialVip);
  const [equip, setEquip] = useState<EquipState>(initialEquip);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<null | {
        user: User;
        signInStreak: number;
        signedInToday: boolean;
        todaySignedCount?: number;
        exp: number;
        expProgress: ExpProgressInfo;
        pointsBalance: number;
        vip: VipState;
        equip: EquipState;
      }>('/api/auth/me');
      if (!res) {
        setUser(null);
      } else {
        setUser(res.user);
        setSignInStreak(res.signInStreak);
        setSignedInToday(res.signedInToday);
        setTodaySignedCount(res.todaySignedCount ?? 0);
        setExp(res.exp);
        setExpProgressState(res.expProgress);
        setPointsBalance(res.pointsBalance);
        setVip(res.vip);
        setEquip(res.equip);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialUser) refresh();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login: AuthContextValue['login'] = async (name, password) => {
    try {
      const u = await api.post<User>('/api/auth/login', { name, password });
      setUser(u);
      await refresh();
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: e instanceof ApiError ? e.message : '登录失败' };
    }
  };

  const register: AuthContextValue['register'] = async (name, password) => {
    try {
      const u = await api.post<User>('/api/auth/register', { name, password });
      setUser(u);
      await refresh();
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: e instanceof ApiError ? e.message : '注册失败' };
    }
  };

  const logout = async () => {
    await api.post('/api/auth/logout').catch(() => null);
    setUser(null);
    setSignInStreak(0);
    setSignedInToday(false);
    setExp(0);
    setExpProgressState(null);
    setPointsBalance(0);
    setVip(DEFAULT_VIP);
    setEquip({});
  };

  const signIn = async () => {
    await api.post<{ signInStreak: number; signedInToday: boolean }>('/api/auth/signin');
    await refresh();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signedInToday,
        signInStreak,
        exp,
        expProgress: expProgressState,
        pointsBalance,
        vip,
        equip,
        login,
        register,
        logout,
        signIn,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
