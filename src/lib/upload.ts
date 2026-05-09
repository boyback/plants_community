/**
 * 上传 driver 抽象 + 配额/校验
 *
 * 当前实现:LocalDriver(本地文件系统,Next.js public/uploads)
 *
 * 业务规则:
 *   - 图片:≤ 10 MB,任意用户可传
 *   - 视频:≤ 100 MB,仅 VIP 可传
 *   - 大于 5 MB 的文件走分片上传(/api/upload/init|chunk|finish)
 *   - sha256 秒传:相同文件直接返回已有 url
 *
 * 切换 OSS/S3 的指引:实现新 driver,在 getUploadDriver() 里按 env 选择。
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface UploadDriver {
  /** 写入对象,返回可被前端 <img/video src> 直接使用的 URL */
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  /** 删除对象(暂未使用,留接口) */
  delete?(key: string): Promise<void>;
  /** 已存对象的绝对路径(供分片合并使用) */
  resolvePath?(key: string): string;
}

const ROOT_DIR = path.join(process.cwd(), 'public', 'uploads');
/** 分片临时目录(已传分片在合并前的存放位置)*/
const CHUNK_DIR = path.join(process.cwd(), 'data', 'upload-chunks');

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

  resolvePath(key: string): string {
    return path.join(ROOT_DIR, key);
  }
}

let driver: UploadDriver | null = null;

export function getUploadDriver(): UploadDriver {
  if (driver) return driver;
  driver = new LocalDriver();
  return driver;
}

export function getChunkDir(): string {
  return CHUNK_DIR;
}

// =============== 限额 ===============

/** 走分片上传的阈值(超过则前端切片) */
export const CHUNK_THRESHOLD = 5 * 1024 * 1024; // 5 MB
export const CHUNK_SIZE = 5 * 1024 * 1024; // 每片 5 MB

/** 图片单文件最大 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
/** 视频单文件最大(VIP 限定) */
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

/** 兼容旧代码:默认上传上限(老 /api/upload 一次性接口仍走这个) */
export const MAX_UPLOAD_SIZE = MAX_IMAGE_SIZE;

export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
export const ALLOWED_VIDEO_MIME = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
];

/** 兼容旧代码 */
export const ALLOWED_MIME_TYPES = ALLOWED_IMAGE_MIME;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export function getExtForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? 'bin';
}

export function classifyMime(mime: string): 'image' | 'video' | null {
  if (ALLOWED_IMAGE_MIME.includes(mime)) return 'image';
  if (ALLOWED_VIDEO_MIME.includes(mime)) return 'video';
  return null;
}

/** 通过 magic-byte 嗅探真实 MIME,防止伪造 Content-Type */
export function sniffMime(buf: Buffer): string | null {
  const img = sniffImageMime(buf);
  if (img) return img;
  return sniffVideoMime(buf);
}

export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // PNG 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
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

/** 简单嗅探:只看 ftyp 标记区分 mp4/mov,完整 webm 用 EBML 头 */
export function sniffVideoMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // ISO BMFF: 4 bytes size + 'ftyp' + brand
  if (
    buf[4] === 0x66 && // f
    buf[5] === 0x74 && // t
    buf[6] === 0x79 && // y
    buf[7] === 0x70 // p
  ) {
    const brand = buf.slice(8, 12).toString('ascii');
    if (brand === 'qt  ' || brand.startsWith('qt')) return 'video/quicktime';
    return 'video/mp4';
  }
  // WebM/Matroska: 1A 45 DF A3
  if (
    buf[0] === 0x1a &&
    buf[1] === 0x45 &&
    buf[2] === 0xdf &&
    buf[3] === 0xa3
  ) {
    return 'video/webm';
  }
  return null;
}

/** 计算 sha256(同步,适用于已读取到内存的小文件) */
export async function sha256OfBuffer(buf: Buffer): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function sha256OfFile(filePath: string): Promise<string> {
  const crypto = await import('crypto');
  const { createReadStream } = await import('fs');
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    const s = createReadStream(filePath);
    s.on('data', (c) => h.update(c));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });
}
