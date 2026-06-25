export type ShareOutcome = 'shared' | 'cancelled' | 'unsupported' | 'error';

/**
 * Share image originals via the native share sheet, where the user can pick
 * "Save Image" → Photos (iOS) or the platform equivalent. Files are fetched
 * first so the share carries real bytes. Returns a coarse outcome so the caller
 * can fall back to long-press guidance when sharing isn't possible.
 */
export async function shareImages(items: { name: string; fullUrl: string }[]): Promise<ShareOutcome> {
  if (!('share' in navigator)) return 'unsupported';
  try {
    const files = await Promise.all(
      items.map(async (it) => {
        const res = await fetch(it.fullUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        return new File([blob], it.name, { type: blob.type || 'image/jpeg' });
      }),
    );

    if ('canShare' in navigator && !navigator.canShare({ files })) return 'unsupported';
    await navigator.share({ files });
    return 'shared';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    return 'error';
  }
}
