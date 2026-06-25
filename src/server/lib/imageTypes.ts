// v1 allowlist: common web-renderable raster formats only.
// No HEIC/HEIF and no video (see project-spec.md, Business Rule 3).
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif']);

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
};

/** Lowercased extension without the dot (e.g. "photo.JPG" → "jpg"). */
export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

export function isImage(name: string): boolean {
  return IMAGE_EXTS.has(extOf(name));
}

export function mimeFor(ext: string): string {
  return MIME[ext] ?? 'application/octet-stream';
}
