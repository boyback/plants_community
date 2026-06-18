# AGENTS.md — 肉友社项目上下文

> 每次新对话时,opencode 会自动读取此文件来了解项目全貌。
> 定期更新此文件以保持上下文最新。

## 项目概述

**肉友社** — 多肉植物爱好者中文社区

- 技术栈:Next.js 14 + TypeScript + Prisma + MySQL
- 语言:中文(简体) + 繁体(5语 i18n 支持)
- 仓库:github.com/boyback/plants_community (master 分支)
- 生产:https://plantcommunity.cn
- 服务器:/srv/rouyou (Ubuntu, deploy 用户,SSH 用 ~/.ssh/id_ed25519)

## 约定

- 本地 nvm 默认 v14,prisma/next 必须用 `~/.nvm/versions/node/v20.18.0/bin/node`
- 原则:尽量少用 emoji,除非用户明确要求
- 备案号 鄂ICP备2026009255号(主体名不公开)
- 联系邮箱 admin@plantcommunity.cn(腾讯企业邮箱+Foxmail SMTP)
- MySQL root 密码已暴露(9b7be...),七牛 bucket=rouyou-community 公开读

## 技术栈

### 前端
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS 为历史遗留方案,后续新功能不再新增 Tailwind 响应式写法,逐步迁移下线
- shadcn/ui 风格组件(@/components/ui)
- Prisma (ORM, @prisma/client)

### 后端
- Go 1.25 + Gin + GORM (独立后端,不在本仓库)
- MySQL (通过 Prisma)
- JWT (httpOnly cookie 认证)

### 部署
- GitHub Actions CI/CD → docker build → push to ghcr.io → SSH deploy
- docker-compose: mysql + next + nginx + redis
- Nginx: host network, TLS 1.2/1.3, HTTP→HTTPS redirect

## 关键文件结构

```
src/
├── app/
│   ├── page.tsx                    # 首页(含 Banner, QuickDiscovery, TopicsCard)
│   ├── login/page.tsx              # 登录(微信+邮箱)
│   ├── register/page.tsx           # 注册(两步:邮箱→账号)
│   ├── board/                      # 板块(科→属→品种 三级)
│   ├── post/[id]/page.tsx          # 帖子详情
│   ├── market/                     # 交易市场(商品+拍卖)
│   ├── auction/[id]/page.tsx       # 拍卖详情
│   ├── user/[id]/page.tsx          # 用户主页
│   ├── topic/[name]/page.tsx       # 话题详情页(标题/正文/tags匹配)
│   ├── search/page.tsx             # 搜索(4维并行)
│   ├── feedback/page.tsx           # 意见反馈(表单)
│   ├── changelog/page.tsx          # 更新日志(内置+DB合并)
│   ├── admin/                      # 后台管理
│   ├── api/                        # API routes
│   └── layout.tsx                  # 根布局(Shell包裹)
├── components/
│   ├── layout/                     # Shell, Header, SiteFooter, Sidebar, BoardsTreeMenu
│   ├── home/                       # BannerCarousel, QuickDiscovery, TopicsCard, FeedbackCard
│   ├── post/                       # PostCard(Feed/Compact两种layout)
│   ├── ui/                         # Avatar, Button, Dialog, Tabs等基础组件
│   ├── species/                    # 物种卡片
│   └── market/                     # 交易相关组件
├── lib/
│   ├── db.ts                       # Prisma 客户端单例
│   ├── auth.ts                     # JWT 认证(requireUser等)
│   ├── api.ts                      # API handler 包装
│   ├── quick-discovery.ts          # 热门话题聚合(30天tags频次)
│   ├── jsonld.tsx                  # SEO JSON-LD
│   ├── email-mailer.ts             # SMTP 邮件发送
│   ├── email-templates.ts          # 邮件模板
│   ├── handle.ts                   # 用户名校验/正则/保留词
│   ├── feature-flags.ts            # 功能开关(WECHAT_LOGIN_ENABLED)
│   └── utils.ts                    # cn, timeAgo, formatNumber, boardUrl等
├── context/
│   └── AuthContext.tsx             # 前端认证状态
├── hooks/                          # 自定义 hooks
└── i18n/                           # 5语翻译文件
prisma/
├── schema.prisma                   # 数据库 schema
└── seed.ts                         # 种子数据
deploy/
├── nginx/conf.d/default.conf       # Nginx 配置(TLS+HSTS)
└── ...                             # 部署相关文件
scripts/
├── deploy.sh                       # 一键部署(prisma db push + docker build)
└── update-banners-2026.mjs         # Banner 更新脚本
```

## 数据库 Schema 关键字段

### User
- handle (唯一, 小写, 3-20字符)
- phone, email, wxUnionId, wxOpenidWebsite, wxOpenidMp
- emailUnsubscribed (退订标记)
- isSuperAdmin (超管标记)

### Post
- tags: String? @db.Text (JSON 数组字符串,如 `["度夏","黑腐"]`)
- deleted/deletedAt/deletedBy (软删除)
- reviewStatus: published/pending/rejected
- hotScore: Float (热度分)

