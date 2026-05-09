# 七牛云对象存储接入指南

## 整体流程(从零到上线)

### 1. 七牛后台

1. 登录 https://portal.qiniu.com → 实名认证(必须)
2. **对象存储 → 空间管理 → 新建空间**
   - 名称:`plantcommunity`(或你想要的)
   - 区域:**华东 z0**(国内访问最快)
   - 访问控制:**公开**(我们的图片是公开访问)
3. **个人中心 → 密钥管理 → 新建密钥**(AK/SK)
   - 注意:**只在密钥管理页能看到完整 SK**,妥善保存
   - 强烈建议在「权限管理」里给这把 key 限定 bucket(只允许写指定 bucket)

### 2. CDN 加速域名

> 七牛默认给的 testbucket-xxx.qnssl.com 是测试域名,**只能用 30 天且每天限流**。生产必须自己绑定域名。

1. **DNS 准备**:你的域名(如 `plantcommunity.cn`)的 DNS 解析在火山引擎 DNS。
2. 七牛后台 **加速 / CDN → 域名管理 → 添加域名**
   - 加速域名:`cdn.plantcommunity.cn`
   - 通信协议:**HTTPS**
   - 覆盖范围:**中国大陆**
   - 使用场景:**图片小文件**
   - IP 协议:**IPv4 / IPv6**
3. **域名归属验证**(七牛要求)
   - 选 DNS TXT 验证最方便:
     ```
     主机记录:_qiniu_verify(七牛页面会给具体名)
     类型:    TXT
     值:      verify_xxxxxxxxxxx(七牛页面给)
     ```
   - 或者文件验证:把 `verification.html` 放到主站 `/verification.html` 路径返回特定字符串
4. **配置 SSL 证书**(七牛免费的 Let's Encrypt 即可,自动续签)
5. **绑定到 bucket**:在你刚建的空间 → 域名管理 → 添加 `cdn.plantcommunity.cn`
6. 等 DNS 生效(通常 5-30 分钟),`https://cdn.plantcommunity.cn` 可访问任意上传到 bucket 的文件

### 3. 服务器配置

`.env` 里加:

```bash
UPLOAD_DRIVER=qiniu
QINIU_ACCESS_KEY=你的AK
QINIU_SECRET_KEY=你的SK
QINIU_BUCKET=plantcommunity
QINIU_DOMAIN=https://cdn.plantcommunity.cn
QINIU_REGION=z0
```

> ⚠️ `.env` **永远不要进 git**(已经在 `.gitignore` 排除)

### 4. 重启 + 健康检查

```bash
docker compose restart next
```

打开 `/admin/site-config` 后台页,点击 **🩺 健康检查** 按钮:
- 它会上传一个 `_health/...txt` 测试文件到七牛
- 然后 `fetch` 这个 URL 验证下载,确认 CNAME / SSL / bucket 绑定都对
- 最后删除测试文件

成功显示:
```
✅ driver = qiniu 工作正常
{
  "bucket": "plantcommunity",
  "domain": "https://cdn.plantcommunity.cn",
  "region": "z0",
  "testUrl": "https://cdn.plantcommunity.cn/_health/...",
  "downloadVerified": true
}
```

---

## 已有本地图片怎么办?

切换到七牛**不会自动迁移历史文件**:
- `UploadFile` 表里旧记录的 `url` 仍是 `/uploads/<userId>/...`(本地路径),前端继续从 `./data/uploads` 读
- 新上传的文件 `url` 是 `https://cdn.plantcommunity.cn/...`(七牛 CDN)
- 两套并存,用户感知不到

如果想完整迁移:
1. 写脚本批量上传 `./data/uploads/*` 到七牛
2. 更新 `UploadFile.url` 为新地址
3. (可选)删除本地 `./data/uploads`

我没写迁移脚本,觉得**不必要**(旧图也能用)。

---

## 价格估算

| 项目 | 单价 | 月预估 |
|---|---|---|
| 标准存储 | ¥0.099 / GB / 月 | 100 GB → ¥9.9 |
| 国内 CDN 流量 | ¥0.29 / GB | 1 TB → ¥290 |
| **小社区(月 100 GB 流量)** |  | **约 ¥40/月** |

新用户首月送 **10GB 存储 + 10GB 流量** 免费。

---

## 安全提示

- AK/SK **绝对不能**进 git/聊天/截图,只放服务器 `.env`
- 强烈建议在七牛「权限管理」里**给 key 限定 bucket**,即便泄露也只能影响一个 bucket
- 定期换 key(每半年至少一次)
- 配置 **bucket 防盗链**:只允许 `plantcommunity.cn` 引用,杜绝盗刷流量
