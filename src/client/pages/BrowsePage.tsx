import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { CullSummary, CullTag, DirListing, ImageEntry } from '../../types';
import { fetchCullSummary, fetchListing, fetchTagged, pathFromRoute, routeForPath, setCull, setLikeGoal } from '../lib/api';
import { FILTERS, goalMet, likesLabel, likesPillClass, matchesFilter, type CullFilter } from '../lib/cull';
import LikeGoal from '../components/LikeGoal';
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

/** /likes — every Like from every folder in one grid, for trimming them down. */
export const LIKES_ROUTE = '/likes';

export default function BrowsePage() {
  const location = useLocation();
  const likesMode = location.pathname === LIKES_ROUTE;
  const relPath = likesMode ? '' : pathFromRoute(location.pathname);
  /** Changes whenever the page should reload (folder or mode). */
  const pageKey = likesMode ? LIKES_ROUTE : relPath;

  const [listing, setListing] = useState<DirListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [filter, setFilter] = useState<CullFilter>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [summary, setSummary] = useState<CullSummary | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setViewer(null);
    setFilter(likesMode ? 'like' : 'all');
    const load: Promise<DirListing> = likesMode
      ? fetchTagged('like').then((t) => ({ path: '', parent: null, folders: [], images: t.images }))
      : fetchListing(relPath);
    fetchCullSummary()
      .then((s) => active && setSummary(s))
      .catch(() => undefined); // count is a nice-to-have; the page still works without it
    load
      .then((d) => active && setListing(d))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

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

/** Move one image's contribution in the drive-wide totals from one tag to another. */
  const shiftSummary = (from: CullTag | undefined, to: CullTag | undefined) =>
    setSummary((s) => {
      if (!s) return s;
      const next = { ...s };
      if (from) next[from] -= 1;
      if (to) next[to] += 1;
      return next;
    });

  /** Optimistic: show the tag (and count) immediately; the host's totals win when it replies. */
  const onTag = (img: ImageEntry, tag: CullTag | null) => {
    const previous = img.tag;
    patchTag(img.path, tag ?? undefined);
    shiftSummary(previous, tag ?? undefined);
    setCull(img.path, tag)
      .then((r) => setSummary(r.summary))
      .catch((e: Error) => {
        patchTag(img.path, previous);
        shiftSummary(tag ?? undefined, previous);
        showToast(`Couldn’t save tag: ${e.message}`);
      });
  };

  return (
    <div className="mx-auto max-w-5xl px-3 py-4">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold tracking-tight">{likesMode ? 'All Likes' : 'Drive Gallery'}</h1>
          {summary && !likesMode && (
            <Link
              to={LIKES_ROUTE}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1 hover:brightness-125 ${likesPillClass(summary.like, summary.goal)}`}
            >
              {likesLabel(summary.like, summary.goal)}
              {goalMet(summary.like, summary.goal) ? ' ✓' : summary.goal === undefined ? ' liked' : ''} ›
            </Link>
          )}
        </div>
        {likesMode ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-neutral-400">
            <Link to={routeForPath('')} className="hover:text-neutral-100">‹ Back to folders</Link>
            {summary && (
              <LikeGoal
                like={summary.like}
                goal={summary.goal}
                onSave={async (goal) => setSummary(await setLikeGoal(goal))}
              />
            )}
          </div>
        ) : (
          <Breadcrumb relPath={relPath} />
        )}
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

      {!loading && !error && listing && likesMode && images.length === 0 && (
        <p className="mt-12 text-center text-neutral-500">No Likes yet — tag photos ♥ Like in the viewer.</p>
      )}

      {!loading && !error && listing && !(likesMode && images.length === 0) && (
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
          likeCount={summary?.like}
          likeGoal={summary?.goal}
          showPath={likesMode}
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
