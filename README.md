# 🌵 肉友社 · 多肉植物论坛

一个面向多肉植物爱好者的全栈社区。基于 **Next.js 14 + TypeScript + Tailwind CSS + Prisma + MySQL + JWT**,
前后端同仓,清新绿植风 UI,PC + 移动端响应式。

> 🆕 v0.22 新增:**Mock 数据彻底清理 / npm scripts 整合**
> - `src/mock/` 目录已删除(8 文件 800+ 行死代码),全站运行 100% 走 Prisma + MySQL
> - 新增 npm scripts:`db:reseed`(一键 reset+seed)、`alipay:probe` / `wechat:probe`(沙箱探针)、`feed:refresh`(刷 hotScore)
>
> 🆕 v0.21 新增:**移动端深度适配 - 6 项核心交互**
> - **BottomSheet** 通用底部抽屉(拖动关闭+ESC+body lock+200ms 动画)
> - **MobileActionBar** 帖子粘底操作栏(`md:hidden` + safe-area + 分享 BottomSheet)
> - **SwipeBack** 左边缘 24px 拖回手势 → router.back
> - **Lightbox** 全屏图片查看(左右滑切图+上下滑关闭+键盘)
> - **usePullToRefresh** 通用下拉刷新 + 三态指示器(已接 Home/Notifications/Orders)
> - **ImageGallery** 自适应网格(1张大/2等分/3 IG 式/4+ 田字 + +N 遮罩)
> - **viewport meta** + safe-area-inset / overflow-x:hidden / tap-highlight 透明
> - 私信页移动端单视图切换;Tab bar active 缩放+蓝点指示;FAB 阴影;Checkout 粘底金额条
>
> 🆕 v0.20 新增:**高级 Feed 推荐 + 热度算法**
> - Post.hotScore 字段 + PostView 模型(IntersectionObserver 上报)
> - 推荐公式:`log10(1+互动) / (hours+2)^1.6 × {VIP 1.1, cover 1.05, 24h boost 1.3}`
> - `/api/feed?tab=recommend|following|hot|latest` 4 tab 统一接口 + cursor 分页
> - 个性化:loadUserProfile 30s 缓存(follows + boardFollows + 30 天 PostView 算 categoryAffinity)
> - personalize:关注作者 +0.8、关注板块 +0.4、cat affinity scale 0.5~1.5
> - `scripts/feed-refresh.mjs` 定时刷分(建议 cron 10 分钟一跑)
> - 单元测试:23/23(原 17 + 新 6 ranker)
>
> 🆕 v0.19 新增:**实时通知 + 私信 SSE**
> - `/api/sse/connect` 长连接端点(ReadableStream + 30s heartbeat + abort cleanup)
> - `realtimeBus` 进程内 EventBus(global HMR 友好)
> - emit 挂接 4 处:评论 / 点赞 / 关注 / 私信
> - `RealtimeProvider` + `useRealtime`:EventSource + 指数退避重连 + 隐藏标签暂停
> - Header 未读徽标、`/messages` 收到消息实时追加
> - 端到端测通:u2 关注 u1 → u1 立即收到通知
>
> 🆕 v0.18 新增:**管理后台 17 页全套**
> - 1 轮(基础架构 + 帖子审核 + 举报)
> - 2 轮(用户/商品/订单/拍卖/版块)
> - 3 轮(日志/公告/徽章/任务/主题/品种)
> - schema 加 UserRole/AdminLog/Announcement/Report 等
> - 累计 14 个 admin API,所有变更落 AdminLog 审计
>
> 🆕 v0.17 新增:**checkout 收尾 / 地址簿 / Toolbar / post 核心组件 / messages i18n**


