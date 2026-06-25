import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DirListing, ImageEntry } from '../../types';
import { routeForPath } from '../lib/api';

interface Props {
  listing: DirListing;
  onOpenImage: (index: number) => void;
}

/** A single grid thumbnail: neutral placeholder until it decodes, then fades in. */
function Thumb({ img, onOpen }: { img: ImageEntry; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`block aspect-square w-full overflow-hidden rounded bg-neutral-900 ${loaded ? '' : 'animate-pulse'}`}
    >
      <img
        src={img.thumbUrl}
        alt={img.name}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 hover:opacity-90 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </button>
  );
}

export default function FolderGrid({ listing, onOpenImage }: Props) {
  const { folders, images } = listing;

  if (folders.length === 0 && images.length === 0) {
    return <p className="mt-12 text-center text-neutral-500">This folder is empty.</p>;
  }

  return (
    <div className="mt-4 space-y-6">
      {folders.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {folders.map((f) => (
            <li key={f.path}>
              <Link
                to={routeForPath(f.path)}
                className="flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-4 text-neutral-100 ring-1 ring-neutral-800 transition hover:bg-neutral-800"
              >
                <svg className="h-6 w-6 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M10 4H2v16h20V6H12l-2-2z" />
                </svg>
                <span className="truncate text-sm font-medium">{f.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:grid-cols-6">
          {images.map((img, i) => (
            <li key={img.path}>
              <Thumb img={img} onOpen={() => onOpenImage(i)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
