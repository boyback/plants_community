# 🌵 Plants Community · Go 后端

**Go 1.22 + Gin + GORM + MySQL** 重构的后端服务,与现有 Next.js 后端(`src/app/api/`)**数据库共用、JWT 兼容**。可以在同一数据库上并行运行,前端按需切换。

## 🎯 目的

分步重构,**已完成 66 个 API**:
- **第一期**(25 个):认证 / 用户 / 板块 / 帖子读写 / 评论 / 关注 / 点赞 / 收藏 / 隐私 ✅
- **第二期**(+10 个):帖子**创建**(含 ProseMirror JSON 富文本 sanitize) / 通知 / 图片上传 / 草稿 / 权限矩阵 ✅
- **第三期**(+24 个):Market / Orders / Payments(Mock,含 webhook 业务串联)/ VIP 订阅+积分兑换 / 拍卖(状态机+防狙击+保证金+违约处理)/ 地址簿 ✅
- **补充 (+5 个)**:求助帖(悬赏+采纳)/ 节日主题(13 个节日,自动投放+用户关闭) ✅

后续迭代:
- **第四期**:积分流水 / 任务 / 活跃度 / 皮肤装扮 / 私信
- **国际化**:i18n (zh-CN/zh-TW/en/ja/ko) + 法务文案(用户协议/隐私/Cookie)

---

## 🚀 快速开始

### 前置条件

1. 已经跑过 Next.js 项目的 seed(`npm run db:seed`),数据库里有 14 Category + 60 Genus + 581 Species + 8 用户等数据
2. Go 1.22+,或 Docker

### 本地运行(无 Docker)

```bash
cd server-go

# 拉依赖
go mod download

# 运行(环境变量可选,缺省会用和 Next.js 一致的值)
go run ./cmd/server
# 或编译成二进制
go build -o server ./cmd/server
./server
```

启动成功会看到:

```
  🌵 Plants Community Go 后端
  =================================
  • 端口: :8080
  • 数据库: mysql://root:***@127.0.0.1:3306/plants_community
  ...
```

### Docker 运行

```bash
cd server-go

# 构建
docker build -t plants-community-server .

# 运行(把 host MySQL 暴露给容器)
docker run --rm -p 8080:8080 \
  -e DATABASE_URL="mysql://root:root123456@host.docker.internal:3306/plants_community" \
  -e JWT_SECRET="rouyou-community-demo-secret-please-change-this-in-production-xxx" \
  -e CORS_ORIGIN="http://localhost:3000" \
  plants-community-server

# 或用 compose
docker compose up --build
```

---

## 📋 支持的 API(35 个)

