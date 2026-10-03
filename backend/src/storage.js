// Receipt storage: R2 (S3-compatible) when configured, local disk otherwise.
// Local disk is a dev-only fallback — production refuses to boot without R2
// (see src/config.js) because Render's filesystem is ephemeral.
// The database stores the OBJECT KEY, never a full URL.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from './config.js';

const r2 = config.r2;
export const storageMode = () => (r2.configured ? 'r2' : 'local');

let s3 = null;
function s3Client() {
  if (!s3) {
    s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
    });
  }
  return s3;
}

const EXT_BY_MIME = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };

// Validate by content (magic bytes), not just the client-sent MIME header.
export function sniffImageExt(buffer, claimedMime) {
  if (!buffer || buffer.length < 12) return null;
  const jpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const gif = buffer.toString('ascii', 0, 3) === 'GIF';
  const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  let ext = null;
  if (jpg) ext = '.jpg';
  else if (png) ext = '.png';
  else if (gif) ext = '.gif';
  else if (webp) ext = '.webp';
  if (!ext) return null;
  // Claimed MIME must agree with the actual bytes when it claims to be an image.
  if (claimedMime && claimedMime.startsWith('image/') && EXT_BY_MIME[claimedMime] && EXT_BY_MIME[claimedMime] !== ext) return null;
  return ext;
}

export function receiptKey(businessId, ext) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const safeBiz = String(businessId).replace(/[^a-zA-Z0-9-]/g, '_');
  return `${safeBiz}/${yyyy}/${mm}/${randomUUID()}${ext}`;
}

export async function putReceipt({ businessId, buffer, mime }) {
  const ext = sniffImageExt(buffer, mime);
  if (!ext) {
    const err = new Error('images only (jpeg, png, gif, webp)');
    err.status = 400;
    throw err;
  }
  const maxBytes = config.maxUploadMb * 1024 * 1024;
  if (buffer.length > maxBytes) {
    const err = new Error(`file too large (max ${config.maxUploadMb}MB)`);
    err.status = 413;
    throw err;
  }
  const key = receiptKey(businessId, ext);
  if (storageMode() === 'r2') {
    await s3Client().send(new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: buffer,
      ContentType: mime,
    }));
    return { key, mime, size: buffer.length };
  }
  // Local dev fallback only.
  const dir = path.join('uploads', String(businessId));
  fs.mkdirSync(dir, { recursive: true });
  const filename = key.split('/').pop();
  fs.writeFileSync(path.join(dir, filename), buffer);
  return { key, mime, size: buffer.length, localPath: `/uploads/${businessId}/${filename}` };
}

// Short-lived signed URL. Bucket stays private; only users of the same
// business get here (route checks business_id first).
export async function signedReceiptUrl(key, expiresIn = 300) {
  if (storageMode() !== 'r2') return null; // local mode serves via /uploads
  const url = await getSignedUrl(
    s3Client(),
    new GetObjectCommand({ Bucket: r2.bucket, Key: key }),
    { expiresIn }
  );
  return url;
}
