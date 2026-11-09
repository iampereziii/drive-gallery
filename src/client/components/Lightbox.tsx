import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { CULL_TAGS, type CullTag, type ImageEntry } from '../../types';
import { isIOS, canShareFiles } from '../lib/platform';
import { shareImages } from '../lib/share';
import { TAG_META } from '../lib/cull';

interface Props {
  images: ImageEntry[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
  /** Set or clear (null) the culling tag for an image. */
  onTag: (image: ImageEntry, tag: CullTag | null) => void;
}

/** How long the chosen tag flashes before the viewer advances. */
const ADVANCE_MS = 300;

// Computed once — platform capability doesn't change within a session.
const SHARE_AVAILABLE = canShareFiles();
const IS_IOS = isIOS();

/** Full-screen viewer with keyboard, button, and swipe navigation. */
export default function Lightbox({ images, index, onClose, onChange, onTag }: Props) {
  const touchStartX = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [hint, setHint] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [flash, setFlash] = useState<CullTag | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const current = images[index];

  const prev = () => onChange((index - 1 + images.length) % images.length);
  const next = () => onChange((index + 1) % images.length);

  const cancelAdvance = () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };

  // Reset per-image state whenever the displayed image changes (paging).
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setHint(false);
    setFlash(null);
    cancelAdvance();
  }, [index, current?.path]);

  useEffect(() => cancelAdvance, []);

  /**
   * Tap a tag: tapping the active one clears it. Setting a tag flashes it, then
   * advances to the next photo (no wrap — the last photo stays put).
   */
  const applyTag = (t: CullTag) => {
    if (!current) return;
    const nextTag = current.tag === t ? null : t;
    onTag(current, nextTag);
    cancelAdvance();
    if (nextTag === null) {
      setFlash(null);
      return;
    }
    setFlash(nextTag);
    const at = index;
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null;
      setFlash(null);
      if (at < images.length - 1) onChange(at + 1);
    }, ADVANCE_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === '1') applyTag('no');
      else if (e.key === '2') applyTag('maybe');
      else if (e.key === '3') applyTag('like');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images.length, current?.tag]);

  if (!current) return null;

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) (dx > 0 ? prev : next)();
    touchStartX.current = null;
  };

  const onShare = async () => {
    setSharing(true);
    const outcome = await shareImages([{ name: current.name, fullUrl: current.fullUrl }]);
    setSharing(false);
    if (outcome === 'unsupported' || outcome === 'error') setHint(true);
  };

  const iconClass = 'h-6 w-6';
  const downloadIcon = (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
  const shareIcon = (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" />
    </svg>
  );

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-black/95"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center gap-3 px-4 py-3 text-neutral-300">
        <span className="min-w-0 flex-1 truncate text-sm">{current.name}</span>
        <span className="shrink-0 text-xs text-neutral-500">
          {index + 1} / {images.length}
        </span>

        {SHARE_AVAILABLE ? (
          <button
            type="button"
            onClick={onShare}
            disabled={sharing}
            className="shrink-0 rounded p-1 text-neutral-300 hover:text-white disabled:opacity-50"
            aria-label="Save image"
            title="Save to Photos"
          >
            {shareIcon}
          </button>
        ) : IS_IOS ? (
          <button
            type="button"
            onClick={() => setHint((h) => !h)}
            className="shrink-0 rounded p-1 text-neutral-300 hover:text-white"
            aria-label="How to save to Photos"
            title="Save to Photos"
          >
            {downloadIcon}
          </button>
        ) : (
          <a
            href={`${current.fullUrl}&download=1`}
            download={current.name}
            className="shrink-0 rounded p-1 text-neutral-300 hover:text-white"
            aria-label="Download image"
            title="Download"
          >
            {downloadIcon}
          </a>
        )}

        <button type="button" onClick={onClose} className="shrink-0 rounded p-1 text-2xl leading-none hover:text-white" aria-label="Close">
          ×
        </button>
      </div>

      {hint && (
        <div className="mx-4 mb-1 rounded-md bg-neutral-800/90 px-3 py-2 text-center text-xs text-neutral-200">
          Press and hold the photo, then tap <span className="font-semibold">Add to Photos</span> to save it to your camera roll.
        </div>
      )}

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {!loaded && !errored && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-label="Loading">
            <svg className="h-10 w-10 animate-spin text-neutral-400" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}

        {errored ? (
          <p className="px-6 text-center text-sm text-neutral-400">Couldn’t load this image.</p>
        ) : (
          <img
            key={current.path}
            src={current.fullUrl}
            alt={current.name}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={`max-h-full max-w-full object-contain transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-2xl text-white hover:bg-black/70"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-2xl text-white hover:bg-black/70"
            >
              ›
            </button>
          </>
        )}

        {flash && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-live="polite">
            <span className={`rounded-full px-6 py-3 text-2xl font-semibold shadow-lg ${TAG_META[flash].active}`}>
              {TAG_META[flash].symbol} {TAG_META[flash].label}
            </span>
          </div>
        )}
      </div>

      {/* Culling bar — thumb zone, three large targets. Tap the active tag again to clear it. */}
      <div
        className="grid grid-cols-3 gap-2 px-3 pt-2"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {CULL_TAGS.map((t) => {
          const meta = TAG_META[t];
          const active = current.tag === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => applyTag(t)}
              aria-pressed={active}
              className={`flex h-12 items-center justify-center gap-2 rounded-xl text-base font-semibold transition ${
                active ? meta.active : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
              }`}
            >
              <span aria-hidden>{meta.symbol}</span>
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
