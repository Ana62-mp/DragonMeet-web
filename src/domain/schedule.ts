import type { Entry } from '../types';
import { CLASS_BUILDINGS } from '../data/campus.ts';
import { DAY_END_MIN, DAY_START_MIN, isValidRange, overlaps, toMinutes } from './time.ts';

export type ClassSlot = { day: number; startMin: number; endMin: number; building: string };

/** Returns a user-facing error for a class slot, or null when it can be saved. */
export function validateSlot(slot: ClassSlot, others: Pick<Entry, 'day' | 'start' | 'end'>[]): string | null {
  if (!Number.isInteger(slot.day) || slot.day < 0 || slot.day > 4) return 'Elige un día de lunes a viernes.';
  if (!isValidRange(slot.startMin, slot.endMin)) return 'Utiliza horas válidas entre 07:00 y 20:00; el inicio debe ser anterior al fin.';
  if (!(CLASS_BUILDINGS as readonly string[]).includes(slot.building)) return 'Elige un edificio académico de la lista.';
  const clash = others.some(o => o.day === slot.day && overlaps(toMinutes(o.start), toMinutes(o.end), slot.startMin, slot.endMin));
  return clash ? 'Este bloque se superpone con otra clase.' : null;
}

/** Validates each proposed slot against existing classes and against the rows before it. */
export function validateSlots(slots: ClassSlot[], existing: Entry[]): (string | null)[] {
  return slots.map((slot, i) => {
    const earlier = slots.slice(0, i).map(s => ({ day: s.day, start: s.startMin / 60, end: s.endMin / 60 }));
    return validateSlot(slot, [...existing, ...earlier]);
  });
}

/** Minutes of class and free time inside the 07:00–20:00 window for one day.
 * Overlapping classes are merged so nothing is counted twice. With `fromMin`, only the time from then on is counted.
 */
export function dayLoad(entries: Pick<Entry, 'day' | 'start' | 'end'>[], day: number, fromMin = DAY_START_MIN) {
  const windowStart = Math.min(DAY_END_MIN, Math.max(DAY_START_MIN, fromMin));
  const spans = entries
    .filter(e => e.day === day)
    .map(e => [Math.max(windowStart, toMinutes(e.start)), Math.min(DAY_END_MIN, toMinutes(e.end))] as const)
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  let classMin = 0;
  let cursor = windowStart;
  for (const [s, e] of spans) {
    const from = Math.max(s, cursor);
    if (e > from) classMin += e - from;
    cursor = Math.max(cursor, e);
  }
  return { classMin, freeMin: DAY_END_MIN - windowStart - classMin };
}

/** "3 h 30 min", "2 h", "45 min". */
export function formatDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
}
