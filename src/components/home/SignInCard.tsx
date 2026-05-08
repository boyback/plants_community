'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

export function SignInCard() {
  const { user, signedInToday, signIn, signInStreak } = useAuth();
  const { t } = useI18n();

  if (!user) {
    return (
      <div className="card p-5">
        <div className="text-sm font-semibold text-ink-800">{t('home.signIn.welcomeTitle')}</div>
        <p className="mt-1 text-xs text-leaf-700/70">{t('home.signIn.welcomeSub')}</p>
        <div className="mt-3 flex gap-2">
          <Link href="/login" className="btn-primary flex-1 justify-center">
            {t('home.signIn.login')}
          </Link>
          <Link href="/register" className="btn-outline flex-1 justify-center">
            {t('home.signIn.register')}
          </Link>
        </div>
      </div>
    );
  }

  const days = t('home.signIn.weekDays').split(',');
  const today = new Date().getDay();
  const todayIdx = (today + 6) % 7; // 转为周一为 0

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 bg-gradient-to-br from-leaf-400 to-leaf-600 p-4 text-white">
        <Avatar src={user.avatar} alt={user.name} size={44} ring />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{user.name}</div>
          <div className="text-[11px] opacity-90">
            {t('home.signIn.userMeta', {
              level: user.level,
              posts: user.posts,
              followers: user.followers,
            })}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-leaf-700/70">{t('home.signIn.streakLabel')}</div>
            <div className="text-xl font-bold text-leaf-700">
              {signInStreak} <span className="text-xs font-normal">{t('home.signIn.daysSuffix')}</span>
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
                {t('home.signIn.signedToday')}
              </>
            ) : (
              t('home.signIn.signInNow')
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
          {t('home.signIn.tip')}
        </div>
      </div>
    </div>
  );
}
