import fs from 'node:fs';
import path from 'node:path';
import type { Config } from '../config';
import type { DirListing, FolderEntry, ImageEntry } from '../../types';
import { realResolveWithin } from './safePath';
import { isImage, extOf } from './imageTypes';
import { isHidden } from './hidden';

/** Convert an absolute path under root into a posix relative path ("" at root). */
function toRel(root: string, abs: string): string {
  return path.relative(root, abs).split(path.sep).join('/');
}

/** Natural sort so "img2" comes before "img10". */
function byName(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * List one directory (Business Rules 3, 4, 8): subfolders first, then images,
 * both name-ascending. Hidden/system entries and non-allowlisted files are
 * skipped. Throws PathError on escape, ENOENT for a missing dir, ENOTDIR if the
 * path points at a file.
 */
export async function listDir(config: Config, rel: string): Promise<DirListing> {
  const root = config.photosRoot;
  const absDir = realResolveWithin(root, rel);

  const dirents = await fs.promises.readdir(absDir, { withFileTypes: true });

  const folders: FolderEntry[] = [];
  const imageNames: string[] = [];
  for (const d of dirents) {
    if (isHidden(d.name)) continue;
    if (d.isDirectory()) {
      folders.push({ name: d.name, path: toRel(root, path.join(absDir, d.name)) });
    } else if (d.isFile() && isImage(d.name)) {
      imageNames.push(d.name);
    }
  }

  folders.sort((a, b) => byName(a.name, b.name));
  imageNames.sort(byName);

  const images: ImageEntry[] = [];
  for (const name of imageNames) {
    const absFile = path.join(absDir, name);
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(absFile);
    } catch {
      continue; // vanished between readdir and stat — skip it
    }
    const relFile = toRel(root, absFile);
    const enc = encodeURIComponent(relFile);
    images.push({
      name,
      path: relFile,
      ext: extOf(name),
      sizeBytes: stat.size,
      mtimeMs: stat.mtimeMs,
      thumbUrl: `/api/thumb?path=${enc}`,
      fullUrl: `/api/image?path=${enc}`,
    });
  }

  const self = toRel(root, absDir);
  const parent = self === '' ? null : toRel(root, path.dirname(absDir));
  return { path: self, parent, folders, images };
}
