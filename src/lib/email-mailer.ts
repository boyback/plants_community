/**
 * 通用邮件发送封装
 *
 * 抽离自 otp.ts,供验证码邮件/欢迎邮件/节日群发等多种场景共用。
 *
 * 环境变量:
 *   SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS / SMTP_FROM_NAME
 */
import nodemailer, { type Transporter } from 'nodemailer';

let transporterCache: Transporter | null = null;

/**
 * 拿到全局 transporter,如果配置缺失返回 null。
 * 业务方需要先判断 isMailerEnabled 再发件。
 */
export function getTransporter(): Transporter | null {
  if (transporterCache) return transporterCache;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = (process.env.SMTP_SECURE ?? 'true').toLowerCase() !== 'false';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  transporterCache = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return transporterCache;
}

export function isMailerEnabled(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendMailResult {
  ok: boolean;
  error?: string;
}

/**
 * 发邮件(成功 ok=true,失败仅返回 error,不抛异常)。
 *
 * 业务方应根据场景选择:
 *   - 关键操作(注册/找回密码):await 等结果,失败返回错误给用户
 *   - 增值通知(欢迎、节日):fire-and-forget,失败仅 log
 */
export async function sendMail(params: SendMailParams): Promise<SendMailResult> {
  const tr = getTransporter();
  if (!tr) return { ok: false, error: 'SMTP 未配置' };

  const fromAddr = process.env.SMTP_USER!;
  const fromName = process.env.SMTP_FROM_NAME || '植友圈';

  try {
    await tr.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || stripHtml(params.html),
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * fire-and-forget 发邮件 + 自动 log,不阻塞主流程。
 * 用于欢迎邮件等非关键场景。
 */
export function fireSendMail(params: SendMailParams): void {
  if (!isMailerEnabled()) return;
  sendMail(params)
    .then((r) => {
      if (r.ok) {
        console.log(`[mailer] ✓ ${params.to} · ${params.subject}`);
      } else {
        console.warn(`[mailer] ✗ ${params.to} · ${params.subject}: ${r.error}`);
      }
    })
    .catch(() => null);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000);
}
