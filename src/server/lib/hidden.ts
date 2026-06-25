// OS/system entries that should never appear in listings (Business Rule 4).
const SYSTEM_NAMES = new Set([
  '$recycle.bin',
  'system volume information',
  'thumbs.db',
  'desktop.ini',
  '.ds_store',
  '@eadir',
  'found.000',
]);

/** True if a directory entry is a dotfile or known OS junk. Case-insensitive. */
export function isHidden(name: string): boolean {
  if (name.startsWith('.')) return true;
  return SYSTEM_NAMES.has(name.toLowerCase());
}
