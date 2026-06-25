import { useEffect, useState } from 'react';
import { fetchHealth } from '../lib/api';

/** Polls /api/health and shows a banner when the drive is disconnected. */
export default function DriveStatus() {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    let active = true;
    const check = () =>
      fetchHealth()
        .then((h) => active && setConnected(h.driveConnected))
        .catch(() => active && setConnected(false));
    check();
    const id = setInterval(check, 10_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (connected) return null;

  return (
    <div className="sticky top-0 z-30 bg-amber-600 px-4 py-2 text-center text-sm font-medium text-amber-950">
      Drive disconnected — reconnect the external drive to keep browsing.
    </div>
  );
}
