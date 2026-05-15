import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * 管理员功能列表页面
 * 展示不同角色的权限和功能
 */
export default async function AdminPermissionsPage() {
  const me = await getCurrentUser();
  
  if (!me?.isSuperAdmin) {
    redirect('/');
  }

  const permissions = [
    {
      role: 'user',
      name: '普通用户',
      color: 'bg-ink-100 text-ink-700',
      features: [
        '发布帖子（长图文、记录贴、短动态、投票、视频、活动）',
        '编辑自己的帖子（仅限长图文、短动态、视频）',
        '删除自己的帖子',
        '评论、点赞、收藏',
        '关注用户和板块',
        '私信其他用户',
        '参与投票和活动报名',
      ],
    },
    {
      role: 'moderator',
      name: '版主',
      color: 'bg-amber-100 text-amber-700',
      features: [
        '✅ 继承普通用户的所有权限',
        '🔧 删除任意帖子',
        '📌 置顶/取消置顶帖子',
        '🔒 锁定/解锁帖子（禁止评论）',
        '📦 移动帖子到其他板块',
        '💬 删除评论',
      ],
    },
    {
      role: 'admin',
      name: '管理员',
      color: 'bg-rose-100 text-rose-700',
      features: [
        '✅ 继承版主的所有权限',
        '👥 查看用户列表',
        '🚫 封禁/解封用户',
        '💎 调整用户积分',
        '📊 查看管理日志',
        '🎨 管理徽章和主题',
        '📢 发布公告',
        '🎯 管理拍卖和商品',
      ],
    },
    {
      role: 'super_admin',
      name: '超级管理员',
      color: 'bg-violet-100 text-violet-700',
      features: [
        '✅ 继承管理员的所有权限',
        '👑 分配用户角色（普通用户/版主/管理员）',
        '🔍 审核含外链的帖子',
        '⚙️ 网站配置管理',
        '📧 邮件群发',
        '🌳 管理板块树结构',
        '🎪 管理轮播图',
        '📝 管理物种数据',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-800">🔐 权限管理</h1>
        <p className="mt-1 text-sm text-ink-600">
          查看不同角色的权限和功能，管理用户角色
        </p>
      </div>

      <div className="card p-5 bg-violet-50 border-violet-200">
        <div className="flex items-start gap-3">
          <Icon name="info" size={20} className="text-violet-600 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-violet-900 mb-1">关于角色分配</div>
            <ul className="text-sm text-violet-800 space-y-1">
              <li>• 只有超级管理员可以修改用户角色</li>
              <li>• 不能修改自己的角色</li>
              <li>• 不能修改其他超级管理员的角色</li>
              <li>• 角色修改会立即生效，用户需要重新登录</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {permissions.map((perm) => (
          <div key={perm.role} className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${perm.color}`}>
                  {perm.name}
                </span>
                {perm.role !== 'user' && (
                  <span className="text-xs text-ink-500">
                    {perm.role}
                  </span>
                )}
              </div>
            </div>

            <ul className="space-y-2 text-sm text-ink-700">
              {perm.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-leaf-600 mt-0.5">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-800">快速操作</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Link
            href="/admin/users"
            className="flex items-center gap-3 rounded-lg border border-leaf-200 bg-leaf-50 p-4 transition-colors hover:bg-leaf-100"
          >
            <Icon name="user" size={24} className="text-leaf-600" />
            <div>
              <div className="font-semibold text-ink-800">用户管理</div>
              <div className="text-xs text-ink-600">查看和管理所有用户</div>
            </div>
          </Link>

          <Link
            href="/admin/logs"
            className="flex items-center gap-3 rounded-lg border border-ink-200 bg-ink-50 p-4 transition-colors hover:bg-ink-100"
          >
            <Icon name="info" size={24} className="text-ink-600" />
            <div>
              <div className="font-semibold text-ink-800">操作日志</div>
              <div className="text-xs text-ink-600">查看管理员操作记录</div>
            </div>
          </Link>

          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4 transition-colors hover:bg-violet-100"
          >
            <Icon name="settings" size={24} className="text-violet-600" />
            <div>
              <div className="font-semibold text-ink-800">后台首页</div>
              <div className="text-xs text-ink-600">返回管理后台</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
