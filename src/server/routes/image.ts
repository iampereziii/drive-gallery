import { Router } from 'express';
import type { Config } from '../config';
import { sendError, driveAvailable } from '../lib/http';
import { realResolveWithin, PathError } from '../lib/safePath';
import { isImage, extOf, mimeFor } from '../lib/imageTypes';

export function imageRouter(config: Config): Router {
  const r = Router();

  r.get('/', (req, res) => {
    if (!driveAvailable(config.photosRoot)) {
      return sendError(res, 503, 'DRIVE_UNAVAILABLE', 'The photo drive is not available. Check that it is connected.');
    }

    const rel = typeof req.query.path === 'string' ? req.query.path : '';
    if (!rel) return sendError(res, 400, 'MISSING_PATH', 'A path query parameter is required.');

    let abs: string;
    try {
      abs = realResolveWithin(config.photosRoot, rel);
    } catch (err) {
      if (err instanceof PathError) {
        return sendError(res, err.code === 'OUTSIDE_ROOT' ? 403 : 400, err.code, err.message);
      }
      throw err;
    }

    if (!isImage(abs)) {
      return sendError(res, 415, 'NOT_IMAGE', 'That file is not a supported image.');
    }

    const headers: Record<string, string> = {
      'Content-Type': mimeFor(extOf(abs)),
      'Cache-Control': 'public, max-age=86400',
    };
    // ?download=1 forces a save with the original filename — reliable on mobile
    // browsers where the <a download> attribute is honored inconsistently.
    if (req.query.download === '1') {
      const base = rel.split('/').pop() || 'image';
      headers['Content-Disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(base)}`;
    }

    // res.sendFile handles Range requests, conditional GET (304), and streaming.
    res.sendFile(
      abs,
      { headers },
      (err) => {
        if (err && !res.headersSent) {
          const code = (err as NodeJS.ErrnoException).code;
          if (code === 'ENOENT') return sendError(res, 404, 'NOT_FOUND', 'Image not found.');
          console.error('[image]', err);
          return sendError(res, 500, 'INTERNAL', 'Could not read that image.');
        }
      },
    );
  });

  return r;
}
