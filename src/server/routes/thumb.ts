import { Router } from 'express';
import type { Config } from '../config';
import { getThumbnail } from '../lib/thumbnailCache';
import { sendError, driveAvailable } from '../lib/http';
import { PathError } from '../lib/safePath';

const MAX_WIDTH = 1200;

export function thumbRouter(config: Config): Router {
  const r = Router();

  r.get('/', async (req, res) => {
    if (!driveAvailable(config.photosRoot)) {
      return sendError(res, 503, 'DRIVE_UNAVAILABLE', 'The photo drive is not available. Check that it is connected.');
    }

    const rel = typeof req.query.path === 'string' ? req.query.path : '';
    if (!rel) return sendError(res, 400, 'MISSING_PATH', 'A path query parameter is required.');

    const requested = Number(req.query.w);
    const width = Number.isFinite(requested)
      ? Math.min(Math.max(Math.trunc(requested), 16), MAX_WIDTH)
      : config.thumbMaxWidth;

    try {
      const { data, contentType } = await getThumbnail(config, rel, width);
      res.setHeader('Content-Type', contentType);
      // Safe to cache hard: the URL identifies the file, the cache key includes mtime.
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(data);
    } catch (err) {
      if (err instanceof PathError) {
        return sendError(res, err.code === 'OUTSIDE_ROOT' ? 403 : 400, err.code, err.message);
      }
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return sendError(res, 404, 'NOT_FOUND', 'Image not found.');
      if (code === 'NOT_IMAGE') return sendError(res, 415, 'NOT_IMAGE', 'That file is not a supported image.');
      console.error('[thumb]', err);
      return sendError(res, 500, 'INTERNAL', 'Could not generate a thumbnail for that image.');
    }
  });

  return r;
}
