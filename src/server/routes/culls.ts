import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import type { Config } from '../config';
import type { CullStore } from '../lib/cullStore';
import { sendError, driveAvailable } from '../lib/http';
import { realResolveWithin, PathError } from '../lib/safePath';
import { isImage } from '../lib/imageTypes';
import { isCullTag, type CullUpdate } from '../../types';

/**
 * PUT /api/culls — set or clear one image's culling tag.
 * Body: { path: string, tag: 'like' | 'maybe' | 'no' | null }.
 * Only CULL_FILE is written; the image itself is only stat'ed, never opened.
 */
export function cullsRouter(config: Config, store: CullStore): Router {
  const r = Router();

  r.put('/', async (req, res) => {
    if (!driveAvailable(config.photosRoot)) {
      return sendError(res, 503, 'DRIVE_UNAVAILABLE', 'The photo drive is not available. Check that it is connected.');
    }

    const body = (req.body ?? {}) as Partial<Record<keyof CullUpdate, unknown>>;
    if (typeof body.path !== 'string' || !body.path) {
      return sendError(res, 400, 'MISSING_PATH', 'A path is required.');
    }
    if (body.tag !== null && !isCullTag(body.tag)) {
      return sendError(res, 400, 'INVALID_TAG', 'tag must be "like", "maybe", "no", or null.');
    }
    const tag = body.tag;

    let abs: string;
    try {
      abs = realResolveWithin(config.photosRoot, body.path);
    } catch (err) {
      if (err instanceof PathError) {
        return sendError(res, err.code === 'OUTSIDE_ROOT' ? 403 : 400, err.code, err.message);
      }
      throw err;
    }

    if (!isImage(abs)) {
      return sendError(res, 400, 'NOT_IMAGE', 'Only supported images can be tagged.');
    }
    try {
      if (!(await fs.promises.stat(abs)).isFile()) {
        return sendError(res, 400, 'NOT_IMAGE', 'Only supported images can be tagged.');
      }
    } catch {
      return sendError(res, 404, 'NOT_FOUND', 'Image not found.');
    }

    // Key by the canonical relative path — the same form listing.ts emits.
    const rel = path.relative(config.photosRoot, abs).split(path.sep).join('/');
    try {
      await store.set(rel, tag);
    } catch (err) {
      console.error('[culls]', err);
      return sendError(res, 500, 'INTERNAL', 'Could not save the tag.');
    }
    const data: CullUpdate = { path: rel, tag };
    res.json({ data });
  });

  return r;
}
