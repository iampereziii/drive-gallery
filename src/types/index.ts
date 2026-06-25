// Shared wire types — imported by both the Express server and the React client.
// These are the only contract between the two halves; keep them in sync with the spec.

export interface FolderEntry {
  /** Display name of the folder. */
  name: string;
  /** Relative path from PHOTOS_ROOT, posix-style (forward slashes). */
  path: string;
  /** Best-effort count of images directly inside; may be omitted for speed. */
  imageCount?: number;
}

export interface ImageEntry {
  /** File name including extension. */
  name: string;
  /** Relative path from PHOTOS_ROOT, posix-style. */
  path: string;
  /** Lowercased extension without the dot (e.g. "jpg"). */
  ext: string;
  sizeBytes: number;
  /** Last-modified epoch ms — used as the thumbnail cache key. */
  mtimeMs: number;
  /** URL for the cached/generated thumbnail. */
  thumbUrl: string;
  /** URL that streams the full-resolution original. */
  fullUrl: string;
}

export interface DirListing {
  /** Relative path of this directory ("" = root). */
  path: string;
  /** Relative parent path; null at the root. */
  parent: string | null;
  folders: FolderEntry[];
  images: ImageEntry[];
}

export interface HealthInfo {
  driveConnected: boolean;
  root: string;
}

/** Every data route returns { data } on success or { error } on failure. */
export interface ApiError {
  error: { code: string; message: string };
}