> 🆕 v0.3 新增:**交易区 / 积分系统 / 月度活跃度 / 大会员订阅 / 等级权限 / 皮肤装扮**
> 完整业务闭环 + 微信&支付宝 Mock 支付,无缝可扩展为真实生产环境。
>
> 🆕 v0.4 新增:**TipTap 富文本编辑器 / 图片上传 / 双存储(JSON + sanitized HTML)**
> 帖子正文 / 活动描述 / 商品描述 / 评论 / 订单评价 全部升级为富文本,支持图片上传。
>
> 🆕 v0.5 新增:**拍卖会(英式递增 + 防狙击 + 保证金) / 收货地址簿 / 三模式地址选择**
> 完整拍卖闭环:发布 → 付保证金 → 竞价 → 防狙击延时 → 自动结算 → 胜出付尾款。
> 下单页支持 已有地址 / 新建地址 / 临时填写 三种 tab 切换。
>
> 🆕 v0.6 新增:**三级板块体系(科/属/品种) / 581 个多肉品种**
> 板块由 **Category(科)→ Genus(属)→ Species(品种)** 三层构成。
> 路由 `/board/[科]/[属]/[品种]`,帖子可挂到任一层级。
> 包含星球属、乌羽玉属、银冠玉属、陀螺球属、岩牡丹属、生石花属、十二卷属等 60 个属。
>
> 🆕 v0.7 新增:**板块关注 / 社交隐私开关 / 关注/粉丝 Tab**
> - 用户可关注任一层级的板块(科/属/品种),侧栏「我的关注」tab 置顶展示
> - 查看任意用户的「关注/粉丝」列表(独立 Tab)
> - 两个独立隐私开关(`显示关注列表 / 显示粉丝列表`),默认开启
>
> 🆕 v0.8 新增:**图鉴真实图 + Go 后端(一/二/三期)+ 求助帖 + 节日主题**
> - 图鉴(Species)的 cover 和 gallery 替换为 Wikimedia Commons 真实植物照片
> - Go 后端 POC([server-go/](/Users/duxing/Desktop/plants_community/server-go/)):Gin + GORM + MySQL
>   - 与 Next.js **数据库共用、JWT 兼容**,端口 8080
>   - **66 个 API** 已实现:auth / users / posts / boards / 通知 / 图片上传 / 草稿 / Market / Orders / 支付 / VIP / 拍卖(状态机+防狙击+保证金)/ 地址簿 / 求助帖 / 节日主题
>   - 自研 ProseMirror JSON → sanitized HTML,XSS 防护对齐 Next.js
>   - 10 级权限矩阵 + VIP 通道
> - **新玩法**:
>   - 求助帖 `type=help`:支持 `urgency` + `bountyPoints` 悬赏 + 作者采纳,被采纳者自动收到悬赏积分
>   - 节日主题:13 个节日(春节/中秋/万圣节/圣诞等),按日期自动投放,用户可关闭
>
> 🆕 v0.9 新增:**节日主题前端落地 + 5 语种国际化 + 用户协议页**
> - 顶部节日横幅 + Logo 旁装饰 + 头像右上角徽章 + 背景粒子动画(CSS keyframes)
> - 5 语种 i18n:`zh-CN / zh-TW / en / ja / ko`,580 条核心文案
>   - 轻量自研方案(Context + cookie + API 按需加载 JSON),兼容现有 App Router
>   - 翻译按 namespace 分文件:common / nav / auth / settings / post / theme
>   - Header 顶部新增语言切换器,`/settings/appearance` 提供外观与语言设置
> - `/terms` 用户协议(中英双语,按当前 locale 自动切换),遵循中国大陆《个人信息保护法》+ GDPR 双线
>
> 🆕 v0.10 新增:**合规齐活 — 隐私/Cookie 政策 + Cookie banner + 注册合规**
> - `/privacy` 隐私政策(中英双版,GDPR + 保法双线,包含 9 大类用户权利、跨境传输、72h 泄露通报等)
> - `/cookies` Cookie 政策(四分类:必要/功能/分析/广告)
> - Cookie 同意横条:底部浮层三按钮「全部接受/仅必需/自定义」,自定义面板逐项勾选
>   - localStorage 持久化,6 个月过期重新询问;`/settings` 提供「重新管理」入口
> - 注册页 `/register` 合规改造:
>   - 「我已满 14 周岁」复选框
>   - 「同意用户协议 + 隐私政策」复选框(带新页签打开链接)
>   - 两项均未勾时提交按钮禁用,错误提示走 i18n
> - 登录 / 注册页文案接入 i18n,5 语种均可切换
> - i18n 翻译条目从 580 → **715**(新增 `cookie` namespace + `privacyPolicy`/`cookiePolicy`/`reopenCookie`/`ageConfirm`/`agree` 等 key)
>
> 🆕 v0.11 新增:**法务文案 5 语种齐备 + Accept-Language 精准协商**
> - `/terms`、`/privacy`、`/cookies` 三份法务文案补齐 **繁中 / 日 / 韩** 三个语种
>   - 每份文案按各自语种法律文化撰写(日文用「当社/本サービス」、韩文用敬语体)
>   - 保持相同结构(用户协议 9 章,隐私 10 章,Cookie 政策 5 节),方便日后批量修订
>   - 页面按 `useI18n().locale` 精准分发,未命中语种回退到 zh-CN
> - `negotiateLocale()` 改为按 Accept-Language 优先级解析(只看第一段),
>   避免 `ko-KR,ko;q=0.9,en;q=0.8` 被误判为 `en`
> - 15 种「locale × 文案」组合实测全部通过
>
> 🆕 v0.12 新增:**editor/列表页 i18n 覆盖 + 单元测试 + 合规 README**
> - 新增 4 个 i18n namespace:`editor / market / auction / detail`
> - 翻译条目 715 → **1415 条**(5 语 × 283 key,几乎翻倍)
> - 发帖页 `/editor`、`/market`、`/auction`、Header 用户菜单 全面接入 i18n
> - **单元测试**落地:
>   - TS 端 3 个 spec,10 case:i18n 完整性 / 主题窗口 / 语言协商(`npm test`)
>   - Go 端 3 个 package,29 case:主题 / 等级权限 / 富文本 XSS(`go test ./internal/...`)
>   - i18n 完整性测试强制:**任一 key 漏翻译就红**(以 zh-CN 为基准比对 4 个其他 locale 的 key 集合)
> - README 补合规免责声明与 i18n 拓展指南(加新语言 / 加新 key 的 SOP)
>
> 🆕 v0.13 新增:**/orders /vip /post 详情 i18n + 农历节日精确化 + 更多测试**
> - 新增 2 个 i18n namespace:`orders / vip`,共 75 条 key × 5 语种
> - 翻译条目 1415 → **1790 条**(5 语 × 358 key)
> - `/orders`、`/vip`、`/post/[id]` 详情三个页面全面接入 i18n
>   - OrderRow 里 7 个状态标签、Ship/Review/Refund 三个 modal 全走翻译
>   - VIP 套餐卡(月/季/年/终身/积分兑换)按 locale 自动切语言
>   - 帖子详情 server component 用 `<I18nText>` 辅助组件兼顾 SSR + 翻译
> - **农历节日精确化**(春节/元宵/端午/中秋)
>   - `src/lib/lunar.ts` + `server-go/internal/themes/lunar.go` 双端查表,覆盖 2025-2035
>   - 活跃判定:当年在查表范围→按农历;超出范围→回退公历窗口
>   - 新增 4 + 4 个测试用例(Go + TS)覆盖农历命中 / 边界 / 跨年 / fallback
> - 总测试 case:**39 → 47**(TS 14 + Go 33)全绿
>
> 🆕 v0.14 新增:**/board + /user + /tasks + editor 收尾 i18n + Alipay sandbox 框架**
> - 新增 6 个 i18n namespace:`board / user / tasks / checkout / messages`(+ 已有 editor 扩充)
> - 翻译条目 1790 → **2575 条**(5 语 × 515 key)
> - **已接入 i18n 页面**:`/board` 三级页(分类/属/品种)、`/user/[id]`、`/tasks`、`/editor` 剩余 toast、Header 菜单全部清零
> - **支付网关抽象**(`src/lib/payment/gateway.ts`):
>   - `PaymentGateway` interface:`createPayment` / `queryStatus` / `verifyWebhook`
>   - `MockGateway`(默认)+ `AlipayGateway`(支持 sandbox + 生产)
>   - `pickGateway()` 按 `PAYMENT_GATEWAY` 环境变量切换,其它代码零改动
>   - 新增 `POST /api/payments/alipay/webhook` 路由,验签后调用现有 `confirmPayment`
>   - 失败自动回退 mock 二维码,保证 Demo 不中断
> - 跑通 16 个关键页面 + 47 个测试全绿
>
> 🆕 v0.19 新增:**图鉴 / 下单 modal / 拍卖卡 / 地址组件 / 首页卡 / 权限 gate i18n**
> - **新增 2 个 namespace**:`plants`(15 key 含 family × 5 latin-ish 标识)、`home`(25 key 含 signIn/topics/recommend/feedTabs),翻译源 namespace 合计 22 个
> - 扩展 `addresses.form`(+24 key)、`addresses.picker`(+21 key)、`market.buy`(+21 key)、`auction.card/status/countdown`(+20 key)、`common.permission`(+5 key)、`post.typeShort`(+6 key)
> - 翻译条目 4630 → **5255 条**(5 语 × 1051 key,+625 条),文件 100 → **110 个**
> - 本轮接入的文件:
>   - `/plants` 图鉴列表:科属过滤改为 **latin-ish key**(Crassulaceae / Aizoaceae / Liliaceae / Cactaceae / Euphorbiaceae),同时兼容 mock 里中文 family 字符串,过滤逻辑 locale 无关
>   - `components/address/AddressForm.tsx`(21 处 field/error + tag 预设双向匹配中文/译文)
>   - `components/address/AddressPicker.tsx`(3 tab + 内联 6 字段 + 嵌套 InlineForm 自己调用 useI18n)
>   - `validateAddressPicker(v, translator?)` 改签名:可选传入 t,不传回落中文(向后兼容)
>   - `app/market/[id]/ProductDetailClient.tsx`(下单 modal 全量:数量/库存/地址/合计/返积分)
>   - `components/auction/AuctionCard.tsx` + `Countdown` + `StatusBadge`(4 状态 + 4 档倒计时)
>   - `components/home/SignInCard.tsx`(欢迎/签到 streak/周日历,week days 用逗号分隔串 i18n)
>   - `components/home/TopicsCard.tsx` / `FeedTabs.tsx` / `RecommendUsers.tsx`
>   - `components/ui/PostTypeBadge.tsx` 改用 `<I18nText k="post.typeShort.${type}">`(保持 server 可渲染)
>   - `components/ui/PermissionGate.tsx`(登录/权限不足/升级/VIP CTA)
> - 硬编码扫描:906 → **806 处**(-100),累计消灭 **559 处(-41%)**
> - 30 次(5 语 × 6 页)body 裸 key 扫 **全 0**,14 个核心页 HTTP 全 200
>
> 🆕 v0.18 新增:**市场全量 / 皮肤卡 / 板块按钮 / 全站导航 i18n**
> - 扩展 `market`(44→107 key 含 hero/detail/sell/card)、`points.skin`(10→19 含 rarity/preview/exchange)、`detail.board`(5→9 含 followShort/followFull/opFail)、`nav`(新增 sidebar 子命名空间 21 key:myFollowing/hot/currentAccount/maxLevel/expToNext/statPosts 等)
> - 翻译条目 4180 → **4630 条**(5 语 × 926 key,+450 条)
> - 已接入 i18n 的新文件:
>   - `/market` + `/market/[id]` + `/market/sell`(hero banner/交易须知/卖家卡/上架表单 30+ field/标签输入)
>   - `components/market/ProductCard.tsx`(官方/肉友标签、返积分、卖家名、已售罄)
>   - `components/skin/SkinCard.tsx`(稀有度 4 等级 + 装备/卸下/兑换 + VIP 限定 + 气泡预览)
>   - `components/board/BoardCard.tsx` + `FollowBoardButton.tsx`(members/posts + follow/following/opFail)
>   - `components/layout/Sidebar.tsx`(主导航 11 项 + 关注/热门 tab + 等级进度 + 3 项统计 + 版权)
>   - `components/layout/MobileNav.tsx`(14 项抽屉导航 + 登录注册 CTA)
>   - `components/layout/MobileTabBar.tsx`(底部 5 tab)
> - 硬编码扫描 1000 → **906 处**(-94),5 语 body 裸 key 持续 0
> - 5 语 × 5 页 × 25 次裸 key 扫全 0,15 个核心页 HTTP 全 200
>
> 🆕 v0.17 新增:**checkout 收尾 / 地址簿 / Toolbar / post 核心组件 / messages i18n**
> - 新增 1 个 i18n namespace:`addresses`;扩展 `checkout`(44→71 key)、`editor`(76→102 key 含 toolbar)、`detail`(25→58 key 含评论/投票/活动)、`post`(18→29 key 含 typeDesc/typeBadge)
> - 翻译条目 3385 → **4180 条**(5 语 × 836 key,+795 条)
> - 已接入 i18n 的新文件:
>   - `/checkout/[orderId]`、`/checkout/auction/[orderId]`、`/checkout/vip/[orderId]` 三份支付页收尾(状态/地址/QR/担保提示/mock 按钮全部翻译)
>   - `/addresses` 地址簿(toast/modal/tips/tag icon 按 locale 动态匹配)
>   - `/messages` 私信页(入口/输入/会话列表/empty)
>   - `components/richtext/Toolbar.tsx` 31 处 tooltip + 图片/链接 Dialog
>   - `components/post/CommentSection.tsx`(评论排序/输入/回复)
>   - `components/post/PostBody.tsx`(投票卡/活动卡/图片轮播)
>   - `components/post/PostActions.tsx`(点赞/收藏/分享)
>   - `components/post/TypePicker.tsx`(5 种帖子类型选择器)
> - 硬编码扫描报告:1202 → **1000 处**(-202)
> - 5 语种实测 body 0 裸露 key,19 个核心页 HTTP 全 200
>
> 🆕 v0.16 新增:**拍卖 / checkout / points 大面积 i18n**
> - 新增 1 个 i18n namespace:`points`,并大幅扩展 `auction` / `checkout`(auction 61→140 key,checkout 17→44 key)
> - 翻译条目 2600 → **3385 条**(5 语 × 677 key,增加 785 条)
> - 已接入 i18n 的新页面:
>   - `/auction/[id]` 拍卖详情 200+ 硬编码处理到位(状态标签/出价面板/保证金对话框/规则/面包屑全翻译)
>   - `/auction/new` 发起拍卖表单(所有 field label/placeholder/错误提示/按钮)
>   - `/checkout/[orderId]` + `/checkout/auction/[orderId]` + `/checkout/vip/[orderId]`(toast/错误提示)
>   - `/points` 积分中心(6 个 tab + 14 种流水类型 + 余额卡全部 i18n)
> - 硬编码扫描报告:1365 处 → **1202 处**(-163)
> - 5 语种实测 body 0 裸露 key,10 个核心页 HTTP 200
>
> 🆕 v0.15 新增:**i18n 切换卡死 bug 修复 + 工具链 + Go 支付抽象**
> - **修 BUG**(用户反馈):切换繁中时页面卡死 + 显示 `nav.home` 等裸 key
>   - **根因 1**:`useEffect` deps 含 `cache`,effect 内又 `setCache` → 无限重入死循环
>   - **根因 2**:SSR 阶段 `cacheRef` 为空,`t('nav.home')` 直接返回 key(server render 出裸 key)
>   - **根因 3**:JSON 文件顶级本身带 namespace 前缀,合并时多套一层 → `cacheRef.current.nav.nav.home` 查不到
>   - **修复**:cache 改用 `useRef` + `tick` 触发 re-render;layout.tsx SSR 预加载 messages 传 `initialMessages` prop;server/API 统一 `Object.assign(merged, json)` 不再加 ns 前缀;`setLocale` 先 await 加载再切 state;inflight Map 去重同 locale fetch
>   - **结果**:5 语种顶部 nav 完美切换,0 裸 key,实测 16 页 HTTP 200
> - UserPageClient 剩余子组件(`BadgeWall` / `AboutTab` / `FollowListTab` / `FollowedBoardsTab`)全部接入 i18n
> - editor 小贴士 + 类型标签 + LV 提示全接翻译
> - 新增 `scripts/i18n-scan.mjs`:扫全站 tsx 文件中文硬编码,按文件和目录排序,给出 i18n 迁移优先级清单(当前 191 文件中 134 含 1365 处硬编码)
> - **Go 端支付网关抽象** `server-go/internal/paymentgw/gateway.go`:
>   - `Gateway` interface + `MockGateway` + `AlipayGateway` 框架
>   - `AlipayClient` interface 供使用方接 alipay-sdk-go 或自行组装 RSA2 签名 HTTP client
>   - `Pick(client, notifyURL)` 按 `PAYMENT_GATEWAY` 环境变量切换,client 缺失自动回退 Mock
>   - 6 个单元测试:Mock/Alipay 创建/状态查询/webhook 验签/工厂回退
> - 翻译条目 2575 → **2600 条**;Go 测试 29 → **33 case**

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

