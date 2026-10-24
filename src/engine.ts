import type { Entry } from './types';
import { DAY_END_MIN, DAY_START_MIN, fromMinutes, overlaps, toMinutes } from './domain/time.ts';

export type Availability = {
  day: number;
  start: number;
  end: number;
  free: string[];
  status: 'all' | 'partial' | 'none';
};

/** Produces continuous blocks cut at the exact minute of every class boundary, 07:00–20:00 on weekdays.
 * Time intervals are half-open so consecutive classes do not conflict.
 * The caller must authorize each participant before invoking this function.
 */
export function calculate(entries: Pick<Entry, 'user' | 'day' | 'start' | 'end'>[], participants: string[]): Availability[] {
  if (participants.length < 1 || participants.length > 5) return [];
  const blocks: Availability[] = [];
  for (let day = 0; day < 5; day++) {
    const classes = participants.map(id => ({
      id,
      spans: entries.filter(e => e.user === id && e.day === day).map(e => [toMinutes(e.start), toMinutes(e.end)] as const),
    }));
    const cuts = new Set([DAY_START_MIN, DAY_END_MIN]);
    for (const { spans } of classes)
      for (const bound of spans.flat())
        if (bound > DAY_START_MIN && bound < DAY_END_MIN) cuts.add(bound);
    const sorted = [...cuts].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      const [from, to] = [sorted[i], sorted[i + 1]];
      const free = classes.filter(c => !c.spans.some(([s, e]) => overlaps(s, e, from, to))).map(c => c.id);
      const status: Availability['status'] = free.length === participants.length ? 'all' : free.length >= 2 ? 'partial' : 'none';
      const previous = blocks[blocks.length - 1];
      if (previous && previous.day === day && previous.end === fromMinutes(from) && previous.status === status && previous.free.join('|') === free.join('|')) {
        previous.end = fromMinutes(to);
      } else {
        blocks.push({ day, start: fromMinutes(from), end: fromMinutes(to), free, status });
      }
    }
  }
  return blocks;
}
