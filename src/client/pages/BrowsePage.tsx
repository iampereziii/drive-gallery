import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { CullTag, DirListing, ImageEntry } from '../../types';
import { fetchListing, pathFromRoute, setCull } from '../lib/api';
import { FILTERS, matchesFilter, type CullFilter } from '../lib/cull';
import Breadcrumb from '../components/Breadcrumb';
import FolderGrid from '../components/FolderGrid';
import Lightbox from '../components/Lightbox';

/**
 * The viewer pages through a snapshot of paths taken when it opens, so tagging
 * an image out of the active filter doesn't yank it away mid-flash. The filter
 * re-applies when the viewer closes.
 */
interface ViewerState {
  paths: string[];
  index: number;
}

export default function BrowsePage() {
  const location = useLocation();
  const relPath = pathFromRoute(location.pathname);

  const [listing, setListing] = useState<DirListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [filter, setFilter] = useState<CullFilter>('all');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setViewer(null);
    setFilter('all');
    fetchListing(relPath)
      .then((d) => active && setListing(d))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [relPath]);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  };

  const images = listing?.images ?? [];
  const filtered = useMemo(() => images.filter((img) => matchesFilter(img, filter)), [images, filter]);
  const counts = useMemo(() => {
    const c: Record<CullFilter, number> = { all: images.length, untagged: 0, like: 0, maybe: 0, no: 0 };
    for (const img of images) c[img.tag ?? 'untagged'] += 1;
    return c;
  }, [images]);

  const viewerImages = useMemo(() => {
    if (!viewer) return [];
    const byPath = new Map(images.map((img) => [img.path, img]));
    return viewer.paths.map((p) => byPath.get(p)).filter((img): img is ImageEntry => img !== undefined);
  }, [viewer, images]);

  /** Update one image's tag in local state (no server call). */
  const patchTag = (path: string, tag: CullTag | undefined) => {
    setListing((prev) =>
      prev
        ? {
            ...prev,
            images: prev.images.map((img) => {
              if (img.path !== path) return img;
              const { tag: _old, ...rest } = img;
              return tag ? { ...rest, tag } : rest;
            }),
          }
        : prev,
    );
  };

  /** Optimistic: show the tag immediately, roll back if the host couldn't save it. */
  const onTag = (img: ImageEntry, tag: CullTag | null) => {
    const previous = img.tag;
    patchTag(img.path, tag ?? undefined);
    setCull(img.path, tag).catch((e: Error) => {
      patchTag(img.path, previous);
      showToast(`Couldn’t save tag: ${e.message}`);
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-3 py-4">
      <header className="space-y-2">
        <h1 className="text-lg font-semibold tracking-tight">Drive Gallery</h1>
        <Breadcrumb relPath={relPath} />
      </header>

      {loading && <p className="mt-12 text-center text-neutral-500">Loading…</p>}

      {error && (
        <p className="mt-12 rounded-lg bg-red-950/60 px-4 py-3 text-center text-red-200 ring-1 ring-red-900">
          {error}
        </p>
      )}

      {!loading && !error && listing && images.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filter photos">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-2.5 py-1.5 text-sm transition ${
                filter === f.value
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'bg-neutral-900 text-neutral-300 ring-1 ring-neutral-800 hover:bg-neutral-800'
              }`}
            >
              {f.label} <span className="opacity-60">{counts[f.value]}</span>
            </button>
          ))}
        </div>
      )}

      {!loading && !error && listing && (
        <FolderGrid
          listing={listing}
          images={filtered}
          onOpenImage={(index) => setViewer({ paths: filtered.map((img) => img.path), index })}
        />
      )}

      {viewer && viewerImages.length > 0 && (
        <Lightbox
          images={viewerImages}
          index={Math.min(viewer.index, viewerImages.length - 1)}
          onClose={() => setViewer(null)}
          onChange={(index) => setViewer((v) => (v ? { ...v, index } : v))}
          onTag={onTag}
        />
      )}

      {toast && (
        <div className="fixed inset-x-4 top-4 z-50 rounded-lg bg-red-900 px-4 py-3 text-center text-sm text-red-50 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