#### 论坛核心

| 路由 | 说明 |
| --- | --- |
| `/` | 首页(Banner 轮播 + 推荐流 Tabs + 签到卡 + 热门话题 + 推荐肉友) |
| `/board` | 全部板块(按 科/讨论区/市场 分组) |
| `/board/[科]` | 一级板块(展示该科旗下所有属 + 最新讨论) |
| `/board/[科]/[属]` | 二级板块(展示该属所有品种 + 讨论) |
| `/board/[科]/[属]/[品种]` | 三级子板块(品种图鉴 + 讨论) |
| `/post/[id]` | 帖子详情(5 种类型 + 评论 + 点赞/收藏/分享) |
| `/editor` | 发帖/草稿(三级板块级联选择器) |
| `/user/[id]` | 个人主页(徽章墙 + EXP 进度条 + VIP 标识 + Tab) |
| `/messages` | 私信 |
| `/notifications` | 通知中心 |
| `/plants` | 多肉图鉴(按科属筛选,点击跳 `/board/[科]/[属]/[品种]`) |
| `/plants/[slug]` | 301 重定向到新三级路径 |
| `/about` | 关于我们 |
| `/login`,`/register` | 登录 / 注册 |
| `/settings/privacy` | 🆕 隐私设置(显示关注列表 / 显示粉丝列表 两个开关) |
| `/user/[id]?tab=following` | 🆕 某用户关注列表(受隐私开关控制) |
| `/user/[id]?tab=followers` | 🆕 某用户粉丝列表(受隐私开关控制) |
| `/user/[id]?tab=followed-boards` | 🆕 我关注的板块(仅本人可见) |

