import { useEffect, useRef, type TouchEvent } from 'react';
import type { ImageEntry } from '../../types';
import { TAG_META } from '../lib/cull';

interface Props {
  images: ImageEntry[];
  index: number;
  onSelect: (index: number) => void;
  /** Column down the side (wide/landscape) instead of a row (upright phone). */
  vertical: boolean;
}

/**
 * How many thumbnails to render on each side of the current photo. Real folders
 * reach ~5,000 photos (RAW\TWO), so the strip renders a sliding window instead
 * of every thumbnail — no virtualization library needed.
 */
const WINDOW = 20;

// Touches inside the strip scroll the strip; they must not reach the viewer's
// left/right page-swipe handlers on the overlay.
const stop = (e: TouchEvent) => e.stopPropagation();

/** Thumbnails of the photos being judged, current one highlighted and centred. */
export default function ThumbStrip({ images, index, onSelect, vertical }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const currentEl = useRef<HTMLButtonElement>(null);

  const start = Math.max(0, index - WINDOW);
  const end = Math.min(images.length, index + WINDOW + 1);
  const visible = images.slice(start, end);

  // Keep the current thumbnail centred as you swipe, tag (auto-advance) or tap.
  // scrollTo on the strip itself (not scrollIntoView) so nothing else scrolls.
  useEffect(() => {
    const box = scroller.current;
    const el = currentEl.current;
    if (!box || !el) return;
    if (vertical) {
      box.scrollTo({ top: el.offsetTop - (box.clientHeight - el.offsetHeight) / 2, behavior: 'smooth' });
    } else {
      box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
    }
  }, [index, vertical, images.length]);

  const more = (n: number) =>
    n > 0 && (
      <span className="flex shrink-0 items-center justify-center px-2 text-xs text-neutral-500" aria-hidden>
        +{n.toLocaleString()}
      </span>
    );

  return (
    <div
      ref={scroller}
      onTouchStart={stop}
      onTouchEnd={stop}
      aria-label="Photo thumbnails"
      className={`relative flex shrink-0 gap-1.5 overscroll-contain ${
        vertical ? 'w-20 flex-col overflow-y-auto px-2 py-2' : 'h-[4.5rem] flex-row overflow-x-auto px-3 py-2'
      }`}
      style={{ scrollbarWidth: 'none' }}
    >
      {more(start)}
      {visible.map((img, i) => {
        const at = start + i;
        const isCurrent = at === index;
        return (
          <button
            key={img.path}
            ref={isCurrent ? currentEl : undefined}
            type="button"
            onClick={() => onSelect(at)}
            aria-label={`Photo ${at + 1}: ${img.name}`}
            aria-current={isCurrent}
            className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-neutral-900 transition ${
              isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-80 hover:opacity-100'
            }`}
          >
            <img
              src={img.thumbUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover ${img.tag === 'no' && !isCurrent ? 'opacity-40' : ''}`}
            />
            {img.tag && (
              <span
                className={`absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold leading-none ${TAG_META[img.tag].badge}`}
                aria-label={TAG_META[img.tag].label}
              >
                {TAG_META[img.tag].symbol}
              </span>
            )}
          </button>
        );
      })}
      {more(images.length - end)}
    </div>
  );
}
