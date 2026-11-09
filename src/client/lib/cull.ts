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

/** "♥ 412" or, with a goal, "♥ 412 / 300". */
export function likesLabel(like: number, goal?: number): string {
  return goal === undefined ? `♥ ${like}` : `♥ ${like} / ${goal}`;
}

/** True once the Like count is trimmed down to (or under) the goal. */
export function goalMet(like: number, goal?: number): boolean {
  return goal !== undefined && like <= goal;
}

/** Pill colours: emerald normally / when the goal is met, amber while still over it. */
export function likesPillClass(like: number, goal?: number): string {
  return goal !== undefined && !goalMet(like, goal)
    ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
    : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30';
}
