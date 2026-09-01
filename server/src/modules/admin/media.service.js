'use strict';
/**
 * media.service — آپلود فایل admin (گالری محصول، کاور آلبوم، ...)
 * فایل روی disk می‌رود، فقط path در DB نگهداری می‌شود (سازگار با انتقال بعدی به S3).
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('../../config');
const { ValidationError } = require('../../utils/errors');

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

async function upload(file) {
  if (!file || typeof file.toBuffer !== 'function') throw new ValidationError('فایلی ارسال نشده.');
  const mime = file.mimetype || '';
  const ext = ALLOWED[mime];
  if (!ext) throw new ValidationError('فقط JPG/PNG/WebP مجازه.');
  const buf = await file.toBuffer();
  if (buf.length > config.maxUploadBytes) throw new ValidationError('فایل بزرگ‌تر از حد مجازە.');

  const filename = `media_${crypto.randomUUID()}${ext}`;
  const dir = path.join(config.uploadDir, 'media');
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, filename), buf);
  return { url: `/media/media/${filename}`, size: buf.length };
}

module.exports = { upload };
