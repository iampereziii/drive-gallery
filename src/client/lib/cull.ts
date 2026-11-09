import type { CullTag, ImageEntry } from '../../types';

/** Folder-view filter. 'untagged' = still to review. */
export type CullFilter = 'all' | CullTag | 'untagged';

export const FILTERS: { value: CullFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'untagged', label: 'To review' },
  { value: 'like', label: 'Liked' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'No' },
];

export function matchesFilter(img: ImageEntry, filter: CullFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'untagged') return !img.tag;
  return img.tag === filter;
}

/** Display metadata per tag — shared by the viewer bar, the flash, and grid badges. */
export const TAG_META: Record<CullTag, { label: string; symbol: string; active: string; badge: string }> = {
  no: { label: 'No', symbol: '✕', active: 'bg-red-600 text-white', badge: 'bg-red-600' },
  maybe: { label: 'Maybe', symbol: '?', active: 'bg-amber-500 text-black', badge: 'bg-amber-500 text-black' },
  like: { label: 'Like', symbol: '♥', active: 'bg-emerald-500 text-black', badge: 'bg-emerald-500 text-black' },
};
