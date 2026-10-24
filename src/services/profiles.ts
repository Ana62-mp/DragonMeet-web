import { supabase } from '../lib/supabase';
import type { Me, Person, ScheduleDisclosure } from '../types';
import { rpc, unwrap } from './db';

type PersonRow = { id: string; full_name: string; first_name: string; career: string; semester: number; avatar_color: string; banner_code: string };
type MeRow = PersonRow & {
  email: string; share_schedule_global: boolean; share_location_global: boolean; schedule_disclosure: ScheduleDisclosure;
  on_campus: boolean; current_zone: string | null; current_zone_updated_at: string | null;
};

const toPerson = (r: PersonRow): Person => ({
  id: r.id, fullName: r.full_name, firstName: r.first_name, career: r.career, semester: r.semester, color: r.avatar_color, bannerCode: r.banner_code,
});

const toMe = (r: MeRow): Me => ({
  ...toPerson(r), email: r.email, shareSchedule: r.share_schedule_global, shareLocation: r.share_location_global,
  disclosure: r.schedule_disclosure, onCampus: r.on_campus, zone: r.current_zone,
  zoneUpdatedAt: r.current_zone_updated_at ? Date.parse(r.current_zone_updated_at) : null,
});

export async function fetchMe(userId: string): Promise<Me> {
  return toMe(unwrap(await supabase.from('profiles').select('*').eq('id', userId).single<MeRow>()));
}

/** Public fields of everyone I share a friendship row with. */
export async function fetchConnections(): Promise<Person[]> {
  return (await rpc<PersonRow[]>('list_connections')).map(toPerson);
}

export async function searchUsers(query: string): Promise<Person[]> {
  return (await rpc<PersonRow[]>('search_users', { query })).map(toPerson);
}

export type ProfilePatch = Partial<{
  fullName: string; firstName: string; career: string; semester: number; color: string;
  shareSchedule: boolean; shareLocation: boolean; disclosure: ScheduleDisclosure;
  onCampus: boolean; zone: string | null; zoneUpdatedAt: string;
}>;

const COLUMNS: Record<keyof ProfilePatch, string> = {
  fullName: 'full_name', firstName: 'first_name', career: 'career', semester: 'semester', color: 'avatar_color',
  shareSchedule: 'share_schedule_global', shareLocation: 'share_location_global', disclosure: 'schedule_disclosure',
  onCampus: 'on_campus', zone: 'current_zone', zoneUpdatedAt: 'current_zone_updated_at',
};

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const row = Object.fromEntries(Object.entries(patch).map(([key, value]) => [COLUMNS[key as keyof ProfilePatch], value]));
  unwrap(await supabase.from('profiles').update(row).eq('id', userId).select('id').single());
}
