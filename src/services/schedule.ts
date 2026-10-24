import { supabase } from '../lib/supabase';
import { fromPgTime, toPgTime } from '../domain/time.ts';
import type { VisibleEntry } from '../domain/visibility.ts';
import type { Entry } from '../types';
import { rpc, unwrap } from './db';

type BlockRow = {
  id: string; user_id: string; course_code: string; course_name: string; day_of_week: number;
  start_time: string; end_time: string; building: string; room: string;
};
type VisibleRow = {
  id: string; owner_id: string; day_of_week: number; start_time: string; end_time: string;
  busy_only: boolean; course_name: string | null; building: string | null;
};

const toEntry = (r: BlockRow): Entry => ({
  id: r.id, user: r.user_id, title: r.course_name, code: r.course_code, day: r.day_of_week - 1,
  start: fromPgTime(r.start_time), end: fromPgTime(r.end_time), building: r.building, room: r.room,
});

const toRow = (e: Entry) => ({
  user_id: e.user, course_code: e.code, course_name: e.title, day_of_week: e.day + 1,
  start_time: toPgTime(e.start), end_time: toPgTime(e.end), building: e.building, room: e.room,
});

export async function fetchOwnSchedule(userId: string): Promise<Entry[]> {
  return unwrap(await supabase.from('schedule_blocks').select('*').eq('user_id', userId).returns<BlockRow[]>()).map(toEntry);
}

/** Friends' classes, already masked by the database according to permissions and disclosure mode. */
export async function fetchVisibleSchedules(): Promise<VisibleEntry[]> {
  return (await rpc<VisibleRow[]>('get_visible_schedules')).map(r => ({
    id: r.id, user: r.owner_id, day: r.day_of_week - 1, start: fromPgTime(r.start_time), end: fromPgTime(r.end_time),
    busyOnly: r.busy_only, title: r.course_name ?? undefined, building: r.building ?? undefined,
  }));
}

/** Inserts a new class, or updates it when `existing` is true. */
export async function saveBlock(entry: Entry, existing: boolean): Promise<void> {
  unwrap(existing
    ? await supabase.from('schedule_blocks').update(toRow(entry)).eq('id', entry.id).select('id')
    : await supabase.from('schedule_blocks').insert(toRow(entry)).select('id'));
}

export async function saveBlocks(entries: Entry[]): Promise<void> {
  unwrap(await supabase.from('schedule_blocks').insert(entries.map(toRow)).select('id'));
}

export async function deleteBlock(id: string): Promise<void> {
  unwrap(await supabase.from('schedule_blocks').delete().eq('id', id).select('id'));
}