### Comment
- deleted/deletedAt/deletedBy/deleteReason (软删除)

### Genus/Species
- orderIdx: Int (给树状拖拽排序用)

### EmailBroadcast / EmailRecipient
- 邮件群发系统(throttleMs 节流)

## 功能状态

### ✅ 已上线
- 邮箱注册/登录(两步:邮箱验证码→账号密码)
- 微信登录(代码全套,feature flag 默认 OFF)
- 交易市场(商品+拍卖混合,卡式筛选,4/5列切换)
- 拍卖(倒计时,30s轮询,当前价更新)
- 搜索(帖子/品种/板块/用户 4维并行)
- 话题页(/topic/[name] — tags精准匹配+标题/正文LIKE)
- 意见反馈(/feedback — 表单→私信给超管)
- 更新日志(/changelog — 内置里程碑+DB公告合并)
- 板块树拖拽(/admin/boards/tree)
- 评论管理(/admin/comments)
- 邮件群发(/admin/email-broadcast)
- Banner轮播(3张高清新图)
- SEO JSON-LD + 站长验证
- 首页右栏:热门话题+板块(QuickDiscovery)

### ⏳ 待处理
- 微信开放平台资质审核(等7天)
- 微信支付商户号(待4凭证)
- 独立SSL域名(域名备案通了再绑)
- VIP 会员定价页
- 找回密码
- 设置页改密邮箱
- 钻石调整 admin
- AnnouncementCard / 反馈卡挂载(目前只有 footer 链接)

## 设计规范

> 新增/重构前端页面优先遵循 `docs/FRONTEND_SIZE_SYSTEM.md`。
> 项目目标:去掉 Tailwind 断点式响应和手写媒体查询,尺寸统一交给 px→vw 插件体系。

### 尺寸体系
- PC 设计稿基准:1920
- H5 设计稿基准:375
- 尺寸单位:源码按设计稿写 px,构建阶段通过插件转换为 vw
- 不再新增 `sm:`/`md:`/`lg:`/`xl:`/`2xl:` 这类 Tailwind 断点响应式 class
- 不再新增 `@media`、`window.innerWidth`、`ResizeObserver` 等用于模拟尺寸响应的布局逻辑
- Tailwind CSS 仅作为历史兼容保留;新增模块禁止依赖 Tailwind 响应式体系,后续按模块迁移至普通 CSS/CSS Modules + px→vw
- PC/H5 差异需要拆成明确的 PC/H5 容器或组件时,由页面状态/路由/业务容器决定,不要在组件内部混写断点规则

### 颜色
- 主色:leaf-50~900(green系)
- 墨色:ink-50~900(黑灰系)
- 卡片:白底,leaf-100/60 分割线
- 链接:leaf-700

### 布局
- 最大宽度:1280px(2xl:1440px)
- 侧边栏:280px(xl+)
- 帖子卡片:4列(xl+) / 5列(可切换,localStorage 'market.cols')
- 4列模式:作者+时间在中,看赞评底部均分,字体缩小

### 组件风格
- 卡片:card / card-hoverable / card-interactive
- 按钮:btn-primary / btn-ghost / btn-outline
- 输入:input
- 圆角:rounded-lg / rounded-xl
- 字号:11-12px辅助文字,13-14px正文,16-20px标题
- 基础交互组件优先基于 `radix-ui` Primitives 做二次封装,业务代码统一从 `@/components/ui/*` 引入封装组件,不要直接在业务页散落使用 Radix 原始组件

### 图标
- SVG icon 库(@/components/ui/Icon)
- 包含:user/palette/lock/package/mail/crown/diamond/shop/hammer 等

## 部署流程

```bash
# 本地修改完成后
git add -A && git commit -m "描述"
git push origin master
# CI/CD 自动:build → docker push → SSH deploy → prisma db push → restart
```

## 常用命令

```bash
# TypeScript 检查
~/.nvm/versions/node/v20.18.0/bin/node node_modules/.bin/tsc --noEmit

# 本地开发
PATH=~/.nvm/versions/node/v20.18.0/bin:$PATH nohup ~/.nvm/versions/node/v20.18.0/bin/node node_modules/.bin/next dev > /tmp/next-dev.log 2>&1 &

# 查看 CI 状态
curl -s "https://api.github.com/repos/boyback/plants_community/actions/runs?per_page=5" | python3 -c "..."

# SSH 到服务器
ssh deploy@118.145.162.6
cd /srv/rouyou
docker compose ps
docker compose logs next --tail=50
```

## 已知问题

1. **Prisma schema 同步历史问题**:deploy.sh 改为 exec -T 后理论自动同步,但已多次失败
2. **MySQL root 密码暴露**:需更换
3. **isSuperAdmin 列**:用户已手动添加
4. **nginx host network**:docker-compose.yml 里 nginx profile 限制已去掉
5. **dev 进程**:多个旧进程会让验证码内存丢失,用 `pkill -9 -f next-server` 清理