#### 🆕 商业化模块

| 路由 | 说明 |
| --- | --- |
| `/market` | 交易市场首页(官方甄选 + 肉友 C2C + 拍卖入口 + 分类筛选) |
| `/market/[id]` | 商品详情 + 立即购买(三模式地址选择 + 数量) |
| `/market/sell` | C2C 发布商品(需 Lv.8+ 或 VIP) |
| `/auction` | 🆕 拍卖会主页(进行中 / 即将开拍 / 已结束) |
| `/auction/[id]` | 🆕 拍卖详情(实时倒计时 + 出价记录 + 参拍弹框) |
| `/auction/new` | 🆕 发布拍卖表单 |
| `/addresses` | 🆕 收货地址簿(CRUD + 默认地址) |
| `/orders` | 订单中心(我买的 / 我卖的,普通订单 + 拍卖订单) |
| `/checkout/[orderId]` | 订单支付页(微信/支付宝 二维码 + Mock 完成) |
| `/checkout/auction/[orderId]` | 🆕 拍卖胜出订单尾款支付(地址 + 二维码) |
| `/checkout/vip/[orderId]` | 大会员支付页 |
| `/points` | 积分中心(余额 + 皮肤商城 4 类 + 我的装扮 + 流水) |
| `/tasks` | 月度活跃度中心(每日/月度/成就任务 + 阶梯奖励 + 月度排行榜) |
| `/vip` | 大会员开通(月卡 / 季卡 / 年卡 / 终身 / 积分兑月卡) |

### API(全部挂在 `/api`)

#### 论坛核心

