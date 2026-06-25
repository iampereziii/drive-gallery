import { Router } from 'express';
import type { Config } from '../config';
import { listDir } from '../lib/listing';
import { sendError, driveAvailable } from '../lib/http';
import { PathError } from '../lib/safePath';

export function browseRouter(config: Config): Router {
  const r = Router();

  r.get('/', async (req, res) => {
    if (!driveAvailable(config.photosRoot)) {
      return sendError(res, 503, 'DRIVE_UNAVAILABLE', 'The photo drive is not available. Check that it is connected.');
    }

    const rel = typeof req.query.path === 'string' ? req.query.path : '';
    try {
      const listing = await listDir(config, rel);
      res.json({ data: listing });
    } catch (err) {
      if (err instanceof PathError) {
        return sendError(res, err.code === 'OUTSIDE_ROOT' ? 403 : 400, err.code, err.message);
      }
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return sendError(res, 404, 'NOT_FOUND', 'Folder not found.');
      if (code === 'ENOTDIR') return sendError(res, 400, 'NOT_A_DIRECTORY', 'That path is not a folder.');
      console.error('[browse]', err);
      return sendError(res, 500, 'INTERNAL', 'Something went wrong reading that folder.');
    }
  });

  return r;
}
