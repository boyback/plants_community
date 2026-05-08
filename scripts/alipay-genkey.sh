#!/usr/bin/env bash
# 生成一对 RSA2048 密钥,用于支付宝沙箱。
#
# 用法:
#   bash scripts/alipay-genkey.sh
#
# 产物:
#   ./alipay-keys/app_private.pem           PKCS#1 格式(支付宝 SDK 要的)
#   ./alipay-keys/app_public.pem            SPKI 格式(完整 PEM)
#   ./alipay-keys/app_public_oneline.txt    应用公钥,纯 base64 去头尾(贴到沙箱后台)
#   ./alipay-keys/app_private_oneline.txt   应用私钥,纯 base64 去头尾(贴到 .env)

set -e
OUT=./alipay-keys
mkdir -p "$OUT"

# 1. 生成 PKCS#1 私钥
openssl genrsa -out "$OUT/app_private.pem" 2048 2>/dev/null

# 2. 导出 SPKI 公钥
openssl rsa -in "$OUT/app_private.pem" -pubout -out "$OUT/app_public.pem" 2>/dev/null

# 3. 生成单行 base64(去 BEGIN/END/换行)
grep -v '^-----' "$OUT/app_public.pem"  | tr -d '\n' > "$OUT/app_public_oneline.txt"
echo                                                                   >> "$OUT/app_public_oneline.txt"
grep -v '^-----' "$OUT/app_private.pem" | tr -d '\n' > "$OUT/app_private_oneline.txt"
echo                                                                   >> "$OUT/app_private_oneline.txt"

echo "✅ 密钥对已生成到 $OUT/"
echo
echo "📋 应用公钥(贴到沙箱后台 → 接口加签方式 → RSA2):"
echo "-------------------------------------------------------"
cat "$OUT/app_public_oneline.txt"
echo "-------------------------------------------------------"
echo
echo "🔑 应用私钥(贴到 .env 的 ALIPAY_PRIVATE_KEY_PEM=...):"
echo "-------------------------------------------------------"
cat "$OUT/app_private_oneline.txt"
echo "-------------------------------------------------------"
echo
echo "下一步:"
echo "  1. 把上面『应用公钥』粘到沙箱后台保存"
echo "  2. 后台会刷出『支付宝公钥』,复制到 .env 的 ALIPAY_PUBLIC_KEY_PEM=..."
echo "  3. 把『应用私钥』粘到 .env 的 ALIPAY_PRIVATE_KEY_PEM=..."
echo "  4. 跑: node -r dotenv/config scripts/alipay-probe.mjs"
