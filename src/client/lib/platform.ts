/** True on iPhone/iPad (incl. iPadOS, which masquerades as desktop Safari). */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

/**
 * True only when the browser can share *files* via the Web Share API. This is
 * the primary signal for the one-tap "Save to Photos" path — it requires a
 * secure context (HTTPS), so over plain-HTTP LAN it correctly returns false and
 * callers fall back to the long-press guidance.
 */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!('share' in navigator) || !('canShare' in navigator)) return false;
  try {
    const probe = new File([new Uint8Array()], 'probe.jpg', { type: 'image/jpeg' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}
