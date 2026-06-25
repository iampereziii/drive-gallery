import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { DirListing } from '../../types';
import { fetchListing, pathFromRoute } from '../lib/api';
import Breadcrumb from '../components/Breadcrumb';
import FolderGrid from '../components/FolderGrid';
import Lightbox from '../components/Lightbox';

export default function BrowsePage() {
  const location = useLocation();
  const relPath = pathFromRoute(location.pathname);

  const [listing, setListing] = useState<DirListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setLightboxIndex(null);
    fetchListing(relPath)
      .then((d) => active && setListing(d))
      .catch((e: Error) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [relPath]);

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

      {!loading && !error && listing && (
        <FolderGrid listing={listing} onOpenImage={setLightboxIndex} />
      )}

      {listing && lightboxIndex !== null && (
        <Lightbox
          images={listing.images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  );
}
