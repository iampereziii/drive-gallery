import fs from 'node:fs';
import path from 'node:path';

export type PathErrorCode = 'INVALID_PATH' | 'OUTSIDE_ROOT';

/** Thrown when a request path is malformed or escapes the browse root. */
export class PathError extends Error {
  constructor(
    public code: PathErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PathError';
  }
}

/**
 * Lexically resolve a relative request path against `root` and guarantee the
 * result stays inside `root`. Rejects absolute paths, Windows drive letters,
 * and `..` escapes. This is pure (no filesystem access) so it is easy to test.
 *
 * `root` must already be an absolute, canonical path (see config.loadConfig).
 */
export function resolveWithin(root: string, rel: string): string {
  const cleaned = (rel ?? '').replace(/\\/g, '/').replace(/^\/+/, '');

  if (path.isAbsolute(cleaned) || /^[a-zA-Z]:/.test(cleaned)) {
    throw new PathError('INVALID_PATH', 'Absolute paths are not allowed.');
  }

  const abs = path.resolve(root, cleaned);
  const within = path.relative(root, abs);
  if (within === '..' || within.startsWith(`..${path.sep}`) || path.isAbsolute(within)) {
    throw new PathError('OUTSIDE_ROOT', 'Path escapes the photo root.');
  }
  return abs;
}

/**
 * Like {@link resolveWithin} but also follows symlinks and re-checks containment,
 * so a symlink inside the root that points outside it is still rejected. If the
 * target does not exist yet, falls back to the lexical path (the caller's stat
 * will then surface a clean ENOENT → 404).
 */
export function realResolveWithin(root: string, rel: string): string {
  const abs = resolveWithin(root, rel);
  let real: string;
  try {
    real = fs.realpathSync(abs);
  } catch {
    return abs; // does not exist — let the caller 404
  }
  const within = path.relative(root, real);
  if (within === '..' || within.startsWith(`..${path.sep}`) || path.isAbsolute(within)) {
    throw new PathError('OUTSIDE_ROOT', 'Path escapes the photo root (symlink).');
  }
  return real;
}
