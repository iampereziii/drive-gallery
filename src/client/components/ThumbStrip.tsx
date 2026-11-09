import { useEffect, useRef, useState, type TouchEvent } from 'react';
import type { ImageEntry } from '../../types';
import { TAG_META } from '../lib/cull';
import { thumbBox, thumbUrlFor, useViewportWidth, type ThumbSize } from '../lib/thumbSize';

interface Props {
  images: ImageEntry[];
  index: number;
  onSelect: (index: number) => void;
  /** Column down the side (wide/landscape) instead of a row (upright phone). */
  vertical: boolean;
  /** S · M · L — L is the judging size (~320px column on a laptop). */
  size: ThumbSize;
}

/**
 * How many thumbnails to render on each side of the current photo. Real folders
 * reach ~5,000 photos (RAW\TWO), so the strip renders a sliding window instead
 * of every thumbnail — no virtualization library needed.
 */
const WINDOW = 20;

/** How many upcoming thumbnails to prepare in the background. */
const PREPARE_AHEAD = 20;
/** Wait before preparing, so fast paging doesn't queue work for photos you skip past. */
const PREPARE_DELAY_MS = 400;

/** URLs already requested this session — each is fetched once, then served from cache. */
const prepared = new Set<string>();

// Touches inside the strip scroll the strip; they must not reach the viewer's
// left/right page-swipe handlers on the overlay.
const stop = (e: TouchEvent) => e.stopPropagation();

/** One strip thumbnail: whole photo fitted into the box, badge pinned to the photo itself. */
function StripThumb({
  img,
  url,
  box,
  isCurrent,
  label,
  onClick,
  buttonRef,
}: {
  img: ImageEntry;
  url: string;
  box: { w: number; h: number };
  isCurrent: boolean;
  label: string;
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={isCurrent}
      style={{ width: box.w, height: box.h }}
      className={`flex shrink-0 items-center justify-center rounded-md bg-neutral-900 transition ${
        isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-80 hover:opacity-100'
      } ${loaded ? '' : 'animate-pulse'}`}
    >
      {/* Wrapper shrinks to the photo's real shape, so the badge sits on the photo, not the black bars. */}
      <span className="relative inline-block">
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{ maxWidth: box.w, maxHeight: box.h }}
          className={`block rounded-sm object-contain transition-opacity ${
            !loaded ? 'opacity-0' : img.tag === 'no' && !isCurrent ? 'opacity-40' : 'opacity-100'
          }`}
        />
        {img.tag && (
          <span
            className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold leading-none shadow ${TAG_META[img.tag].badge}`}
            aria-label={TAG_META[img.tag].label}
          >
            {TAG_META[img.tag].symbol}
          </span>
        )}
      </span>
    </button>
  );
}

/** Thumbnails of the photos being judged, current one highlighted and centred. */
export default function ThumbStrip({ images, index, onSelect, vertical, size }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const currentEl = useRef<HTMLButtonElement>(null);
  const viewportWidth = useViewportWidth();
  const dpr = window.devicePixelRatio || 1;
  const box = thumbBox(size, vertical, viewportWidth);
  const urlOf = (img: ImageEntry) => thumbUrlFor(img.thumbUrl, box.w, dpr);

  const start = Math.max(0, index - WINDOW);
  const end = Math.min(images.length, index + WINDOW + 1);
  const visible = images.slice(start, end);

  // Keep the current thumbnail centred as you swipe, tag (auto-advance), tap, or resize.
  // Moving between photos glides; a size/layout change jumps straight there, because
  // the old scroll offset means nothing once every box has changed size.
  // scrollTo on the strip itself (not scrollIntoView) so nothing else scrolls.
  const layoutKey = `${size}|${vertical}|${box.w}`;
  // Starts empty so opening the viewer jumps straight to the current photo too.
  const lastLayout = useRef('');
  useEffect(() => {
    const strip = scroller.current;
    const el = currentEl.current;
    if (!strip || !el) return;
    const smooth = lastLayout.current === layoutKey;
    lastLayout.current = layoutKey;
    const target = vertical
      ? { top: el.offsetTop - (strip.clientHeight - el.offsetHeight) / 2 }
      : { left: el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2 };
    strip.scrollTo({ ...target, behavior: smooth ? 'smooth' : 'auto' });
    if (!smooth) return;
    // Some browsers/webviews ignore smooth scrolling; never leave the strip behind.
    const snap = window.setTimeout(() => {
      const pos = vertical ? strip.scrollTop : strip.scrollLeft;
      const want = Math.max(0, (vertical ? target.top : target.left) ?? 0);
      const max = vertical ? strip.scrollHeight - strip.clientHeight : strip.scrollWidth - strip.clientWidth;
      if (Math.abs(pos - Math.min(want, max)) > 2) strip.scrollTo({ ...target, behavior: 'auto' });
    }, 450);
    return () => window.clearTimeout(snap);
  }, [index, vertical, images.length, layoutKey]);

  // Prepare the next photos' thumbnails at this size in the background, so a
  // folder you haven't judged at L before doesn't pop in late as you advance.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const img of images.slice(index + 1, index + 1 + PREPARE_AHEAD)) {
        const url = urlOf(img);
        if (prepared.has(url)) continue;
        prepared.add(url);
        const pre = new Image();
        pre.decoding = 'async';
        pre.src = url;
      }
    }, PREPARE_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images, box.w, dpr]);

  const more = (n: number) =>
    n > 0 && (
      <span className="flex shrink-0 items-center justify-center p-2 text-xs text-neutral-500" aria-hidden>
        +{n.toLocaleString()}
      </span>
    );

  return (
    <div
      ref={scroller}
      onTouchStart={stop}
      onTouchEnd={stop}
      aria-label="Photo thumbnails"
      className={`relative flex shrink-0 gap-2 overscroll-contain ${
        vertical ? 'flex-col items-center overflow-y-auto px-2 py-2' : 'flex-row items-center overflow-x-auto px-3 py-2'
      }`}
      style={{
        scrollbarWidth: 'none',
        ...(vertical ? { width: box.w + 16 } : { height: box.h + 16 }),
      }}
    >
      {more(start)}
      {visible.map((img, i) => {
        const at = start + i;
        const isCurrent = at === index;
        return (
          <StripThumb
            key={img.path}
            img={img}
            url={urlOf(img)}
            box={box}
            isCurrent={isCurrent}
            label={`Photo ${at + 1}: ${img.name}`}
            onClick={() => onSelect(at)}
            buttonRef={isCurrent ? currentEl : undefined}
          />
        );
      })}
      {more(images.length - end)}
    </div>
  );
}
