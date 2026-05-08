# syntax=docker/dockerfile:1

# --------- Build stage ---------
FROM golang:1.22-alpine AS builder
WORKDIR /src

# 国内 Go module 代理(七牛云 + 阿里云,备用 proxy.golang.org)
ENV GOPROXY=https://goproxy.cn,https://mirrors.aliyun.com/goproxy/,https://proxy.golang.org,direct
ENV GOSUMDB=sum.golang.google.cn

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /out/plants-server ./cmd/server

# --------- Runtime stage ---------
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata && \
    adduser -D -u 1001 app

WORKDIR /app
COPY --from=builder /out/plants-server /app/plants-server
USER app

EXPOSE 8080
ENV PORT=8080
ENV TZ=Asia/Shanghai

CMD ["/app/plants-server"]
