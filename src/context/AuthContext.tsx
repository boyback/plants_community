'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { User } from '@/lib/types';
import { api, ApiError } from '@/lib/client-api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (name: string, password: string) => Promise<{ ok: boolean; msg?: string }>;
  register: (name: string, password: string) => Promise<{ ok: boolean; msg?: string }>;
  logout: () => Promise<void>;
  signedInToday: boolean;
  signIn: () => Promise<void>;
  signInStreak: number;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser,
  initialSignInStreak = 0,
  initialSignedInToday = false,
}: {
  children: ReactNode;
  initialUser?: User | null;
  initialSignInStreak?: number;
  initialSignedInToday?: boolean;
}) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState(!initialUser);
  const [signedInToday, setSignedInToday] = useState(initialSignedInToday);
  const [signInStreak, setSignInStreak] = useState(initialSignInStreak);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<null | {
        user: User;
        signInStreak: number;
        signedInToday: boolean;
      }>('/api/auth/me');
      if (!res) {
        setUser(null);
      } else {
        setUser(res.user);
        setSignInStreak(res.signInStreak);
        setSignedInToday(res.signedInToday);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 如果没有服务端初值,客户端拉一次
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
  };

  const signIn = async () => {
    const res = await api.post<{ signInStreak: number; signedInToday: boolean }>(
      '/api/auth/signin'
    );
    setSignInStreak(res.signInStreak);
    setSignedInToday(res.signedInToday);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        signedInToday,
        signIn,
        signInStreak,
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