| 路径 | 方法 | 作用 |
| --- | --- | --- |
| `/auth/{register,login,logout}` | POST | 注册/登录/登出 |
| `/auth/me` | GET | 当前用户(含 EXP/积分/VIP/装扮) |
| `/auth/signin` | POST | 签到(触发事件总线) |
| `/boards`, `/boards/[slug]` | GET | 板块 |
| `/posts` | GET / POST | 帖子列表 / 发帖(权限校验) |
| `/posts/[id]` | GET | 帖子详情 |
| `/posts/[id]/{like,collect,vote,attend,comments}` | POST | 互动 |
| `/conversations`, `/conversations/[peerId]`, `/messages` | - | 私信 |
| `/notifications`, `/notifications/read` | - | 通知 |
| `/plants`, `/plants/[slug]` | GET | 图鉴 |
| `/users`, `/users/[id]`, `/users/[id]/follow` | - | 用户 |
| `/drafts`, `/drafts/[id]` | - | 草稿 |
| `/banners` | GET | Banner |
| `/levels` | GET | 等级表 + 权限定义 |

#### 🆕 商业化模块

| 路径 | 方法 | 作用 |
| --- | --- | --- |
| `/market/products` | GET / POST | 商品列表 / C2C 上架 |
| `/market/products/[id]` | GET | 商品详情 |
| `/market/products/[id]/buy` | POST | 下单(创建订单返 orderId) |
| `/market/categories` | GET | 分类聚合 |
| `/orders` | GET | 我的订单(role=buyer/seller) |
| `/orders/[id]` | GET | 订单详情 |
| `/orders/[id]/{cancel,ship,receive,review,refund}` | POST | 订单状态推进 |
| `/payments` | POST | 创建支付单(订单或 VIP) |
| `/payments/[payNo]` | GET | 查询支付状态(自动处理过期) |
| `/payments/[payNo]/confirm` | POST | Mock 支付完成(等同 webhook) |
| `/points/me` | GET | 我的积分汇总 |
| `/points/ledger` | GET | 积分流水 |
| `/skins` | GET | 皮肤商城(可按 kind 过滤) |
| `/skins/[id]/exchange` | POST | 兑换皮肤 |
| `/wardrobe` | GET | 我的装扮箱 |
| `/wardrobe/equip` | POST | 装备 / 卸下皮肤 |
| `/tasks` | GET | 我的任务列表(daily/monthly/achievement) |
| `/tasks/claim` | POST | 领取任务奖励 |
| `/activity/me` | GET | 我的本月活跃度 + 排名 |
| `/activity/ranking` | GET | 月度排行榜 |
| `/activity/rewards` | GET | 阶梯奖励列表 + 我的进度 |
| `/activity/rewards/[id]/claim` | POST | 领取活跃度奖励 |
| `/vip/plans` | GET | 套餐 |
| `/vip/me` | GET | 我的会员状态 |
| `/vip/order` | POST | 创建 VIP 现金订单 |
| `/vip/exchange` | POST | 用积分兑换月卡 |
| 🆕 `/addresses` | GET / POST | 我的地址簿 / 新增地址 |
| 🆕 `/addresses/[id]` | PATCH / DELETE | 修改 / 删除地址 |
| 🆕 `/addresses/[id]/default` | POST | 设为默认地址 |
| 🆕 `/auctions` | GET / POST | 拍卖列表 / 发布拍卖 |
| 🆕 `/auctions/[id]` | GET | 拍卖详情(含出价、参与者) |
| 🆕 `/auctions/[id]/join` | POST | 参拍(创建参与者 + 拉起保证金支付) |
| 🆕 `/auctions/[id]/bid` | POST | 出价(自动防狙击延时) |
| 🆕 `/auctions/[id]/cancel` | POST | 取消拍卖(仅在无人出价时) |
| 🆕 `/orders/[id]/address` | POST | 给订单指定收货地址(用于拍卖订单付款前) |
| `/payments` 增强 | POST | bizType 增加 `deposit` / `auction_balance` |
| 🆕 `/boards/follow` | POST / DELETE | 关注 / 取消关注某个板块(含类型:category/genus/species) |
| 🆕 `/boards/followed` | GET | 我关注的全部板块(混合三种类型,按时间倒序) |
| 🆕 `/users/[id]/following` | GET | 某用户的关注列表(受隐私开关控制,403 可被拦截) |
| 🆕 `/users/[id]/followers` | GET | 某用户的粉丝列表(受隐私开关控制) |
| 🆕 `/users/me/privacy` | GET / PATCH | 获取 / 更新隐私开关 |

## 🧩 5 种帖子类型

| 类型 | 能否 APP 发布 | 详情页表现 |
| --- | --- | --- |
| `rich` 富文本 | ✅ | HTML 正文 + 图集 |
| `short` 短内容 | ✅ | 纯文本 + 图集 |
| `video` 视频 | ✅ | 内嵌 `<video>` 播放器 |
| `vote` 投票 | ❌ 仅 PC | 单/多选投票,结果进度条,支持改投 |
| `event` EVENT | ❌ 仅 PC | 活动卡(时间/地点)+ 报名计数 |

## 🛡️ 等级与权限

社区按 EXP 累计自动升级,共 10 级,每级解锁不同权限。所有写入 API 都做权限拦截,前端 `<PermissionGate>` 同步给出友好提示。

| Lv | 名称 | EXP 阈值 | 解锁权限 |
| --- | --- | --- | --- |
| 1 | 新苗 | 0 | 评论 / 短内容贴 |
| 2 | 小苗 | 50 | 收藏 |
| 3 | 幼株 | 150 | 富文本贴 |
| 4 | 青株 | 350 | 帖子带图 |
| 5 | 成株 | 700 | 视频贴 / 交易区购买 |
| 6 | 大株 | 1200 | 投票贴 |
| 7 | 老桩 | 2000 | EVENT 贴 |
| 8 | 园艺师 | 3500 | 交易区出售 |
| 9 | 大师 | 6000 | 申请置顶 |
| 10 | 宗师 | 10000 | 自选展示徽章 |

**👑 大会员 VIP**:开通后所有发帖 / 出售权限**无视等级直接解锁**,并享受:
- 股东标识 + 金色变色昵称 + 专属皇冠头像框
- 专属评论气泡 / 钻石点赞 / 尊享表情包
- **10x 活跃度 / 积分 / 经验加成**(发帖原本 +20,VIP 直接 +200)

