/**
 * 邮件模板集合 — 统一品牌风格
 *
 * 设计原则:
 *   - inline CSS(邮件客户端兼容)
 *   - 主色用 #459c67(站点品牌绿)
 *   - 容器 max-width 480px(手机/桌面都好看)
 *   - 不依赖外部图片(避免被反垃圾系统拦)
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://plantcommunity.cn';
const BRAND = '肉友社';

interface ShellOptions {
  /** 顶部主标题(emoji + 文字) */
  title: string;
  /** 主体内容 HTML */
  body: string;
  /** 主 CTA 按钮(可选) */
  cta?: { label: string; url: string };
  /** 底部小提示(可选) */
  footnote?: string;
}

/** 通用外壳:统一头部 + 卡片 + 底部 */
function shell({ title, body, cta, footnote }: ShellOptions): string {
  const ctaHtml = cta
    ? `<div style="text-align: center; margin: 24px 0;">
         <a href="${escapeAttr(cta.url)}" style="display: inline-block; background: #459c67; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">${escapeText(cta.label)}</a>
       </div>`
    : '';
  const footHtml = footnote
    ? `<p style="color: #666; font-size: 12px; line-height: 1.6; margin: 16px 0 0;">${footnote}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 24px 16px; background: #f7faf5; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', sans-serif; color: #333;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.04);">
    <div style="background: linear-gradient(135deg, #459c67 0%, #6db887 100%); padding: 24px; color: #fff; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 600;">${title}</h1>
    </div>
    <div style="padding: 24px;">
      ${body}
      ${ctaHtml}
      ${footHtml}
    </div>
    <div style="border-top: 1px solid #eee; padding: 16px 24px; text-align: center; color: #999; font-size: 12px;">
      <p style="margin: 0 0 4px;">此邮件由系统自动发送,请勿直接回复</p>
      <p style="margin: 0;"><a href="${SITE_URL}" style="color: #459c67; text-decoration: none;">${BRAND} · plantcommunity.cn</a></p>
    </div>
  </div>
</body>
</html>`;
}

/** 验证码邮件 */
export function otpEmail(code: string, ttlMinutes = 10) {
  const subject = `【${BRAND}】邮箱验证码 ${code}`;
  const html = shell({
    title: '🌿 邮箱验证码',
    body: `
      <p style="margin: 0 0 12px; color: #333; font-size: 14px;">你的验证码是:</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2d6a47; background: #f0f9f4; padding: 16px; border-radius: 8px; text-align: center; margin: 0;">${code}</div>
      <p style="color: #666; font-size: 13px; line-height: 1.6; margin: 16px 0 0;">验证码 ${ttlMinutes} 分钟内有效,请勿告诉他人。<br/>如非本人操作,请忽略此邮件。</p>
    `,
  });
  const text = `你的肉友社验证码是:${code}\n${ttlMinutes} 分钟内有效,请勿告诉他人。`;
  return { subject, html, text };
}

/** 欢迎邮件(新用户首次注册触发) */
export function welcomeEmail(opts: { userName: string; userId: string }) {
  const subject = `🌿 欢迎加入${BRAND},开启你的多肉旅程`;
  const userPageUrl = `${SITE_URL}/user/${opts.userId}`;
  const settingsUrl = `${SITE_URL}/settings/profile`;

  const html = shell({
    title: `🌿 欢迎,${escapeText(opts.userName)}`,
    body: `
      <p style="margin: 0 0 12px; color: #333; font-size: 15px; line-height: 1.7;">
        终于等到你 🎉<br/>
        ${BRAND}是一个多肉爱好者的中文社区,在这里你可以:
      </p>
      <ul style="color: #333; font-size: 14px; line-height: 1.9; padding-left: 20px; margin: 0 0 16px;">
        <li>📸 <b>晒图分享</b>:记录你养的每一颗肉肉</li>
        <li>📖 <b>品种百科</b>:40+ 主流品种养护图鉴</li>
        <li>💬 <b>提问求助</b>:浇水、配土、度夏,老玩家在线答疑</li>
        <li>🏆 <b>签到 / 徽章</b>:每日积分,等级越高权益越多</li>
      </ul>
      <p style="color: #666; font-size: 13px; line-height: 1.7; margin: 0;">
        <b>3 步上手</b>:
        <br/>① 完善个人资料(头像 / 简介)
        <br/>② 关注感兴趣的板块或肉友
        <br/>③ 发布你的第一条多肉日记
      </p>
    `,
    cta: { label: '完善个人资料 →', url: settingsUrl },
    footnote: `不想接收此类邮件? <a href="${userPageUrl}" style="color: #459c67; text-decoration: none;">通知设置</a>`,
  });

  const text = `欢迎加入${BRAND}!\n\n这是一个多肉爱好者的中文社区。\n\n推荐 3 步上手:\n1. 完善个人资料\n2. 关注感兴趣的板块\n3. 发布你的第一条多肉日记\n\n${SITE_URL}`;

  return { subject, html, text };
}

// ============================================================
// 工具
// ============================================================

function escapeText(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeText(s);
}
