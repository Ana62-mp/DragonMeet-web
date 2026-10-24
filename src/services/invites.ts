import { supabase } from '../lib/supabase';
import type { Invite, InviteResponse } from '../types';
import { unwrap } from './db';
import { fromPgTime, toPgTime } from '../domain/time.ts';

type InviteRow = { id: string; creator_id: string; title: string; event_date: string; start_time: string; end_time: string; zone_id: string; cancelled: boolean };
type ParticipantRow = { invite_id: string; student_id: string; response: InviteResponse };

/** ISO date -> 0 = Monday ... 6 = Sunday, computed in UTC so the date string never shifts. */
const dayOf = (isoDate: string) => (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7;

export async function fetchInvites(): Promise<Invite[]> {
  const invites = unwrap(await supabase.from('meet_invites').select('*').order('event_date').returns<InviteRow[]>());
  if (!invites.length) return [];
  const participants = unwrap(await supabase.from('meet_invite_participants').select('*').in('invite_id', invites.map(i => i.id)).returns<ParticipantRow[]>());
  return invites.map(i => ({
    id: i.id, owner: i.creator_id, title: i.title, date: i.event_date, day: dayOf(i.event_date),
    start: fromPgTime(i.start_time), end: fromPgTime(i.end_time), zone: i.zone_id, cancelled: i.cancelled,
    responses: Object.fromEntries(participants.filter(p => p.invite_id === i.id).map(p => [p.student_id, p.response])),
  }));
}

export type NewInvite = Pick<Invite, 'title' | 'date' | 'start' | 'end' | 'zone'>;

export async function createInvite(owner: string, invite: NewInvite, invitees: string[]): Promise<void> {
  const created = unwrap(await supabase.from('meet_invites').insert({
    creator_id: owner, title: invite.title, event_date: invite.date, start_time: toPgTime(invite.start),
    end_time: toPgTime(invite.end), zone_id: invite.zone,
  }).select('id').single<{ id: string }>());
  if (invitees.length)
    unwrap(await supabase.from('meet_invite_participants').insert(invitees.map(student_id => ({ invite_id: created.id, student_id }))).select('invite_id'));
}

export async function respondInvite(inviteId: string, studentId: string, accept: boolean): Promise<void> {
  unwrap(await supabase.from('meet_invite_participants').update({ response: accept ? 'accepted' : 'rejected' })
    .eq('invite_id', inviteId).eq('student_id', studentId).select('invite_id'));
}

export async function cancelInvite(id: string): Promise<void> {
  unwrap(await supabase.from('meet_invites').update({ cancelled: true }).eq('id', id).select('id'));
}
