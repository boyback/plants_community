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
GHCR_OWNER="${GHCR_OWNER:-${GITHUB_OWNER:-please-set-GHCR_OWNER}}"
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

# 1. 拉最新代码(用于 docker-compose.yml / nginx 配置等的版本同步)
echo "→ git pull"
git fetch --tags
if [[ "$TAG" != "latest" ]]; then
  git checkout "$TAG"
else
  git checkout main
  git pull --ff-only
fi

# 2. 拉镜像
echo "→ docker pull"
docker pull "$NEXT_IMAGE"
docker pull "$GO_IMAGE"

# 3. 用 prod 的 compose 启动(不 build 本地)
echo "→ docker compose up"
NEXT_IMAGE="$NEXT_IMAGE" GO_IMAGE="$GO_IMAGE" \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans

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