| Method | Path | 鉴权 | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | | 注册,自动 set cookie |
| `POST` | `/api/auth/login` | | 登录 |
| `POST` | `/api/auth/logout` | | 登出 |
| `GET` | `/api/auth/me` | | 当前用户(含 exp/expProgress/points/vip/privacy) |
| `POST` | `/api/auth/signin` | ✅ | 每日签到 |
| `GET` | `/api/users` | | 推荐用户列表 |
| `GET` | `/api/users/:id` | | 用户资料 |
| `POST` | `/api/users/:id/follow` | ✅ | 关注/取消关注某用户 |
| `GET` | `/api/users/:id/following` | | 某用户关注列表(受隐私开关) |
| `GET` | `/api/users/:id/followers` | | 某用户粉丝列表(受隐私开关) |
| `GET` | `/api/users/me/privacy` | ✅ | 我的隐私开关 |
| `PATCH` | `/api/users/me/privacy` | ✅ | 更新隐私开关 |
| `GET` | `/api/categories` | | 全部一级板块 |
| `GET` | `/api/categories/:slug` | | 某科详情(含属列表) |
| `GET` | `/api/genera/:slug` | | 某属详情(含品种列表) |
| `GET` | `/api/species/:slug` | | 某品种完整图鉴 |
| `GET` | `/api/boards` | | 兼容旧接口,等同 /categories |
| `POST` | `/api/boards/follow` | ✅ | 关注一个板块(三级任一) |
| `DELETE` | `/api/boards/follow` | ✅ | 取消关注 |
| `GET` | `/api/boards/followed` | ✅ | 我关注的全部板块 |
| `GET` | `/api/posts` | | 帖子列表(按 category/genus/species/author/sort 过滤) |
| `POST` | `/api/posts` | ✅ | **发帖**(rich/short/vote/video/event)含权限校验 + ProseMirror JSON → sanitized HTML |
| `GET` | `/api/posts/:id` | | 帖子详情(含评论) |
| `POST` | `/api/posts/:id/like` | ✅ | 切换点赞 |
| `GET` | `/api/posts/:id/like` | ✅ | 查看当前用户是否已赞 |
| `POST` | `/api/posts/:id/collect` | ✅ | 切换收藏 |
| `POST` | `/api/posts/:id/comments` | ✅ | 发评论(纯文本,Demo) |
| `GET` | `/api/notifications` | ✅ | 通知列表(按时间倒序) |
| `POST` | `/api/notifications/read` | ✅ | 标记已读(`{ids:[...]}` 或 `{all:true}`) |
| `POST` | `/api/upload` | ✅ | 图片上传(multipart file,5MB,magic-byte 检测) |
| `GET` | `/api/drafts` | ✅ | 草稿列表 |
| `POST` | `/api/drafts` | ✅ | 保存草稿(带 id 则更新,否则新建) |
| `DELETE` | `/api/drafts/:id` | ✅ | 删除草稿 |
| **交易 / 订单 / 支付** | | | |
| `GET` | `/api/market/products` | | 商品列表(source/category/q/sort) |
| `POST` | `/api/market/products` | ✅ | C2C 发布(Lv.8 或 VIP) |
| `GET` | `/api/market/products/:id` | | 商品详情 |
| `POST` | `/api/market/products/:id/buy` | ✅ | 下单(支持地址 ID / 临时地址) |
| `GET` | `/api/market/categories` | | 按分类聚合 |
| `GET` | `/api/orders` | ✅ | 我的订单(role=buyer/seller) |
| `GET` | `/api/orders/:id` | ✅ | 订单详情 |
| `POST` | `/api/orders/:id/cancel` | ✅ | 取消待付款订单 |
| `POST` | `/api/orders/:id/ship` | ✅ | 卖家发货 |
| `POST` | `/api/orders/:id/confirm` | ✅ | 买家确认收货 |
| `POST` | `/api/orders/:id/review` | ✅ | 评价(星级+文字) |
| `POST` | `/api/payments` | ✅ | 创建支付单(Mock 二维码) |
| `GET` | `/api/payments/:payNo` | ✅ | 查询支付状态 |
| `POST` | `/api/payments/:payNo/confirm` | ✅ | Demo 用:触发 webhook,串联业务(扣库存/返利/VIP) |
| **VIP** | | | |
| `GET` | `/api/vip/plans` | | 5 档套餐(月/季/年/终身/积分) |
| `POST` | `/api/vip/order` | ✅ | 创建现金 VIP 订单 |
| `POST` | `/api/vip/exchange` | ✅ | 积分兑月卡(5000 积分 = 30 天) |
| `GET` | `/api/vip/me` | ✅ | 我的会员状态 + 最近 20 个订单 |
| **拍卖** | | | |
| `GET` | `/api/auctions` | | 拍卖列表(自动推进状态机) |
| `POST` | `/api/auctions` | ✅ | 发起拍卖(Lv.8 或 VIP) |
| `GET` | `/api/auctions/:id` | | 详情 + 最近 20 条出价 + 我的参与记录 |
| `POST` | `/api/auctions/:id/join` | ✅ | 报名(创建参与记录,depositStatus=pending) |
| `POST` | `/api/auctions/:id/bid` | ✅ | 出价(事务 + 防狙击 + 通知前一位领先者) |
| **地址簿** | | | |
| `GET` | `/api/addresses` | ✅ | 列表 |
| `POST` | `/api/addresses` | ✅ | 新增(首地址自动 default) |
| `PATCH` | `/api/addresses/:id` | ✅ | 修改(切换 default 会自动互斥) |
| `DELETE` | `/api/addresses/:id` | ✅ | 删除 |
| **求助帖** | | | |
| `POST` | `/api/posts` | ✅ | `type=help` + `help.urgency/bountyPoints` 即发求助帖,创建时扣悬赏 |
| `POST` | `/api/posts/:id/accept` | ✅ | 作者采纳某评论;若有悬赏,自动发给被采纳者 |
| **节日主题** | | | |
| `GET` | `/api/themes/active` | | 当前活跃主题(支持 `?at=ISO8601` 预览) |
| `GET` | `/api/themes/calendar` | | 全年 13 个主题的时间表 |
| `GET` | `/api/themes/preferences` | ✅ | 我的关闭列表 / 全局开关 |
| `PATCH` | `/api/themes/preferences` | ✅ | 修改节日主题偏好 |

