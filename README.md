# 🌵 肉友社 · 多肉植物论坛

一个面向多肉植物爱好者的全栈社区。基于 **Next.js 14 + TypeScript + Tailwind CSS + Prisma + MySQL + JWT**,
前后端同仓,清新绿植风 UI,PC + 移动端响应式。

## 🚀 快速开始

### 0. 准备

- Node >= 18.17(推荐 20.18)
- MySQL 8.x(本地监听 3306)

```bash
nvm use 20.18.0
```

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并按需修改:

```bash
cp .env.example .env
```

关键项:

```dotenv
DATABASE_URL="mysql://root:你的密码@127.0.0.1:3306/plants_community"
JWT_SECRET="至少 32 字节的随机串"
```

### 3. 初始化数据库

```bash
# 如果数据库不存在,先建库
mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS plants_community DEFAULT CHARACTER SET utf8mb4;"

# 一键同步 schema 并播种 Mock 数据
npm run setup
```

等价于:
```bash
npm run db:push      # 把 prisma/schema.prisma 同步到 MySQL
npm run db:seed      # 播种用户/板块/帖子/评论/图鉴 等
```

### 4. 启动

```bash
# 开发模式(热更新)
npm run dev

# 生产构建 + 运行
npm run build
npm run start
```

访问 http://localhost:3000

## 🔐 演示账号

Seed 会创建 8 个 Mock 用户,密码统一为 `123456`。可直接用以下任一登录:

| 用户名 | 描述 |
| --- | --- |
| `多肉阿绿`   | 主角,华北阳台党 |
| `沙漠老王`   | 老玩家,仙人掌达人 |
| `月光玉露`   | 玉露控 |
| `番杏女王`   | 生石花专家 |
| `花园里的熊` | 全日照派 |
| `露娜酱`     | 萌新 |
| `清风徐来`   | 摄影爱好者 |
| `南方小院`   | 广州肉友 |

也可以点「注册」创建新账号,密码 ≥ 6 位即可。

## 🧬 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Next.js 14 (App Router) + React 18 + TypeScript |
| UI | Tailwind CSS(清新绿主题) |
| 数据库 | MySQL 8 |
| ORM | Prisma 6 |
| 认证 | JWT(jose)+ bcrypt + httpOnly Cookie |
| 参数校验 | Zod |
| 数据层策略 | 服务端组件直连 Prisma,客户端交互走 REST API |

## 🗺️ 路由总览

### 页面

| 路由 | 说明 |
| --- | --- |
| `/` | 首页(Banner 轮播 + 推荐流 Tabs + 签到卡 + 热门话题 + 推荐肉友) |
| `/board` | 全部板块 |
| `/board/[slug]` | 板块详情(帖子列表 + 活跃用户 + 置顶) |
| `/post/[id]` | 帖子详情(5 种类型 + 评论 + 点赞/收藏/分享) |
| `/editor` | 发帖/草稿(支持 5 种帖子类型) |
| `/user/[id]` | 个人主页(徽章墙 + Tab) |
| `/messages` | 私信(会话列表 + 聊天窗口,支持 `?to=userId`) |
| `/notifications` | 通知中心(类型筛选 + 标记已读) |
| `/plants` | 多肉图鉴列表(科属/难度筛选、搜索) |
| `/plants/[slug]` | 图鉴详情(养护要点 + 图集 + 相关讨论) |
| `/about` | 关于我们 |
| `/login`,`/register` | 登录 / 注册 |

### API(REST, 全部挂在 `/api`)

| 路径 | 方法 | 作用 |
| --- | --- | --- |
| `/auth/register` | POST | 注册并自动登录 |
| `/auth/login` | POST | 密码登录 |
| `/auth/logout` | POST | 清除 Cookie |
| `/auth/me` | GET | 获取当前用户信息 + 签到状态 |
| `/auth/signin` | POST | 签到(自动累计连续天数) |
| `/boards` | GET | 板块列表 |
| `/boards/[slug]` | GET | 板块详情 |
| `/posts` | GET / POST | 帖子列表(支持 board/author/sort/cursor)/ 发帖 |
| `/posts/[id]` | GET | 帖子详情(含评论) |
| `/posts/[id]/like` | GET / POST | 查询 / 切换点赞 |
| `/posts/[id]/collect` | POST | 切换收藏 |
| `/posts/[id]/vote` | POST | 投票/改投 |
| `/posts/[id]/attend` | POST | 报名/取消活动 |
| `/posts/[id]/comments` | POST | 发评论(含 @通知) |
| `/conversations` | GET | 会话列表(按对话者分组) |
| `/conversations/[peerId]` | GET | 某会话消息 + 自动标记已读 |
| `/messages` | POST | 发私信 |
| `/notifications` | GET | 我的通知 + unread 数 |
| `/notifications/read` | POST | 批量/全部标记已读 |
| `/plants`, `/plants/[slug]` | GET | 图鉴 |
| `/banners` | GET | Banner |
| `/users` | GET | 推荐用户列表 |
| `/users/[id]` | GET | 用户详情 |
| `/users/[id]/follow` | POST | 切换关注 |
| `/drafts` | GET / POST | 草稿列表 / 新建&更新 |
| `/drafts/[id]` | DELETE | 删除草稿 |

