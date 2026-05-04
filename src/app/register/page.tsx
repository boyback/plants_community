'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) {
      setErr('两次密码输入不一致');
      return;
    }
    const r = await register(name, password);
    if (!r.ok) {
      setErr(r.msg ?? '注册失败');
      return;
    }
    router.push('/');
    router.refresh();
  };

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-leaf-200/40 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-sand-200/40 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-6">
          <Logo />
        </div>
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-ink-800">加入肉友社 🌱</h1>
          <p className="mt-1 text-sm text-leaf-700/70">开始你的养肉之旅</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-800">用户名</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="取一个好听的昵称"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-800">密码</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-800">确认密码</label>
              <input
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再输入一次"
              />
            </div>
            {err && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
            )}
            <button type="submit" className="btn-primary w-full">
              注册并登录
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-leaf-700/70">
            已有账号?
            <Link href="/login" className="ml-1 link">
              去登录
            </Link>
          </div>
        </div>
        <Link href="/" className="mt-4 text-center text-xs text-leaf-700 hover:underline">
          ← 返回首页
        </Link>
      </div>
    </div>
  );
}
