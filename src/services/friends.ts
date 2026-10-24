import { supabase } from '../lib/supabase';
import type { Access, Friendship, FriendshipStatus, Presence } from '../types';
import { rpc, unwrap } from './db';

type FriendshipRow = { id: string; requester_id: string; addressee_id: string; status: FriendshipStatus };
type PermissionRow = { owner_id: string; friend_id: string; share_schedule: boolean; share_location: boolean };
type AccessRow = { friend_id: string; can_schedule: boolean; can_location: boolean };
type ZoneRow = { friend_id: string; zone_id: string; updated_at: string };

export async function fetchFriendships(): Promise<Friendship[]> {
  return unwrap(await supabase.from('friendships').select('*').returns<FriendshipRow[]>())
    .map(r => ({ id: r.id, requester: r.requester_id, addressee: r.addressee_id, status: r.status }));
}

/** What I have granted to each friend (rows I own). */
export async function fetchGrantedPermissions(userId: string): Promise<Record<string, Access>> {
  const rows = unwrap(await supabase.from('friend_permissions').select('*').eq('owner_id', userId).returns<PermissionRow[]>());
  return Object.fromEntries(rows.map(r => [r.friend_id, { schedule: r.share_schedule, location: r.share_location }]));
}

/** What I may currently see of each accepted friend, computed by the database. */
export async function fetchAccess(): Promise<Record<string, Access>> {
  const rows = await rpc<AccessRow[]>('get_friend_access');
  return Object.fromEntries(rows.map(r => [r.friend_id, { schedule: r.can_schedule, location: r.can_location }]));
}

export async function fetchVisibleZones(): Promise<Record<string, Presence>> {
  const rows = await rpc<ZoneRow[]>('get_visible_friend_zones');
  return Object.fromEntries(rows.map(r => [r.friend_id, { zone: r.zone_id, updatedAt: Date.parse(r.updated_at) }]));
}

export async function sendRequest(to: string): Promise<FriendshipStatus> {
  return rpc<FriendshipStatus>('send_friend_request', { p_to: to });
}

export async function respondRequest(id: string, accept: boolean): Promise<void> {
  unwrap(await supabase.from('friendships').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', id).select('id').single());
}

/** Cancels a request or removes a friend; the database revokes permissions both ways. */
export async function removeFriendship(other: string): Promise<void> {
  await rpc<null>('remove_friendship', { p_other: other });
}

export async function setPermission(owner: string, friend: string, current: Access, patch: Partial<Access>): Promise<void> {
  const next = { ...current, ...patch };
  unwrap(await supabase.from('friend_permissions').upsert(
    { owner_id: owner, friend_id: friend, share_schedule: next.schedule, share_location: next.location },
    { onConflict: 'owner_id,friend_id' },
  ).select('owner_id'));
}
