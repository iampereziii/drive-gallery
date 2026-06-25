import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import type { Config } from '../config';
import { realResolveWithin } from './safePath';
import { isImage } from './imageTypes';

export interface Thumbnail {
  data: Buffer;
  contentType: string;
}

/**
 * Return a webp thumbnail for an image, generating and caching it on first
 * request (Business Rule 5). The cache key is (relPath, mtimeMs, width) so a
 * changed source file transparently produces a fresh thumbnail. The cache lives
 * in THUMB_CACHE_DIR, never on the drive (Business Rule 2).
 */
export async function getThumbnail(config: Config, rel: string, width: number): Promise<Thumbnail> {
  const abs = realResolveWithin(config.photosRoot, rel);
  if (!isImage(abs)) {
    const err = new Error('Not an allowed image type.') as NodeJS.ErrnoException;
    err.code = 'NOT_IMAGE';
    throw err;
  }

  const stat = await fs.promises.stat(abs); // ENOENT bubbles up to a 404
  const key = crypto.createHash('sha1').update(`${rel}|${stat.mtimeMs}|${width}`).digest('hex');
  const cachePath = path.join(config.thumbCacheDir, `${key}.webp`);

  try {
    const cached = await fs.promises.readFile(cachePath);
    return { data: cached, contentType: 'image/webp' };
  } catch {
    // cache miss — fall through and generate
  }

  const data = await sharp(abs, { failOn: 'none' })
    .rotate() // honor EXIF orientation
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  await fs.promises.mkdir(config.thumbCacheDir, { recursive: true });
  await fs.promises.writeFile(cachePath, data).catch(() => {
    /* a failed cache write is non-fatal — we still return the bytes */
  });

  return { data, contentType: 'image/webp' };
}
