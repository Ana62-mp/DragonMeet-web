import type { Entry } from '../store';
import { fromMinutes, toMinutes } from '../domain/time.ts';

/** Row shape of public.schedule_entries (minutes since midnight). */
export type ScheduleRow = {
  id: string;
  student_id: string;
  title: string;
  code: string;
  day: number;
  start_min: number;
  end_min: number;
  building: string;
  room: string;
};

export const entryToRow = (e: Entry): ScheduleRow => ({
  id: e.id, student_id: e.user, title: e.title, code: e.code, day: e.day,
  start_min: toMinutes(e.start), end_min: toMinutes(e.end), building: e.building, room: e.room,
});

export const rowToEntry = (r: ScheduleRow): Entry => ({
  id: r.id, user: r.student_id, title: r.title, code: r.code, day: r.day,
  start: fromMinutes(r.start_min), end: fromMinutes(r.end_min), building: r.building, room: r.room,
});
