import type { Entry } from './store';

export type Availability = {
  day: number;
  start: number;
  end: number;
  free: string[];
  status: 'all' | 'partial' | 'none';
};

/** Produces continuous blocks from quarter-hour buckets, 07:00–20:00 on weekdays.
 * Time intervals are half-open so consecutive classes do not conflict.
 * The caller must authorize each participant before invoking this function.
 */
export function calculate(entries: Entry[], participants: string[]): Availability[] {
  if (participants.length < 1 || participants.length > 5) return [];
  const blocks: Availability[] = [];
  for (let day = 0; day < 5; day++) {
    const classesByPerson = new Map(participants.map(id => [id, entries.filter(e => e.user === id && e.day === day)]));
    for (let slot = 0; slot < 52; slot++) {
      const start = 7 + slot / 4;
      const end = start + 0.25;
      const free = participants.filter(id => !classesByPerson.get(id)!.some(e => e.start < end && e.end > start));
      const status: Availability['status'] = free.length === participants.length ? 'all' : free.length >= 2 ? 'partial' : 'none';
      const previous = blocks[blocks.length - 1];
      if (previous && previous.day === day && previous.end === start && previous.status === status && previous.free.join('|') === free.join('|')) {
        previous.end = end;
      } else {
        blocks.push({ day, start, end, free, status });
      }
    }
  }
  return blocks;
}
