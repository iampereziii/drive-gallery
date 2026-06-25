import { Router } from 'express';
import type { Config } from '../config';
import { driveAvailable } from '../lib/http';
import type { HealthInfo } from '../../types';

export function healthRouter(config: Config): Router {
  const r = Router();
  r.get('/', (_req, res) => {
    const data: HealthInfo = {
      driveConnected: driveAvailable(config.photosRoot),
      root: config.photosRoot,
    };
    res.json({ data });
  });
  return r;
}
