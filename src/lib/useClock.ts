import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { ecuadorNow } from '../domain/time.ts';

const REFRESH_MS = 30_000;

/** Demo-only override (Perfil > Preferencias). Only day and minute change; the real timestamp is untouched. */
export const useSimulatedClock = create<{ clock: { day: number; minutes: number } | null; set: (c: { day: number; minutes: number } | null) => void }>(set => ({
  clock: null,
  set: clock => set({ clock }),
}));

/** Ecuador day/minute refreshed periodically; `ts` is always the real timestamp (used for presence expiry). */
export function useClock() {
  const simulated = useSimulatedClock(s => s.clock);
  const [ts, setTs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTs(Date.now()), REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  const clock = simulated ?? ecuadorNow(new Date(ts));
  return { ...clock, ts, simulated: simulated !== null };
}
