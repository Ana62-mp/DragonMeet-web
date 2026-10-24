import { canViewLocation, canViewSchedule, getVisibleZone, hasClassAt, type SocialState } from './permissions.ts';

export type AvailableFriend = { id: string; zone: string };

/** Authorized friends who reported being on campus (fresh report) and have no class at this minute.
 * "No class" is not a promise of free time. Missing data never counts as available.
 */
export function getFriendsOnCampusNow(
  s: SocialState,
  viewer: string,
  everyone: string[],
  clock: { day: number; minutes: number },
  nowTs: number,
): AvailableFriend[] {
  if (clock.day < 0) return [];
  return everyone.flatMap(id => {
    if (id === viewer || !canViewSchedule(s, viewer, id) || !canViewLocation(s, viewer, id, nowTs)) return [];
    if (hasClassAt(s.entries, id, clock.day, clock.minutes)) return [];
    const zone = getVisibleZone(s, viewer, id, nowTs);
    return zone ? [{ id, zone }] : [];
  });
}

/** Zones where authorized friends are currently visible, keyed by zone id. */
export function getVisibleFriendsByZone(s: SocialState, viewer: string, everyone: string[], nowTs: number): Record<string, string[]> {
  const byZone: Record<string, string[]> = {};
  for (const id of everyone) {
    const zone = id === viewer ? null : getVisibleZone(s, viewer, id, nowTs);
    if (zone) byZone[zone] = [...(byZone[zone] ?? []), id];
  }
  return byZone;
}
