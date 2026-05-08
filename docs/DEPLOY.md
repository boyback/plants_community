# 🚀 肉友社 部署指南(Docker 全栈)

## 架构总览

```
┌────────────────────────────────────────┐
│           Nginx (80 / 443)             │  反代 + TLS 终结
│   /api/sse/  → next  (长连接 86400s)   │
│   /         → next  (主站)             │
│   /api/v2/  → go    (可选,默认注释)    │
└────────────┬────────────┬──────────────┘
             │            │
       ┌─────▼─────┐ ┌────▼─────┐
       │ Next.js   │ │ Go API   │
       │  :3000    │ │  :8080   │
       └─────┬─────┘ └────┬─────┘
             │            │
        ┌────▼────────────▼────┐
        │       MySQL 8        │
        │  caching_sha2_pwd    │
        │  utf8mb4_unicode_ci  │
        └──────────────────────┘
```

镜像总大小约 600MB:`mysql ~600MB`(基础镜像)、`next ~150MB`(standalone)、`go ~25MB`(scratch+alpine)、`nginx ~50MB`、`init ~250MB`(临时,seed 完退出)。

---

## 0. 前置

- Docker Desktop ≥ 4.20 / Docker Engine ≥ 24
- `docker compose v2`(`docker compose` 而非 `docker-compose`)
- 本地至少 4GB RAM 给容器

---

## 1. 一键启动

```bash
# 1. 拷贝 env 模板,填密码 / JWT
cp .env.production.example .env
$EDITOR .env

# 2. 一行起服务
docker compose up -d --build

# 3. 跟踪日志(可选)
docker compose logs -f next go-server
```

**首次启动**:
- `mysql` 起来后 `init-db` 跑一次 `prisma db push` + `seed.ts` ≈ 60-90s
- `init-db` 退出 0 后才会启动 `next` 和 `go-server`
- 整个流程大约 2-3 分钟

**完成后**:打开 <http://localhost> 即可访问。
默认账号:用户名 `多肉阿绿`,密码 `123456`。

---

## 2. 关键命令

```bash
# 看每个容器是否 healthy
docker compose ps

# 看某容器实时日志
docker compose logs -f next

# 重新构建某一服务(不停其他容器)
docker compose up -d --build next

# 进容器调试
docker compose exec next sh
docker compose exec mysql mysql -uroot -p$MYSQL_ROOT_PASSWORD plants_community

# 停服(数据保留)
docker compose down

# 停服 + 删 volume(数据全清)
docker compose down -v

# 只重置 DB(保留代码镜像)
docker compose stop next go-server
docker compose run --rm init-db sh -c "npx prisma db push --force-reset --accept-data-loss && npx tsx prisma/seed.ts"
docker compose start next go-server
```

---

## 3. 域名 + TLS

### 3.1 准备证书

放两个文件到 `deploy/nginx/certs/`:

```
deploy/nginx/certs/
├── fullchain.pem    # 证书链(Let's Encrypt 给的 fullchain.pem 即可)
└── privkey.pem      # 私钥
```

### 3.2 改 nginx 配置

编辑 `deploy/nginx/conf.d/default.conf`:

1. 反注释最底下的 `server { listen 443 ssl http2 ... }` 块
2. 把 80 端的 `server { listen 80 ... }` 改成只做 redirect:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$host$request_uri;
   }
   ```
3. `server_name your-domain.com` 替换成你的域名

### 3.3 重启 nginx

```bash
docker compose restart nginx
```

---

## 4. 真实支付

### 4.1 Alipay sandbox

1. 在 [开放平台](https://open.alipay.com/develop/sandbox/app) 拿 AppId
2. `bash scripts/alipay-genkey.sh` 生成密钥对
3. 沙箱后台上传应用公钥,拿"支付宝公钥"
4. 把 4 个变量填到 `.env`:
   ```
   PAYMENT_GATEWAY=alipay
   ALIPAY_APP_ID=9021000xxxxxx
   ALIPAY_PRIVATE_KEY_PEM=MIIE...
   ALIPAY_PUBLIC_KEY_PEM=MIIB...
   ```
5. `docker compose restart next` 让 Next.js 加载新 env

### 4.2 微信 Native

需要商户 API 私钥/序列号/APIv3 密钥,详见 README 微信部分。

### 4.3 Webhook 公网可达

支付宝 / 微信回调要求 HTTPS 公网,本地开发用 ngrok / cloudflared:

```bash
cloudflared tunnel --url http://localhost
# 复制 cloudflared 给的 URL 替换 .env 的 ALIPAY_NOTIFY_URL / WECHAT_NOTIFY_URL
docker compose restart next
```

---

## 5. 备份

### 5.1 MySQL

```bash
# 导出
docker compose exec mysql sh -c \
  "mysqldump --single-transaction -uroot -p\$MYSQL_ROOT_PASSWORD \$MYSQL_DATABASE" \
  > backup-$(date +%F).sql

