import { useEffect, useState } from 'react';

/** Strip thumbnail size the owner picks in the viewer. L is the default judging size. */
export type ThumbSize = 'S' | 'M' | 'L';

export const THUMB_SIZES: readonly ThumbSize[] = ['S', 'M', 'L'];

export const THUMB_SIZE_LABEL: Record<ThumbSize, string> = { S: 'Small', M: 'Medium', L: 'Large' };

const SIZE_KEY = 'dg.viewer.thumbSize';

export function readThumbSize(): ThumbSize {
  try {
    const v = window.localStorage.getItem(SIZE_KEY);
    return v === 'S' || v === 'M' || v === 'L' ? v : 'L';
  } catch {
    return 'L';
  }
}

export function writeThumbSize(size: ThumbSize): void {
  try {
    window.localStorage.setItem(SIZE_KEY, size);
  } catch {
    // blocked storage — the choice still applies for this visit
  }
}

/**
 * Box every strip thumbnail is fitted into (whole photo, letterboxed), in CSS px.
 * Boxes are 4:3 so landscape shots fill them and portraits show uncropped.
 *
 * - Vertical (landscape / laptop): L is a ~320px column for judging on a laptop,
 *   capped at 30% of the window so a sideways phone keeps most of the width.
 * - Horizontal (upright phone): rows stay short enough that the photo keeps
 *   well over half the screen height.
 */
export function thumbBox(size: ThumbSize, vertical: boolean, viewportWidth: number): { w: number; h: number } {
  if (vertical) {
    const column = { S: 72, M: Math.min(200, viewportWidth * 0.24), L: Math.min(320, viewportWidth * 0.3) }[size];
    const w = Math.round(column - 16); // column padding
    return { w, h: size === 'S' ? w : Math.round((w * 3) / 4) };
  }
  const h = { S: 56, M: 88, L: 120 }[size];
  return { w: size === 'S' ? h : Math.round((h * 4) / 3), h };
}

/**
 * Thumbnail URL sharp enough for a box `boxW` CSS px wide on this screen.
 * Small needs reuse the grid's default thumbnail (shared cache); larger ones
 * snap to a few fixed widths so the host cache doesn't fill with near-duplicates.
 */
export function thumbUrlFor(baseThumbUrl: string, boxW: number, dpr: number): string {
  const needed = boxW * Math.min(dpr || 1, 3);
  if (needed <= 400) return baseThumbUrl;
  const w = [640, 800, 1200].find((step) => step >= needed) ?? 1200;
  return `${baseThumbUrl}&w=${w}`;
}

/** Live window size (for the L column cap and the box maths). */
export function useViewportWidth(): number {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}