## 🧩 5 种帖子类型

| 类型 | 能否 APP 发布 | 详情页表现 |
| --- | --- | --- |
| `rich` 富文本 | ✅ | HTML 正文 + 图集 |
| `short` 短内容 | ✅ | 纯文本 + 图集 |
| `video` 视频 | ✅ | 内嵌 `<video>` 播放器 |
| `vote` 投票 | ❌ 仅 PC | 单/多选投票,结果进度条,支持改投 |
| `event` EVENT | ❌ 仅 PC | 活动卡(时间/地点)+ 报名计数 |

## 📁 目录结构

```
prisma/
├── schema.prisma        # 19 张表的数据模型
└── seed.ts              # Mock 数据播种脚本

src/
├── app/
│   ├── api/             # 26 个 REST endpoints(auth/posts/boards/.../drafts)
│   ├── page.tsx         # 首页(服务端组件)
│   ├── board/           # 板块主页 + 详情
│   ├── post/[id]/       # 帖子详情
│   ├── editor/          # 发帖/编辑/草稿
│   ├── user/[id]/       # 个人主页(Server + Client 拆分)
│   ├── messages/        # 私信
│   ├── notifications/   # 通知
│   ├── plants/          # 图鉴
│   ├── about/, login/, register/, not-found.tsx
│   ├── layout.tsx       # 服务端预取用户信息,注入 AuthProvider
│   └── globals.css
├── components/
│   ├── layout/          # Header / Sidebar / MobileNav / MobileTabBar / Shell
│   ├── ui/              # Avatar / Icon / Logo / PostTypeBadge / Empty
│   ├── home/            # BannerCarousel / SignInCard / FeedTabs / TopicsCard / RecommendUsers
│   ├── board/           # BoardCard
│   └── post/            # PostCard / PostBody / PostActions / CommentSection / TypePicker
├── context/
│   └── AuthContext.tsx  # 前端登录态 + 签到,基于 /api/auth/*
├── lib/
│   ├── db.ts            # Prisma 单例
│   ├── auth.ts          # JWT / bcrypt / cookie / requireUser
│   ├── api.ts           # handler() / ok() / fail() 响应包装
│   ├── client-api.ts    # 客户端统一 fetch
│   ├── serializers.ts   # DB 实体 → 前端类型
│   ├── post-include.ts  # 帖子查询的公共 include
│   ├── types.ts         # 前端通用类型
│   └── utils.ts         # 工具函数
└── mock/                # 已废弃(保留作为测试数据参考)
```

## 🔄 前后端交互模式

本项目采用 **「服务端组件直连 Prisma + 客户端 fetch API」** 的混合模式:

- **SEO / 首屏渲染**:首页、板块页、帖子详情、用户页、图鉴页都是 Server Components,直接在服务端用 Prisma 读数据,带 SSR HTML 返回。
- **交互操作**:点赞、评论、投票、发帖、签到、关注、私信等都通过 `/api/*` 发起,客户端组件调用 `lib/client-api.ts` 封装的 `api.post/get/...`。
- **认证**:JWT 放在 `httpOnly` Cookie `rouyou_token` 里。服务端组件通过 `getCurrentUser()` 读 Cookie,客户端组件通过 `useAuth()` 拿登录态。

## 🧰 常用命令

```bash
# 开发
npm run dev              # 开发服务器
npm run lint             # Lint

# 构建
npm run build
npm run start

# 数据库
npm run db:push          # 把 schema 同步到 MySQL(开发用)
npm run db:migrate       # 创建迁移文件(生产用)
npm run db:seed          # 播种 Mock 数据
npm run db:reset         # 重置 + 重播
npm run db:studio        # 启动 Prisma Studio 可视化 DB
npm run setup            # 一键 push + seed
```

## 📦 部署

1. 把 `.env` 里的 `DATABASE_URL` 指向生产 MySQL。
2. `JWT_SECRET` 一定要换成强随机串。
3. 生产环境下 `AUTH_COOKIE` 会自动开启 `Secure`(需 HTTPS)。
4. 执行:
   ```bash
   npm run db:push   # 首次上线;后续请用 db:migrate 走迁移
   npm run db:seed   # 可选,是否播种初始数据
   npm run build
   npm run start
   ```
5. 推荐部署平台:Vercel / Node 服务器 / Docker,MySQL 可用 PlanetScale、RDS 等。

## 📌 注意事项

- 本仓库 `.env` 已被 gitignore,不会提交敏感信息。
- 默认种子密码为 `123456`,仅用于演示,生产前必须清空或修改。
- 头像与图片来自 Unsplash / pravatar 公共 CDN,首次加载略慢。
- 评论的 @回复通知尚未实现(仅直回复会发通知)。
- 搜索框暂为占位 UI,未接入搜索 API。

---

Made with 🌿 and ❤️
