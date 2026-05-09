# 帖子审核功能启用指南

## 现状

代码里已经实现了帖子审核机制,但**默认关闭**(env 开关 `REVIEW_FILTER_ENABLED=0`)。

原因:审核功能依赖 `Post.reviewStatus` 列,需要先同步 schema。如果直接打开,生产库还没这列就会查询失败。

## 启用步骤

### 1. 同步 schema(只跑一次)

```bash
ssh root@118.145.162.6
cd /srv/rouyou
git pull   # 拉最新代码

# 跑 init-db profile,会自动:
#   - prisma db push 同步所有 schema 改动(加 reviewStatus 列等)
#   - 跑 seed 脚本(已存在数据不会重复)
docker compose --profile init run --rm init-db
```

成功后会看到:
```
🚀  Your database is now in sync with your Prisma schema.
✅ DB initialized
```

### 2. 打开开关

编辑 `.env`,加(或改):

```bash
REVIEW_FILTER_ENABLED=1
```

### 3. 重启 next

```bash
docker compose restart next
```

## 启用后的行为

### 用户侧

- **发帖时**:如果帖子 cover/images/videoUrl/正文 HTML 含**外链**(非本站域名),自动 `reviewStatus=pending`
- **首页/列表/板块页**:不展示 pending/rejected 帖
- **帖子详情页**:作者本人能看到自己 pending 的帖子,顶部有黄色提示「正在审核中」
- **作者编辑**(rich/short/video)后含外链 → 重新进入 pending

### 管理侧

- `/admin/posts` 顶部出现 4 个 tab:
  - 全部 / 🕒 待审核(红字 badge 计数)/ ✅ 已发布 / 🚫 已驳回
- 待审核帖子操作按钮:
  - **✓ 通过** → 公开展示
  - **驳回**(填原因)→ 不展示,作者能看到原因
  - **删除** → 软删除
- 已驳回的帖可以「重新通过」

## 关闭(回退)

如果发现问题想关闭:

```bash
# .env 里改成
REVIEW_FILTER_ENABLED=0

docker compose restart next
```

DB 列保留,只是代码不再用它过滤,所有帖子(包括之前 pending 的)都会公开展示。

## 注意

- 启用后,**老帖子**默认 `reviewStatus='published'`(prisma `@default`),不影响展示
- 启用前发的含外链帖也不会回溯审核(这是 schema 同步前发布的,数据上 reviewStatus 一律 published)

---

## 同步会改动的所有 schema

`init-db` 会跑 `prisma db push`,把以下表/字段同步过去:

- `Post.reviewStatus` enum(published/pending/rejected)
- `Post.reviewReason` / `Post.reviewedAt` / `Post.reviewedBy`
- 新表 `UploadFile`(秒传 + 用户上传记录)
- 新表 `SiteConfig`(站点配置,如品种现场照开关)
- 之前历次没同步的 schema 改动也一并跑(成长日记 journal、SpeciesRating 之类)

**不会丢数据**:db push 默认只加列/加表,不删数据。
