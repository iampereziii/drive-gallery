import express, { type Express } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import type { Config } from './config';
import { healthRouter } from './routes/health';
import { browseRouter } from './routes/browse';
import { thumbRouter } from './routes/thumb';
import { imageRouter } from './routes/image';
import { cullsRouter } from './routes/culls';
import { CullStore } from './lib/cullStore';

/**
 * Build the Express app for a given config. Kept separate from index.ts so tests
 * can mount it with a fixture root via supertest without binding a port.
 */
export function buildApp(config: Config): Express {
  const app = express();
  app.disable('x-powered-by');

  // Minimal request logging: method, path, status, duration.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });

  // Culling tags live in memory, persisted to CULL_FILE (outside the drive).
  const culls = new CullStore(config.cullFile, config.photosRoot);

  const api = express.Router();
  api.use(express.json({ limit: '16kb' }));
  api.use('/health', healthRouter(config));
  api.use('/browse', browseRouter(config, culls));
  api.use('/thumb', thumbRouter(config));
  api.use('/image', imageRouter(config));
  api.use('/culls', cullsRouter(config, culls));
  app.use('/api', api);

  // In production, serve the built SPA from the same process. SPA fallback sends
  // index.html for any non-/api route so client-side deep links (/b/...) work.
  const clientDir = path.resolve('dist/client');
  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDir, 'index.html'));
    });
  }

  return app;
}