## 🔨 拍卖会

**英式递增拍卖 + 保证金机制 + 防狙击延时**。任何 Lv.8+ 用户(或大会员)都能发起拍卖。

### 流程

```
┌─ 卖家 ─────────────────────────────────┐
│ 发起拍卖(标题/起拍价/加价幅度/保证金/  │
│           截止时间/防狙击分钟)         │
│                                        │
│ → /auction/new 表单                    │
└──────┬─────────────────────────────────┘
       │
       ▼
┌─ 买家(任意有 market:buy 权限的用户) ─┐
│ 1. 进入 /auction/[id] 详情页           │
│ 2. 点「先支付保证金」→ 选支付方式:     │
│    - 微信 / 支付宝(扫码 + Mock 支付)  │
│    - 积分(¥1 = 100 积分)              │
│ 3. 保证金到账后才能出价                │
│ 4. 出价必须 ≥ 当前价 + 加价幅度          │
│ 5. 最后 N 分钟有人出价 → 自动延时 N 分钟 │
│ 6. 一口价(若有) → 立即结束拍卖        │
└──────┬─────────────────────────────────┘
       │  到期
       ▼
┌─ 系统自动结算 ─────────────────────────┐
│ ✓ 决出最高价(若 ≥ 保留价)            │
│ ✓ 生成胜出订单(总额 = 中标价)         │
│ ✓ 胜出者保证金 → 抵扣到尾款            │
│ ✓ 其他参与者保证金 → 等值积分退还       │
│ ✓ 流拍 → 全员退还                       │
│ ✓ 卖家、胜者、所有参与者发通知          │
└──────┬─────────────────────────────────┘
       │
       ▼
┌─ 胜出者:24h 内付尾款 ──────────────────┐
│ /checkout/auction/[orderId]:           │
│ 1. 选择收货地址(已有/新建/临时)        │
│ 2. 微信 / 支付宝 二维码 → 支付尾款       │
│ 3. 订单状态 → 待发货,卖家收通知         │
└────────────────────────────────────────┘
```

### 状态机

```
Auction.status:  scheduled → live → finished | cancelled
Auction.result:           ↘ won (订单已生成) → paid
                          ↘ no_bidder(流拍)
                          ↘ defaulted(违约,Demo 暂未实现自动罚没)

DepositStatus:   pending → held → applied(胜出抵扣)
                              ↘ refunded(未胜出 / 流拍 / 取消)
                              ↘ forfeited(违约罚没)
```

### 关键设计点

- **Lazy 状态推进**:无定时任务,任意 GET 拍卖列表 / 详情 时自动推进过期场次,适合 Demo 与中小型场景
- **防狙击**:剩余时间小于 `antiSnipeMinutes` 时有出价,`endAt` 自动延长 `antiSnipeMinutes` 分钟
- **保证金抵扣**:胜出订单 `totalPrice = 中标价`,`depositPaid` 字段记录已抵扣保证金,`实付尾款 = totalPrice - depositPaid`
- **保证金退还**:Demo 中以等值积分(¥1 = 100 积分)退给未胜出者(真实生产可走原支付渠道)
- **复用现有支付通道**:`POST /api/payments` 的 `bizType` 增加 `deposit` 与 `auction_balance` 两个值,接其他 Mock 支付流程

## 📦 收货地址簿

完整 CRUD + 默认地址机制。下单时支持三种模式 tab 切换:

| 模式 | 行为 |
| --- | --- |
| **📚 已有地址** | 从地址簿选取(默认勾选「默认地址」) |
| **➕ 新建并保存** | 当场填写,提交订单时同时入地址簿(可选标记为默认) |
| **✏️ 临时填写** | 仅本次订单使用,不入地址簿 |

API 入参方式:
```ts
// 模式 1
POST /api/market/products/[id]/buy
  { addressId, quantity }

// 模式 2
POST /api/market/products/[id]/buy
  { shipName, shipPhone, shipAddress, saveAddress: true, saveAsDefault?, quantity }

// 模式 3
POST /api/market/products/[id]/buy
  { shipName, shipPhone, shipAddress, quantity }
```

拍卖胜出订单的「补地址」走 `POST /api/orders/[id]/address`,接受同样的三模式参数。

UI 组件 [`<AddressPicker>`](/Users/duxing/Desktop/plants_community/src/components/address/AddressPicker.tsx) 在普通商品下单与拍卖尾款支付页都被复用,通过 `pickerValueToOrderBody()` 统一生成 API 入参。

## 💎 积分系统

获取途径(VIP 全部 10x):

| 行为 | 积分 |
| --- | --- |
| 每日签到 | +5 |
| 发帖 | +20 |
| 帖子被点赞 | +1 / 次 |
| 帖子被收藏 | +2 / 次 |
| 发评论 | +3 |
| 被关注 | +5 |
| 完成任务 | 各任务有奖励 |
| 月度活跃度阶梯奖励 | 50–3000 |
| 商品购买返利 | 商品级别配置 |

可消费在:
- 兑换 4 大类共 32 款皮肤(气泡 / 点赞 / 表情 / 挂件)
- 5000 积分 = 大会员月卡

## 📈 月度活跃度

加权积累(VIP 10x):签到 1 / 评论 2 / 发帖 5 / 被赞 1 / 被收藏 3 / 投票 1 / 购物 5 / 任务奖励变量。

每月 1 号清零。提供:
- 个人活跃度 + 月度排名
- 月度排行榜(TOP3 领奖台 + 完整榜单)
- 6 档阶梯奖励(50–5000 分),奖金币 + 奖皮肤

## ⭐ 板块关注 & 社交隐私

### 关注板块

任一层级都可关注,数据库用多态关系表 `BoardFollow(userId, type, targetId)` 表示:
```
type = 'category' | 'genus' | 'species'
```

关注后,在侧栏「板块」区域会看到两个 tab 切换:
- **⭐ 我的关注**(有关注时默认展示) — 按最近关注顺序
- **🔥 热门**(新用户 / 未登录用户默认)

