/**
 * 上传 driver 抽象
 *
 * 当前实现:LocalDriver(本地文件系统,Next.js public/uploads)
 *
 * 切换到 OSS / S3 的指引:
 *   1. 实现一个新的 UploadDriver(例如 OssDriver),复用同一接口:
 *      - put(key, body, contentType) 写对象,返回可访问 URL
 *      - delete(key) 可选
 *   2. 在 getUploadDriver() 里根据 process.env.UPLOAD_DRIVER 返回对应实现:
 *        if (process.env.UPLOAD_DRIVER === 'oss') return new OssDriver(...);
 *   3. 在 .env 配置 OSS access key / bucket 等
 *
 * 安全策略:
 *   - 仅允许 image/jpeg / image/png / image/webp / image/gif
 *   - 文件大小 ≤ 5MB
 *   - 文件名重新生成,使用 cuid + 原扩展名,避免目录穿越
 *   - 路径按用户隔离 uploads/{userId}/...
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface UploadDriver {
  /** 写入对象,返回可被前端 <img src> 直接使用的 URL */
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  /** 删除对象(暂未使用,留接口) */
  delete?(key: string): Promise<void>;
}

const ROOT_DIR = path.join(process.cwd(), 'public', 'uploads');

class LocalDriver implements UploadDriver {
  async put(key: string, body: Buffer): Promise<string> {
    const full = path.join(ROOT_DIR, key);
    const dir = path.dirname(full);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(full, body);
    return `/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const full = path.join(ROOT_DIR, key);
    await fs.unlink(full).catch(() => null);
  }
}

let driver: UploadDriver | null = null;

export function getUploadDriver(): UploadDriver {
  if (driver) return driver;
  // 当前默认本地 driver。要切换 OSS 时,在这里加判断。
  driver = new LocalDriver();
  return driver;
}

// =============== 校验 ===============

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** 通过 magic-byte 嗅探真实类型,防止伪造 Content-Type */
export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // PNG 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'image/png';
  }
  // JPEG FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  // GIF87a / GIF89a
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return 'image/gif';
  }
  // WEBP: RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function getExtForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? 'bin';
}
