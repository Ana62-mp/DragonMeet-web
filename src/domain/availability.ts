import { PRESENCE_TTL_MS } from '../data/campus.ts';
import type { Access, Entry, Presence } from '../types';
import { hasClassAt } from './visibility.ts';

export type AvailableFriend = { id: string; zone: string };

export const isPresenceFresh = (presence: Presence | undefined, nowTs: number): presence is Presence =>
  presence !== undefined && nowTs - presence.updatedAt < PRESENCE_TTL_MS;

type Inputs = {
  friendIds: string[];
  access: Record<string, Access | undefined>;
  zones: Record<string, Presence | undefined>;
  /** Classes the server lets the viewer see (own data is irrelevant here). */
  entries: Pick<Entry, 'user' | 'day' | 'start' | 'end'>[];
  clock: { day: number; minutes: number };
  nowTs: number;
};

/** Friends the viewer may see (schedule AND location), with a fresh campus report and no class at this minute.
 * "No class" is not a promise of free time. Missing data never counts as available.
 */
export function getFriendsOnCampusNow({ friendIds, access, zones, entries, clock, nowTs }: Inputs): AvailableFriend[] {
  if (clock.day < 0) return [];
  return friendIds.flatMap(id => {
    const presence = zones[id];
    const allowed = access[id]?.schedule && access[id]?.location;
    if (!allowed || !isPresenceFresh(presence, nowTs) || hasClassAt(entries, id, clock.day, clock.minutes)) return [];
    return [{ id, zone: presence.zone }];
  });
}

/** Zones where friends are currently visible, keyed by zone id. */
export function groupFriendsByZone(friendIds: string[], access: Inputs['access'], zones: Inputs['zones'], nowTs: number): Record<string, string[]> {
  const byZone: Record<string, string[]> = {};
  for (const id of friendIds) {
    const presence = zones[id];
    if (access[id]?.location && isPresenceFresh(presence, nowTs)) byZone[presence.zone] = [...(byZone[presence.zone] ?? []), id];
  }
  return byZone;
}
