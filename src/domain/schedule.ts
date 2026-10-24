import type { Entry } from '../types';
import { CLASS_BUILDINGS } from '../data/campus.ts';
import { isValidRange, overlaps, toMinutes } from './time.ts';

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