三级板块页(科/属/品种页)都有 **[+ 关注板块]** 按钮,点击即切为 **[✓ 已关注]**。

### 社交隐私

任意用户的个人主页增加三个新 Tab:
| Tab | 内容 | 可见性 |
| --- | --- | --- |
| 关注 | 该用户关注的全部人 | 受 `privacyShowFollowing` 控制 |
| 粉丝 | 关注了该用户的所有人 | 受 `privacyShowFollowers` 控制 |
| 关注的板块 | 该用户关注的板块列表 | **仅本人可见** |

隐私开关独立两个,在 [`/settings/privacy`](#) 里切换。两个开关默认 **开启**(促进社区互动)。

- 开关关闭时,他人访问该 Tab 会看到「🔒 xxx 设置了隐藏 xx 列表」提示
- 本人访问自己的主页始终不受影响
- 粉丝数 / 关注数(数字)仍然公开,仅具体列表被隐藏

## 🌳 三级板块体系

所有「植物学板块」按 **科 → 属 → 品种** 三级组织:

```
Category (科)            ·  ~10 个
  ├── Genus (属)         ·  每科 3~15 个
  │     └── Species (品种) · 每属 5~30 个
  │
  └── Genus ...
```

**当前数据规模:14 Category + 60 Genus + 581 Species**(v0.6 初版)

三张独立表 [prisma/schema.prisma](/Users/duxing/Desktop/plants_community/prisma/schema.prisma):
- `Category` —— 科,额外字段 `kind: family/discussion/market` 用来区分「植物学分类」与「综合讨论区/市场」
- `Genus` —— 属,归属某个 Category
- `Species` —— 品种,归属某个 Genus。**图鉴信息(光照/浇水/难度/tips/图集)全部合并到 Species 表**,不再独立 Plant 表

### 路由对应表

| URL | 含义 |
| --- | --- |
| `/board` | 所有板块入口(按 科/讨论/市场 分类列出) |
| `/board/jingtian` | 景天科 一级页 |
| `/board/jingtian/echeveria` | 景天科 · 拟石莲属 二级页 |
| `/board/jingtian/echeveria/jiwawa` | 景天科 · 拟石莲属 · 吉娃娃 品种页 |
| `/board/xianshou` | 新手村(discussion 类,无下级) |
| `/board/xianrenzhang/lophophora` | 仙人掌科 · 乌羽玉属 |

### 帖子挂在哪一层?

帖子可以挂在任意层级:
- 泛话题 → 挂到 **科**(如「景天科度夏心得」)
- 属级话题 → 挂到 **属**(如「乌羽玉属养护汇总」)
- 品种级话题 → 挂到 **品种**(如「我家吉娃娃叶片发软求助」)

数据库字段:`Post.categoryId / genusId / speciesId` 三个都有值时按「最细粒度」优先;
列表查询支持任一字段过滤 `GET /api/posts?category=xxx|genus=xxx|species=xxx`。

### 新增相关 API

| 路径 | 说明 |
| --- | --- |
| `/api/categories` | 一级分类列表 |
| `/api/categories/[slug]` | 某科详情(含旗下所有属) |
| `/api/genera/[slug]?category=xxx` | 某属详情(含旗下所有品种) |
| `/api/species/[slug]?genus=xxx` | 某品种完整图鉴信息 |
| `/api/boards`,`/api/boards/[slug]` | 向后兼容,内部桥接到 Category |

### Seed 数据

完整在 [prisma/taxonomy-data.ts](/Users/duxing/Desktop/plants_community/prisma/taxonomy-data.ts),按科属体系穷举:

| 科 | 属数 | 代表品种 |
| --- | --- | --- |
| 景天科 | 14 | 胧月、桃蛋、虹之玉、黑法师、月兔耳、吉娃娃、乌木、雪莲… |
| 仙人掌科 | 14 | 兜、星兜、乌羽玉、银冠玉、艾伦费尔德、岩牡丹、绯牡丹、金琥… |
| 番杏科 | 10 | 生石花、肉锥、碧光环、四海波、帝玉… |
| 百合科 | 6 | 玉露、万象、宝草、芦荟、龙山锦、卧牛… |
| 大戟科 | 3 | 麒麟花、布纹球、九头龙、彩云阁… |
| 其余补充 | 13 | 龙舌兰、沙漠玫瑰、龟甲龙、金枝玉叶、爱之蔓… |

## ✍️ 富文本系统

凡是允许长文本输入的位置(帖子正文、活动描述、商品描述、评论、订单评价)
都使用 TipTap 富文本编辑器。

### 编辑能力

工具栏含:
- **文本格式**:加粗 / 斜体 / 下划线 / 删除线 / 行内代码
- **标题**:H1 / H2 / H3
- **结构**:无序列表 / 有序列表 / 引用 / 分隔线
- **插入**:链接 / 图片(本地上传 + 外链 URL)
- **历史**:撤销 / 重做 / 清除格式
- **支持 Markdown 快捷键**:`**粗体**`、`*斜体*`、`# 标题`、`- 列表`、`> 引用`

### 双存储设计

数据库每个富文本字段都有三栏:
- `content` —— 已 sanitize 的 HTML(渲染缓存,客户端直接使用)
- `contentJson` —— ProseMirror JSON(权威源,编辑器读它)
- `contentText` —— 纯文本(用于通知预览、搜索摘要)

API 入库时(POST /api/posts、/comments、/market/products、/orders/[id]/review)
统一走 [src/lib/richtext.ts](/Users/duxing/Desktop/plants_community/src/lib/richtext.ts)
的 `processRichInput()`,自动同步生成三栏。

### 安全

- 服务端 sanitize:基于 [`sanitize-html`](https://www.npmjs.com/package/sanitize-html)
- **白名单标签**:`p, br, strong, em, u, s, h1~h4, ul, ol, li, blockquote, pre, code, a, img, hr, span, div`
- **白名单协议**:`http / https / mailto`(`javascript:` / `data:` 自动剥离)
- **链接强制安全**:所有 `<a>` 自动加 `rel="noopener noreferrer nofollow" target="_blank"`,无效 href 转为 `<span>`

### 图片上传

- API:`POST /api/upload`(multipart)
- 限制:**仅 JPG / PNG / WebP / GIF**、**5MB**、**magic-byte 双重校验**
- 存储:本地 `public/uploads/{userId}/{yyyymm}/{cuid}.{ext}`
- 切换 OSS / S3:实现 [src/lib/upload.ts](/Users/duxing/Desktop/plants_community/src/lib/upload.ts)
  里 `UploadDriver` 的新 driver,在 `getUploadDriver()` 按 env 切换即可,业务代码零改动

## 🎨 皮肤系统

4 大类、4 种稀有度、共 32 款皮肤:

| 类别 | 数量 | 应用位置 |
| --- | --- | --- |
| 💬 评论气泡 | 8 | 自己评论展示为彩色气泡 |
| 👍 点赞按钮 | 8 | 替换默认 ❤️ 图标 |
| 🌱 表情包 | 8 | 评论 / 私信中的快捷表情 |
| 👑 头像挂件 | 8 | 头像外圈彩色环 / 角标 |

每类各有一个「VIP 限定」金色版本(不可购买,开通会员后送)。
稀有度配色:普通 = 灰、稀有 = 蓝、史诗 = 紫、传说 = 金。

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

## 💳 支付集成 / 接入真实网关

当前为 **Mock 网关**:`/api/payments` 创建支付单返回伪二维码,前端轮询 `/api/payments/[payNo]`,
点击「Mock 我已支付完成」按钮触发 `/api/payments/[payNo]/confirm`(等同 webhook),
完成后自动:
- 订单 → `pending_ship` + 卖家通知 + 买家返利积分
- VIP 订单 → 开通/续期会员 + 10x 加成生效

**接入真实微信/支付宝(只需改 3 处)**:

1. [src/lib/payment.ts:21](/Users/duxing/Desktop/plants_community/src/lib/payment.ts#L21) `createOrderPayment()` 改为调用真实 SDK,把返回的二维码内容存进 `qrcode` 字段
2. 加一个 webhook 路由(如 `/api/payments/webhook/wechat`),验签后调用现有的 `confirmPayment(payNo)`
3. 删除/隐藏前端 checkout 页里的「Mock 我已支付完成」按钮

业务侧的状态机、积分发放、订单流转**完全不用动**。

## 📌 注意事项

- 本仓库 `.env` 已被 gitignore,不会提交敏感信息。
- 默认种子密码为 `123456`,仅用于演示,生产前必须清空或修改。
- 头像与图片来自 Unsplash / pravatar 公共 CDN,首次加载略慢。
- 评论的 @回复通知尚未实现(仅直回复会发通知)。
- 搜索框暂为占位 UI,未接入搜索 API。
- 月度排行榜的「历史月份」展示(MonthlyActivity 快照表)已建好,但当前只展示当月。
- C2C 商品发布暂无审核流程(`pending_review` 状态保留给后续运营使用)。

---

## 🧪 运行单元测试

```bash
# TS 端(i18n 完整性 / 节日窗口 / 语言协商)
npm test            # 用 node:test 跑,零依赖

# Go 端(状态机 / 权限 / 富文本 XSS)
cd server-go
go test ./internal/...
```

**已落地的测试**:
- `tests/i18n.test.mjs` — 验证 5 locale × 11 namespace 的 key 集合完全一致,防翻译漏发
- `tests/themes.test.mjs` — 主题窗口(含跨年 12.20→1.2)判定
- `tests/locale-negotiate.test.mjs` — Accept-Language 优先级解析
- `server-go/internal/themes/themes_test.go` — Go 端主题窗口(与 TS 端同步)
- `server-go/internal/levels/levels_test.go` — 等级换算 + 权限矩阵 + VIP 通道
- `server-go/internal/richtext/richtext_test.go` — 5 种 XSS 对抗 + PM-JSON 渲染 + 纯文本提取

## 🌍 新增一个语言 / 新增一个 i18n key

**加语言**(比如法语 `fr`):

1. `src/i18n/config.ts`:`locales` 加 `'fr'`,补 `localeNames` `localeFlags`
2. `src/i18n/messages/fr/`:新建 11 个 namespace 文件(复制 zh-CN 然后翻译)
3. `tests/i18n.test.mjs` 会自动识别,跑 `npm test` 验证 key 完整性
4. 法务页:`src/app/{terms,privacy,cookies}/` 加对应的 `.tsx`,`page.tsx` 加 switch case

**加 key**:

1. 在 `src/i18n/messages/zh-CN/<namespace>.json` 加新 key
2. 把它同步到其他 4 个 locale(zh-TW / en / ja / ko)
3. 前端用 `const { t } = useI18n(); t('namespace.your.key')`
4. `npm test` 保证没漏翻译(未命中的 key 会直接显示 key 名,开发时易发现)

## 🔐 合规与免责声明(Legal notice)

本仓库的法务文本(`/terms`、`/privacy`、`/cookies`)为**演示草案,不构成法律意见**。正式上线前必须由:

- 中国大陆 — 合规律师审阅(覆盖《民法典》《网络安全法》《个人信息保护法》《未成年人保护法》等)
- EU / UK — Data Protection Officer 或外部 DPO review(GDPR / ePrivacy / DSA)
- 其他地区 — 按落地司法管辖区的法律法规单独审阅

模拟的合规机制(仅参考,非生产级):

- **Cookie banner**:存 `localStorage.rouyou.cookieConsent.v1`,实际并未把「分析类/广告类」开关接到任何 SDK(因为本项目不用这些 SDK);引入时需按选择结果动态 loading。
- **14 岁年龄门槛**:仅注册页勾选框,未做身份核验。中国大陆如需落实《未保法》网络专章,建议:进入时弹窗 + 实名关联。
- **跨境传输**:文本中提到 SCC / 数据出境安全评估,当前项目未实际实现数据分区。
- **72 小时数据泄露通知**:文本要求,真实实施需要事件上报 pipeline。
- **数据导出 / 被遗忘权**:API 未落地,真实生产需 `/api/users/me/data-export` + 异步导出 + 邮件投递。

---

Made with 🌿 and ❤️
