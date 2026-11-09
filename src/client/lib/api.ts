import type { CullTag, CullUpdate, DirListing, HealthInfo } from '../../types';

async function getData<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }
  return body.data as T;
}

/** Build the /api/browse URL for a relative folder path ("" = root). */
export function browseUrl(relPath: string): string {
  return relPath ? `/api/browse?path=${encodeURIComponent(relPath)}` : '/api/browse';
}

export function fetchListing(relPath: string): Promise<DirListing> {
  return getData<DirListing>(browseUrl(relPath));
}

/** Set (or clear, with null) one image's culling tag. Saved on the host, not the phone. */
export async function setCull(path: string, tag: CullTag | null): Promise<CullUpdate> {
  const body: CullUpdate = { path, tag };
  const res = await fetch('/api/culls', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  return json.data as CullUpdate;
}

export function fetchHealth(): Promise<HealthInfo> {
  return getData<HealthInfo>('/api/health');
}

/**
 * Pick a random image URL for the landing hero. Tries the root first; if the
 * root holds only folders, peeks into a few random subfolders (one level) so
 * libraries that keep photos in subfolders still get a cover. No backend change.
 * Returns null if nothing suitable is found (landing falls back to a tint).
 */
export async function fetchCoverImage(): Promise<string | null> {
  const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  try {
    const root = await fetchListing('');
    if (root.images.length > 0) return pickRandom(root.images).fullUrl;
    const folders = [...root.folders];
    for (let i = 0; i < 3 && folders.length > 0; i++) {
      const [folder] = folders.splice(Math.floor(Math.random() * folders.length), 1);
      const sub = await fetchListing(folder.path);
      if (sub.images.length > 0) return pickRandom(sub.images).fullUrl;
    }
  } catch {
    // fall through — caller shows a fallback
  }
  return null;
}

/** Encode a posix relative path into a client-side route under /b/. */
export function routeForPath(relPath: string): string {
  if (!relPath) return '/b';
  return '/b/' + relPath.split('/').map(encodeURIComponent).join('/');
}

/** Inverse of routeForPath: read the relative path back out of a /b/ route. */
export function pathFromRoute(pathname: string): string {
  const raw = pathname.startsWith('/b/') ? pathname.slice(3) : '';
  return raw
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)
    .join('/');
}