### 尚未实现(将由 Next.js 后端继续承担)

- 帖子投票 / 活动报名(下一期)
- 积分流水明细 / 任务 / 活跃度 / 皮肤装扮
- 私信
- 前端 i18n 本体 + 法务文案(独立工作项)

---

## 🏮 节日主题系统

13 个节日,后端根据当前日期自动判定活跃主题,前端按返回的装饰元数据渲染。

| slug | 节日 | 窗口 | logo 徽章 | 头像徽章 | 粒子 |
| --- | --- | --- | --- | --- | --- |
| `spring-festival` | 春节 | 1.20 - 2.15 | 🏮 | 🧧 | 🧨 × 8 |
| `lantern` | 灯会 | 2.14 - 2.16 | 🏮 | 🌕 | 🏮 × 10 |
| `valentine` | 情人节·520·七夕 | 2.13-15 / 5.19-21 / 8.6-8 | 💝 | ❤️ | 💗 × 8 |
| `womens-day` | 女神节 | 3.7 - 3.8 | 🌷 | 🌹 | 🌸 × 8 |
| `arbor-day` | 植树节 | 3.10 - 3.13 | 🌲 | 🌱 | 🍃 × 8 |
| `earth-day` | 世界地球日 | 4.20 - 4.23 | 🌍 | 🌿 | 🌿 × 8 |
| `community-birthday` | 社区生日 | 5.1 - 5.3 | 🎉 | 🎂 | 🎊 × 12 |
| `childrens-day` | 儿童节 | 6.1 | 🎈 | 🧸 | 🎈 × 10 |
| `dragon-boat` | 端午节 | 6.3 - 6.9 | 🐉 | 🍃 | 🍃 × 6 |
| `mid-autumn` | 中秋节 | 9.13 - 9.18 | 🌕 | 🐰 | 🌙 × 6 |
| `national-day` | 国庆节 | 10.1 - 10.7 | 🇨🇳 | ⭐ | ⭐ × 10 |
| `halloween` | 万圣节 | 10.25 - 11.2 | 🎃 | 👻 | 🦇 × 8 |
| `christmas` | 圣诞新年 | 12.20 - 1.2(跨年) | 🎄 | 🎅 | ❄️ × 12 |

**用户可关闭**:单个主题 slug 加入 `users.disabledThemes`,或 `users.themesDisabled=true` 彻底关闭。

---

## ✍️ 富文本存储三件套(第二期核心)

与 Next.js `src/lib/richtext.ts` 对齐,帖子/评论的正文在 DB 里写三份:

| 字段 | 作用 | 来源 |
| --- | --- | --- |
| `content`(HTML) | 前端渲染用;已过 `bluemonday` sanitize | ProseMirror JSON 渲染或原始 HTML 清洗 |
| `contentJson`(JSON 字符串) | 权威源,前端 TipTap 再编辑 | 前端上送的 ProseMirror `doc` |
| `contentText`(纯文本) | 通知/搜索/列表预览 | HTML 剥标签 + 压缩空白 + 截断 |

调用方式:`/internal/richtext/richtext.go` 提供 `richtext.Process(Input)` 入口,传 `JSON` 优先,否则 `HTML`,最后 `Text`。

支持的 TipTap 节点:paragraph, heading(1-6), bulletList, orderedList, listItem, blockquote, codeBlock, hardBreak, horizontalRule, image + marks(bold, italic, underline, strike, code, link)。

