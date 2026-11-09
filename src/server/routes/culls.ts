import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import type { Config } from '../config';
import type { CullStore } from '../lib/cullStore';
import { sendError, driveAvailable } from '../lib/http';
import { realResolveWithin, PathError } from '../lib/safePath';
import { isImage } from '../lib/imageTypes';
import { listTagged } from '../lib/listing';
import { isCullTag, isLikeGoal, MAX_LIKE_GOAL, type CullSummary, type CullUpdateResult, type TaggedImages } from '../../types';

/**
 * GET  /api/culls/summary — drive-wide totals per tag.
 * GET  /api/culls?tag=like — every image with that tag, across all folders.
 * PUT  /api/culls/goal — set or clear the Like goal ({ goal: number | null }).
 * PUT  /api/culls — set or clear one image's culling tag.
 * Body: { path: string, tag: 'like' | 'maybe' | 'no' | null }.
 * Only CULL_FILE is written; the image itself is only stat'ed, never opened.
 */
export function cullsRouter(config: Config, store: CullStore): Router {
  const r = Router();

  r.get('/summary', (_req, res) => {
    const data: CullSummary = store.summary();
    res.json({ data });
  });

  // The goal lives only in CULL_FILE (off the drive), so no drive check is needed.
  r.put('/goal', async (req, res) => {
    const goal = (req.body as { goal?: unknown } | undefined)?.goal;
    if (goal !== null && !isLikeGoal(goal)) {
      return sendError(res, 400, 'INVALID_GOAL', `goal must be a whole number from 1 to ${MAX_LIKE_GOAL}, or null.`);
    }
    try {
      await store.setGoal(goal);
    } catch (err) {
      console.error('[culls]', err);
      return sendError(res, 500, 'INTERNAL', 'Could not save the goal.');
    }
    const data: CullSummary = store.summary();
    res.json({ data });
  });

  r.get('/', async (req, res) => {
    const tag = req.query.tag;
    if (!isCullTag(tag)) {
      return sendError(res, 400, 'INVALID_TAG', 'tag must be "like", "maybe", or "no".');
    }
    if (!driveAvailable(config.photosRoot)) {
      return sendError(res, 503, 'DRIVE_UNAVAILABLE', 'The photo drive is not available. Check that it is connected.');
    }
    try {
      const data: TaggedImages = { tag, images: await listTagged(config, tag, store.pathsWith(tag)) };
      res.json({ data });
    } catch (err) {
      console.error('[culls]', err);
      return sendError(res, 500, 'INTERNAL', 'Could not list tagged photos.');
    }
  });

  r.put('/', async (req, res) => {
    if (!driveAvailable(config.photosRoot)) {
      return sendError(res, 503, 'DRIVE_UNAVAILABLE', 'The photo drive is not available. Check that it is connected.');
    }

    const body = (req.body ?? {}) as { path?: unknown; tag?: unknown };
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
    const data: CullUpdateResult = { path: rel, tag, summary: store.summary() };
    res.json({ data });
  });

  return r;
}
