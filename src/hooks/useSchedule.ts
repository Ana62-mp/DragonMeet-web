import { useMemo } from 'react';
import type { VisibleEntry } from '../domain/visibility.ts';
import { useApp } from '../store';
import type { Entry } from '../types';

/** Own classes (full detail) and friends' classes (already masked by the server). */
export function useSchedule() {
  const entries = useApp(s => s.entries);
  const friendEntries = useApp(s => s.friendEntries);
  const saveEntry = useApp(s => s.saveEntry);
  const importEntries = useApp(s => s.importEntries);
  const removeEntry = useApp(s => s.removeEntry);

  return useMemo(() => ({
    entries,
    friendEntries,
    /** Own + visible friend classes, ready for the Match engine (it only needs user/day/start/end). */
    allBusy: [...entries, ...friendEntries] as Pick<Entry, 'user' | 'day' | 'start' | 'end'>[],
    visibleOf: (ownerId: string): VisibleEntry[] => friendEntries.filter(e => e.user === ownerId),
    saveEntry,
    importEntries,
    removeEntry,
  }), [entries, friendEntries, saveEntry, importEntries, removeEntry]);
}
