#!/usr/bin/env bash
# =====================================================================
# 服务器侧部署脚本 — 拉最新镜像 + 重启容器(rolling)。
#
# 假设:
#   - 服务器已 git clone 项目
#   - .env 已就绪(密钥 / DB 密码等)
#   - docker / docker compose v2 已装好
#   - GHCR 已登录(echo $TOKEN | docker login ghcr.io -u USER --password-stdin)
#
# 用法(在服务器上):
#   ./scripts/deploy.sh           # 默认 latest tag
#   TAG=v1.0.0 ./scripts/deploy.sh
# =====================================================================

set -euo pipefail

TAG="${TAG:-latest}"
GHCR_OWNER="${GHCR_OWNER:-boyback}"
NEXT_IMAGE="ghcr.io/${GHCR_OWNER}/rouyou-next:${TAG}"
GO_IMAGE="ghcr.io/${GHCR_OWNER}/rouyou-go:${TAG}"

echo "=========================================="
echo " RouYou Deploy"
echo " TAG:    $TAG"
echo " Next:   $NEXT_IMAGE"
echo " Go:     $GO_IMAGE"
echo "=========================================="

if [[ ! -f .env ]]; then
  echo "❌ 缺少 .env(参考 .env.production.example 创建)"
  exit 1
fi

# 关键变量内容校验:仅文件存在不够,docker-compose 里这些变量是必填的,
# 缺失会让 docker compose up 直接 abort,先在这里挡住更友好。
for k in JWT_SECRET MYSQL_ROOT_PASSWORD; do
  if ! grep -qE "^${k}=.+" .env; then
    echo "❌ .env 缺少 ${k}(或为空)"
    echo "   参考 .env.production.example 设置后重试"
    exit 1
  fi
done

# 1. 代码同步:在 CI/CD 调用时,workflow 已经 reset --hard 过了。
#    手动调用时,这里也兜底 fetch 一下(失败不阻塞)。
echo "→ git fetch (best-effort)"
git fetch --tags 2>/dev/null || true
if [[ "$TAG" != "latest" && -n "$(git tag -l "$TAG")" ]]; then
  git checkout "$TAG"
fi

# 2. 拉镜像(两个并行,节省时间)
echo "→ docker pull(并行)"
docker pull "$NEXT_IMAGE" &
PID_NEXT=$!
docker pull "$GO_IMAGE" &
PID_GO=$!
# 任意一个失败就退出,避免静默错误
wait $PID_NEXT || { echo "❌ pull next 镜像失败"; exit 1; }
wait $PID_GO   || { echo "❌ pull go 镜像失败";   exit 1; }

# 3. 用 prod 的 compose 启动(不 build 本地)
echo "→ docker compose up"
NEXT_IMAGE="$NEXT_IMAGE" GO_IMAGE="$GO_IMAGE" \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans

# 3.5. 同步 schema(用 prisma db push,幂等;失败不阻塞)
#  关键修法:对**已运行的 next 容器** docker exec,这样能复用容器内 env(DATABASE_URL 等)
#  之前用 `compose run` 一次性容器时,env 注入不完整导致 db push 实际什么都没做。
echo "→ prisma db push(同步 schema)"
# 等容器先起来(有 healthcheck 时 up -d 会等几秒,这里多保险等 5s)
sleep 5
docker compose exec -T next sh -c '
  if [ -x ./node_modules/.bin/prisma ]; then
    ./node_modules/.bin/prisma db push --accept-data-loss
  elif [ -f ./node_modules/prisma/build/index.js ]; then
    node ./node_modules/prisma/build/index.js db push --accept-data-loss
  else
    echo "⚠️  prisma CLI 未在镜像中,跳过 db push(请手动同步 schema)"
    exit 0
  fi
' || echo "⚠️  prisma db push 失败,继续部署 — 请手动确认 schema"

# 同步完后重启 next 让它读新 schema(prisma client 缓存了 schema 元数据)
docker compose restart next

# 4. 等待 healthcheck
echo "→ 等待容器 healthy(最多 60s)"
deadline=$(( $(date +%s) + 60 ))
while [[ $(date +%s) -lt $deadline ]]; do
  ok=$(docker compose ps --format json | grep -c '"Health":"healthy"' || true)
  if [[ "$ok" -ge 2 ]]; then
    echo "✅ 至少 2 个核心容器 healthy"
    break
  fi
  sleep 3
done

# 5. 看一下 ps
docker compose ps

# 6. 清理悬空镜像(保留 7 天内的 layer cache)
echo "→ docker image prune"
docker image prune -a --force --filter "until=168h" || true

echo "✅ 部署完成"
