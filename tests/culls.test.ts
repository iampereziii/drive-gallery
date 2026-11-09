import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildApp } from '../src/server/app';
import { loadConfig, type Config } from '../src/server/config';
import type { CullManifest } from '../src/types';

let root: string;
let outside: string;
let config: Config;

const readManifest = (): CullManifest => JSON.parse(fs.readFileSync(config.cullFile, 'utf8')) as CullManifest;

beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dg-cull-root-')));
  outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dg-cull-out-')));
  fs.mkdirSync(path.join(root, 'trip'));
  fs.writeFileSync(path.join(root, 'trip', 'a.jpg'), 'x');
  fs.writeFileSync(path.join(root, 'trip', 'b.jpg'), 'x');
  fs.writeFileSync(path.join(root, 'notes.txt'), 'x');
  fs.writeFileSync(path.join(outside, 'secret.jpg'), 'x');
  config = {
    photosRoot: root,
    port: 0,
    host: '127.0.0.1',
    thumbCacheDir: path.join(outside, 'thumbs'),
    thumbMaxWidth: 400,
    cullFile: path.join(outside, 'culls', 'culls.json'),
  };
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

/** Snapshot every file under root (path → contents) to prove nothing on the drive changed. */
function snapshotRoot(): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) walk(p);
      else out[path.relative(root, p)] = fs.readFileSync(p, 'utf8');
    }
  };
  walk(root);
  return out;
}

describe('PUT /api/culls', () => {
  it('tags an image, shows it in the folder listing, and persists it to CULL_FILE', async () => {
    const app = buildApp(config);
    const put = await request(app).put('/api/culls').send({ path: 'trip/a.jpg', tag: 'like' });
    expect(put.status).toBe(200);
    expect(put.body.data).toEqual({ path: 'trip/a.jpg', tag: 'like' });

    const list = await request(app).get('/api/browse').query({ path: 'trip' });
    const byName = Object.fromEntries(
      list.body.data.images.map((i: { name: string; tag?: string }) => [i.name, i.tag]),
    );
    expect(byName).toEqual({ 'a.jpg': 'like', 'b.jpg': undefined });

    const m = readManifest();
    expect(m.version).toBe(1);
    expect(m.root).toBe(root);
    expect(m.items['trip/a.jpg'].tag).toBe('like');
  });

  it('keeps tags across a server restart (new app instance reloads the manifest)', async () => {
    await request(buildApp(config)).put('/api/culls').send({ path: 'trip/b.jpg', tag: 'maybe' });
    const list = await request(buildApp(config)).get('/api/browse').query({ path: 'trip' });
    expect(list.body.data.images.find((i: { name: string }) => i.name === 'b.jpg').tag).toBe('maybe');
  });

  it('changes a tag and clears it with null', async () => {
    const app = buildApp(config);
    await request(app).put('/api/culls').send({ path: 'trip/a.jpg', tag: 'maybe' });
    await request(app).put('/api/culls').send({ path: 'trip/a.jpg', tag: 'no' });
    expect(readManifest().items['trip/a.jpg'].tag).toBe('no');

    const clear = await request(app).put('/api/culls').send({ path: 'trip/a.jpg', tag: null });
    expect(clear.status).toBe(200);
    expect(readManifest().items['trip/a.jpg']).toBeUndefined();
  });

  it('never modifies anything under PHOTOS_ROOT (Rule 2)', async () => {
    const before = snapshotRoot();
    const app = buildApp(config);
    await request(app).put('/api/culls').send({ path: 'trip/a.jpg', tag: 'like' });
    await request(app).put('/api/culls').send({ path: 'trip/b.jpg', tag: 'no' });
    expect(snapshotRoot()).toEqual(before);
  });

  it.each(['../../etc/passwd.jpg', 'trip/../../x.jpg'])('rejects escaping path %s with 403 (Rule 1)', async (p) => {
    const res = await request(buildApp(config)).put('/api/culls').send({ path: p, tag: 'like' });
    expect(res.status).toBe(403);
    expect(fs.existsSync(config.cullFile)).toBe(false);
  });

  it('rejects absolute paths (400 INVALID_PATH or 403)', async () => {
    const res = await request(buildApp(config))
      .put('/api/culls')
      .send({ path: path.join(outside, 'secret.jpg'), tag: 'like' });
    expect([400, 403]).toContain(res.status);
    expect(fs.existsSync(config.cullFile)).toBe(false);
  });

  it('rejects a symlink/junction that points outside the root with 403', async () => {
    // Junctions need no admin rights on Windows; plain dir symlinks elsewhere.
    fs.symlinkSync(outside, path.join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
    const res = await request(buildApp(config)).put('/api/culls').send({ path: 'escape/secret.jpg', tag: 'like' });
    expect(res.status).toBe(403);
    expect(fs.existsSync(config.cullFile)).toBe(false);
  });

  it('rejects non-image files with 400 NOT_IMAGE', async () => {
    const res = await request(buildApp(config)).put('/api/culls').send({ path: 'notes.txt', tag: 'like' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NOT_IMAGE');
  });

  it('rejects an invalid tag with 400 INVALID_TAG', async () => {
    const res = await request(buildApp(config)).put('/api/culls').send({ path: 'trip/a.jpg', tag: 'love' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TAG');
  });

  it('404s an image that does not exist', async () => {
    const res = await request(buildApp(config)).put('/api/culls').send({ path: 'trip/nope.jpg', tag: 'like' });
    expect(res.status).toBe(404);
  });

  it('returns 503 DRIVE_UNAVAILABLE when the drive is gone, keeping saved tags (Rule 5)', async () => {
    await request(buildApp(config)).put('/api/culls').send({ path: 'trip/a.jpg', tag: 'like' });
    const app = buildApp(config);
    fs.rmSync(root, { recursive: true, force: true });
    const res = await request(app).put('/api/culls').send({ path: 'trip/b.jpg', tag: 'like' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DRIVE_UNAVAILABLE');
    expect(readManifest().items['trip/a.jpg'].tag).toBe('like');
  });

  it('refuses to start on a corrupt manifest instead of overwriting it', () => {
    fs.mkdirSync(path.dirname(config.cullFile), { recursive: true });
    fs.writeFileSync(config.cullFile, '{ not json');
    expect(() => buildApp(config)).toThrow(/CULL_FILE is not valid JSON/);
    expect(fs.readFileSync(config.cullFile, 'utf8')).toBe('{ not json');
  });
});

describe('loadConfig CULL_FILE', () => {
  it('refuses a CULL_FILE inside PHOTOS_ROOT', () => {
    expect(() =>
      loadConfig({ PHOTOS_ROOT: root, THUMB_CACHE_DIR: config.thumbCacheDir, CULL_FILE: path.join(root, 'culls.json') }),
    ).toThrow(/CULL_FILE must not be inside PHOTOS_ROOT/);
  });

  it('defaults CULL_FILE to .culls/culls.json under the working directory', () => {
    const c = loadConfig({ PHOTOS_ROOT: root, THUMB_CACHE_DIR: config.thumbCacheDir });
    expect(c.cullFile).toBe(path.resolve('.culls', 'culls.json'));
  });
});