# 还原
docker compose exec -T mysql sh -c \
  "mysql -uroot -p\$MYSQL_ROOT_PASSWORD \$MYSQL_DATABASE" \
  < backup-2026-05-08.sql
```

### 5.2 用户上传

```bash
# uploads volume 直接 tar 出来
docker run --rm -v rouyou_uploads_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

---

## 6. 常见问题

### Q: init-db 报 `Authentication plugin 'caching_sha2_password'`

A: 老的 MySQL 客户端不兼容。我们镜像已经强制 `caching_sha2_password`,`init-db` 用 Node + Prisma 走的是 mysql2 没问题。如果你换工具(如 dbeaver),把 plugin 改成 `mysql_native_password`。

### Q: Next.js build 阶段访问 DB 失败

A: 项目里所有 page 都标注了 `force-dynamic`,build 时不会真连库。如果你新加 page **没**加 `force-dynamic`,Docker build 会失败。修复:在那个 page 加 `export const dynamic = 'force-dynamic';`

### Q: SSE 连不上

A: 确认 nginx 配的 `proxy_buffering off` 和 `proxy_read_timeout 86400s` 都在 `/api/sse/` 块下;以及防火墙是否允许长连接。

### Q: 想只用 Next.js,不要 Go

A: `docker compose up -d --build mysql init-db next nginx`,只起这 4 个服务,Go 不会被拉起。Nginx 默认就只代理到 Next。

### Q: 我有现成的外部 MySQL

A: 把 docker-compose.yml 里 `mysql` 服务删掉,`DATABASE_URL` 改成你的外部地址即可(注意 docker 容器访问宿主机要用 `host.docker.internal`)。

---

## 7. CI/CD(GitHub Actions)

### 7.1 工作流

| 文件 | 触发 | 做的事 |
|---|---|---|
| `.github/workflows/ci.yml` | push / PR | TS / Go build + test + lint + Prisma validate + Docker build 演练 |
| `.github/workflows/cd.yml` | push main / 打 tag | 多架构(amd64+arm64)build → push 到 `ghcr.io` → SSH 部署 |

### 7.2 GHCR 镜像

```
ghcr.io/<your-org>/rouyou-next:latest
ghcr.io/<your-org>/rouyou-next:sha-abc1234
ghcr.io/<your-org>/rouyou-next:v1.0.0
ghcr.io/<your-org>/rouyou-go:latest
ghcr.io/<your-org>/rouyou-go:sha-abc1234
ghcr.io/<your-org>/rouyou-go:v1.0.0
```

### 7.3 启用自动部署

1. 服务器:`git clone` 项目,在仓库根目录留好 `.env`
2. 服务器:`docker login ghcr.io`(用 GitHub 个人访问令牌)
3. GitHub 仓库 Settings → Secrets → Actions:
   - `DEPLOY_HOST`(服务器 IP / 域名)
   - `DEPLOY_USER`(SSH 用户)
   - `DEPLOY_SSH_KEY`(SSH 私钥;`ssh-keygen -t ed25519` 生成,公钥加到服务器 authorized_keys)
   - `DEPLOY_PATH`(服务器上仓库路径,如 `/srv/rouyou`)
4. push 到 main 即自动部署。

### 7.4 手动部署(不用 SSH)

```bash
# 服务器上
cd /srv/rouyou
docker login ghcr.io -u <your-user> --password-stdin <<< "$GHCR_TOKEN"
GHCR_OWNER=<your-org> ./scripts/deploy.sh

# 指定版本
GHCR_OWNER=<your-org> TAG=v1.0.0 ./scripts/deploy.sh
```

### 7.5 回滚

```bash
GHCR_OWNER=<your-org> TAG=v0.9.0 ./scripts/deploy.sh
# 或 直接 docker compose pull 上一个 sha-... tag
```
