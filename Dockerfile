# syntax=docker/dockerfile:1.6

# ===================================================================
# Next.js 14 multi-stage build,产出 ~120MB 镜像
# ===================================================================

# --------- 1. deps:装依赖(单独一层,改代码不重装) ---------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --prefer-offline

# --------- 2. builder:跑 prisma generate + next build ---------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client 在 builder 时生成,避免运行时再做
RUN npx prisma generate

# Build Next.js — 注意:build 阶段需要可联通的 DATABASE_URL(因为 layout/page 用 prisma)
# 生产构建建议:让 next build 不去查 DB,把所有 page/route 都 force-dynamic;
# 我们的项目大部分都是 force-dynamic,build 阶段访问不到 DB 也能过。
# 兜底:DATABASE_URL 留空时 Prisma 不会真连库。
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=""
ENV JWT_SECRET="build-time-placeholder"
RUN npm run build

# --------- 3. runner:最小运行时 ---------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN apk add --no-cache libc6-compat openssl

# 非 root 用户(安全)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next standalone 输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma:运行时需要 schema + 生成的 client
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# i18n 翻译文件需要被 server-loader 在运行时按相对路径读取
COPY --from=builder --chown=nextjs:nodejs /app/src/i18n/messages ./src/i18n/messages

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
