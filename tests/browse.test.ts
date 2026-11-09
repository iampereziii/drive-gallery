import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildApp } from '../src/server/app';
import type { Config } from '../src/server/config';

let root: string;
let config: Config;

beforeAll(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dg-')));
  fs.mkdirSync(path.join(root, 'vacation'));
  fs.writeFileSync(path.join(root, 'a.jpg'), 'x');
  fs.writeFileSync(path.join(root, 'b.png'), 'x');
  fs.writeFileSync(path.join(root, 'notes.txt'), 'x'); // not an image
  fs.writeFileSync(path.join(root, '.hidden.jpg'), 'x'); // dotfile
  fs.writeFileSync(path.join(root, 'Thumbs.db'), 'x'); // OS junk
  config = {
    photosRoot: root,
    port: 0,
    host: '127.0.0.1',
    thumbCacheDir: path.join(os.tmpdir(), `dg-cache-${Date.now()}`),
    thumbMaxWidth: 400,
    cullFile: path.join(os.tmpdir(), `dg-culls-${Date.now()}`, 'culls.json'),
  };
});

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe('GET /api/browse', () => {
  it('lists folders and allowed images, skipping junk (Rules 3 & 4)', async () => {
    const res = await request(buildApp(config)).get('/api/browse');
    expect(res.status).toBe(200);
    expect(res.body.data.folders.map((f: { name: string }) => f.name)).toEqual(['vacation']);
    expect(res.body.data.images.map((i: { name: string }) => i.name)).toEqual(['a.jpg', 'b.png']);
    expect(res.body.data.parent).toBeNull();
  });

  it('rejects path traversal with 403 (Rule 1)', async () => {
    const res = await request(buildApp(config)).get('/api/browse').query({ path: '../../etc' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('OUTSIDE_ROOT');
  });

  it('404s a missing folder', async () => {
    const res = await request(buildApp(config)).get('/api/browse').query({ path: 'nope' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/health', () => {
  it('reports the drive as connected', async () => {
    const res = await request(buildApp(config)).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.driveConnected).toBe(true);
  });
});
