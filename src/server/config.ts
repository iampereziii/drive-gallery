import fs from 'node:fs';
import path from 'node:path';

export interface Config {
  /** Canonical (realpath) absolute path to the browse root. */
  photosRoot: string;
  port: number;
  host: string;
  /** Absolute path to the thumbnail cache dir — guaranteed outside photosRoot. */
  thumbCacheDir: string;
  thumbMaxWidth: number;
  /** Absolute path to the cull manifest JSON — guaranteed outside photosRoot. */
  cullFile: string;
}

/** True if `target` is `root` itself or anywhere beneath it. */
function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Reads and validates configuration from the environment. Throws (caller exits)
 * if PHOTOS_ROOT is missing/unreadable or if the thumbnail cache would live
 * inside the drive — both are setup mistakes worth failing loudly on.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const raw = env.PHOTOS_ROOT;
  if (!raw || !raw.trim()) {
    throw new Error(
      'PHOTOS_ROOT is not set. Set it to the absolute path of the drive folder to browse (e.g. E:\\Photos).',
    );
  }

  const resolved = path.resolve(raw.trim());
  let photosRoot: string;
  try {
    photosRoot = fs.realpathSync(resolved);
  } catch {
    throw new Error(`PHOTOS_ROOT does not exist or is not readable: ${resolved}`);
  }
  if (!fs.statSync(photosRoot).isDirectory()) {
    throw new Error(`PHOTOS_ROOT is not a directory: ${resolved}`);
  }

  const thumbCacheDir = path.resolve(env.THUMB_CACHE_DIR?.trim() || '.thumb-cache');
  if (isInside(photosRoot, thumbCacheDir)) {
    throw new Error('THUMB_CACHE_DIR must not be inside PHOTOS_ROOT (it would write onto the drive).');
  }

  const cullFile = path.resolve(env.CULL_FILE?.trim() || path.join('.culls', 'culls.json'));
  if (isInside(photosRoot, cullFile)) {
    throw new Error('CULL_FILE must not be inside PHOTOS_ROOT (it would write onto the drive).');
  }

  return {
    photosRoot,
    port: Number(env.PORT ?? 8080),
    host: env.HOST?.trim() || '0.0.0.0',
    thumbCacheDir,
    thumbMaxWidth: Number(env.THUMB_MAX_WIDTH ?? 400),
    cullFile,
  };
}
