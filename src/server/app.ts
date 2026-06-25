import express, { type Express } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import type { Config } from './config';
import { healthRouter } from './routes/health';
import { browseRouter } from './routes/browse';
import { thumbRouter } from './routes/thumb';
import { imageRouter } from './routes/image';

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

  const api = express.Router();
  api.use('/health', healthRouter(config));
  api.use('/browse', browseRouter(config));
  api.use('/thumb', thumbRouter(config));
  api.use('/image', imageRouter(config));
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
