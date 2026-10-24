import type { Entry } from '../types';
import { overlaps, toMinutes } from './time.ts';

/** A friend's class exactly as the server returns it: private fields are already removed. */
export type VisibleEntry = Pick<Entry, 'id' | 'user' | 'day' | 'start' | 'end'> & {
  busyOnly: boolean;
  title?: string;
  building?: string;
};

export const BUSY_LABEL = 'Ocupado';

export const hasClassAt = (entries: Pick<Entry, 'user' | 'day' | 'start' | 'end'>[], user: string, day: number, minute: number) =>
  entries.some(e => e.user === user && e.day === day && overlaps(toMinutes(e.start), toMinutes(e.end), minute, minute + 1));