### XSS 对抗(已通过)

| 载荷 | 结果 |
| --- | --- |
| `<script>alert(1)</script>` | 整体剥离 |
| `<img onerror="..."` | 事件属性剥离 |
| `href="javascript:..."` | URL 剥离,只留文字 |
| `<iframe>` | 整体剥离 |
| `style="background:url(js:...)"` | style 整体剥离 |
| `https://正常链接` | 保留 + 自动加 `rel=nofollow noopener noreferrer target=_blank` |

---

## 🛡️ 权限矩阵

与 Next.js `src/lib/levels.ts` 对齐,位于 `/internal/levels/levels.go`。

- **10 级 LEVELS**,每升一级解锁一组权限:`comment / post:short / post:collect / post:rich / post:image / post:video / market:buy / post:vote / post:event / market:sell / market:pin / badge:choose`
- **VIP** 可跳过大部分等级门槛(`VIPPermissions`)
- `levels.Has(level, isVip, perm)` 判断是否拥有权限
- `levels.ExpProgress(exp)` 返回离下一级的 exp 进度(`/api/auth/me` 已挂载)

---

## 🔐 与 Next.js 的 JWT 兼容

**完全兼容**。关键点:
- 签名算法:**HS256**
- Payload:`{ sub: userId, iat, exp }`(与 Next.js `src/lib/auth.ts` 一致)
- Cookie 名:`rouyou_token`(可通过 `AUTH_COOKIE_NAME` 环境变量覆盖)
- 密钥:`JWT_SECRET`(必须和 Next.js 一致)

这意味着 Next.js 种的 cookie,Go 能读;Go 种的 cookie,Next.js 也能读。**同一个浏览器可以同时访问两个后端,登录态互通**。

---

## 🗂️ 目录结构

```
server-go/
├── cmd/server/main.go          # 入口
├── internal/
│   ├── config/config.go        # 环境变量加载 + Prisma URL 转 GORM DSN
│   ├── db/db.go                # GORM + MySQL 连接池
│   ├── models/models.go        # GORM Model(对应现有 Prisma schema 的表)
│   ├── middleware/
│   │   ├── auth.go             # JWT 解析,RequireUser,SignToken
│   │   └── cors.go             # CORS
│   ├── httpx/
│   │   ├── response.go         # 统一 { ok, data, error } 响应
│   │   ├── serialize.go        # User / Post / Board / Species DTO
│   │   └── counts.go           # 常用 count helpers
│   ├── richtext/richtext.go    # bluemonday sanitize + PM-JSON → HTML + 纯文本提取
│   ├── levels/levels.go        # 10 级等级 + VIP 权限矩阵 + expProgress
│   ├── uploadx/upload.go       # 图片字节流落盘(public/uploads/{userId}/{yyyymm}/)
│   └── api/
│       ├── auth.go             # /auth/* (+ expProgress 挂载)
│       ├── users.go            # /users/*, /users/me/privacy
│       ├── boards.go           # /categories, /genera, /species, /boards/*
│       ├── posts.go            # /posts CRUD, /posts/:id/*
│       ├── notifications.go    # /notifications, /notifications/read
│       ├── upload.go           # /upload (multipart)
│       ├── drafts.go           # /drafts CRUD
│       └── utils.go
├── Dockerfile
├── docker-compose.yml
├── go.mod / go.sum
└── README.md
```

---

## ✅ 健康检查

```bash
curl http://localhost:8080/health
# {"ok":true,"service":"plants-community-go"}
```

## 🧪 常用调试命令

```bash
# 拿一个登录 cookie
curl -c /tmp/ck -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"多肉阿绿","password":"123456"}' \
  http://localhost:8080/api/auth/login

# 带 cookie 访问需要鉴权的接口
curl -b /tmp/ck http://localhost:8080/api/auth/me

# 测三级板块
curl http://localhost:8080/api/categories/xianrenzhang
curl "http://localhost:8080/api/genera/astrophytum?category=xianrenzhang"
curl "http://localhost:8080/api/species/dou?genus=astrophytum"
```
