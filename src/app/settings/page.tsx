'use client';

import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/i18n/I18nContext';
import { useCookieConsent } from '@/theme/CookieConsent';

export default function SettingsPage() {
  const { t } = useI18n();
  const { reopen } = useCookieConsent();

  const sections = [
    {
      href: '/settings/profile',
      icon: '👤' as const,
      title: '个人资料',
      desc: '头像、昵称、简介',
    },
    {
      href: '/settings/appearance',
      icon: '🎨' as const,
      title: t('settings.appearance.title') || '外观与语言',
      desc: t('settings.appearance.desc') || '语言、节日主题等界面偏好',
    },
    {
      href: '/settings/privacy',
      icon: '🔒' as const,
      title: t('settings.privacy.title') || '隐私',
      desc: t('settings.privacy.desc') || '关注 / 粉丝 可见性',
    },
    {
      href: '/addresses',
      icon: '📮' as const,
      title: t('settings.addresses.title') || '收件地址',
      desc: t('settings.addresses.desc') || '管理默认地址、新增、删除',
    },
    {
      href: '/terms',
      icon: '📜' as const,
      title: t('settings.terms.title') || '用户协议',
      desc: t('settings.terms.desc') || '阅读最新用户协议',
    },
    {
      href: '/privacy',
      icon: '🛡️' as const,
      title: t('settings.privacyPolicy.title') || '隐私政策',
      desc: t('settings.privacyPolicy.desc') || '我们如何处理你的数据',
    },
    {
      href: '/cookies',
      icon: '🍪' as const,
      title: t('settings.cookiePolicy.title') || 'Cookie 政策',
      desc: t('settings.cookiePolicy.desc') || '查看我们使用的 Cookie 分类',
    },
  ];

  return (
    <Shell>
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Icon name="settings" size={20} />
          <h1 className="text-xl font-semibold">{t('settings.title') || '设置'}</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="card-hoverable flex items-start gap-3 rounded-xl border border-leaf-100 p-4"
            >
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className="font-medium text-leaf-800">{s.title}</div>
                <div className="mt-0.5 text-sm text-leaf-600">{s.desc}</div>
              </div>
            </Link>
          ))}
          <button
            type="button"
            onClick={reopen}
            className="card-hoverable flex items-start gap-3 rounded-xl border border-leaf-100 p-4 text-left"
          >
            <span className="text-2xl">⚙️</span>
            <div>
              <div className="font-medium text-leaf-800">
                {t('settings.reopenCookie.title') || '重新管理 Cookie 偏好'}
              </div>
              <div className="mt-0.5 text-sm text-leaf-600">
                {t('settings.reopenCookie.desc') ||
                  '重新打开同意框,调整 Cookie 分类'}
              </div>
            </div>
          </button>
        </div>
      </div>
    </Shell>
  );
}
