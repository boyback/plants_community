'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

export function SignInCard() {
  const { user, signedInToday, signIn, signInStreak } = useAuth();

  if (!user) {
    return (
      <div className="card p-5">
        <div className="text-sm font-semibold text-ink-800">欢迎来到肉友社 🌵</div>
        <p className="mt-1 text-xs text-leaf-700/70">
          登录后可以发帖、评论、签到获取徽章,还能进入私信和通知中心。
        </p>
        <div className="mt-3 flex gap-2">
          <Link href="/login" className="btn-primary flex-1 justify-center">
            登录
          </Link>
          <Link href="/register" className="btn-outline flex-1 justify-center">
            注册
          </Link>
        </div>
      </div>
    );
  }

  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const today = new Date().getDay();
  const todayIdx = (today + 6) % 7; // 转为周一为 0

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 bg-gradient-to-br from-leaf-400 to-leaf-600 p-4 text-white">
        <Avatar src={user.avatar} alt={user.name} size={44} ring />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{user.name}</div>
          <div className="text-[11px] opacity-90">Lv.{user.level} · {user.posts} 帖 · {user.followers} 粉</div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-leaf-700/70">已连续签到</div>
            <div className="text-xl font-bold text-leaf-700">
              {signInStreak} <span className="text-xs font-normal">天</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signIn()}
            disabled={signedInToday}
            className={cn(
              'btn !px-4',
              signedInToday
                ? 'cursor-not-allowed bg-leaf-100 text-leaf-600'
                : 'bg-leaf-500 text-white hover:bg-leaf-600'
            )}
          >
            {signedInToday ? (
              <>
                <Icon name="check" size={14} />
                已签到
              </>
            ) : (
              '立即签到'
            )}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const done = i <= todayIdx && (signedInToday || i < todayIdx);
            return (
              <div key={d} className="flex flex-col items-center text-[10px]">
                <div className="mb-1 text-leaf-600/70">{d}</div>
                <div
                  className={cn(
                    'grid h-7 w-7 place-items-center rounded-full text-xs',
                    done
                      ? 'bg-leaf-500 text-white'
                      : i === todayIdx
                      ? 'border-2 border-dashed border-leaf-400 text-leaf-600'
                      : 'bg-leaf-50 text-leaf-300'
                  )}
                >
                  {done ? '✓' : i + 1}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-lg bg-sand-50 p-2.5 text-[11px] text-sand-300">
          💡 连续签到 7 天可获得徽章「小太阳」
        </div>
      </div>
    </div>
  );
}
