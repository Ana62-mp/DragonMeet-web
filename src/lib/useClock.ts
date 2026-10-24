import { useEffect, useState } from 'react';
import { ecuadorNow } from '../domain/time.ts';
import { useApp } from '../store';

const REFRESH_MS = 30_000;

/** Ecuador day/minute, refreshed periodically. A demo simulation overrides only day and minute;
 * `ts` is always the real timestamp (used for presence expiry).
 */
export function useClock() {
  const simulated = useApp(s => s.simulatedClock);
  const [ts, setTs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTs(Date.now()), REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  const clock = simulated ?? ecuadorNow(new Date(ts));
  return { ...clock, ts, simulated: simulated !== null };
}
