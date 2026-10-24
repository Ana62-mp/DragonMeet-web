import type { Entry } from '../store';
import { PRESENCE_TTL_MS } from '../data/campus.ts';
import { overlaps, toMinutes } from './time.ts';

export type PermissionKind = 'schedule' | 'location';
export type ScheduleDisclosure = 'DETAILS' | 'BUSY_ONLY';
export type Presence = { zone: string; updatedAt: number };

/** The slice of app state the privacy rules depend on. */
export type SocialState = {
  entries: Entry[];
  friends: string[];
  permissions: Record<string, boolean>;
  global: Record<string, { schedule: boolean; location: boolean }>;
  disclosure: Record<string, ScheduleDisclosure>;
  onCampus: Record<string, boolean>;
  presence: Record<string, Presence | undefined>;
};

/** A class as seen by another student: private fields are removed, not just hidden in the UI. */
export type VisibleEntry = Pick<Entry, 'id' | 'user' | 'day' | 'start' | 'end'> &
  Partial<Pick<Entry, 'title' | 'code' | 'building' | 'room'>> & { busyOnly: boolean };

export const BUSY_LABEL = 'Ocupado';

export const areFriends = (s: Pick<SocialState, 'friends'>, a: string, b: string) =>
  a !== b && s.friends.includes([a, b].sort().join(':'));

/** Viewing requires accepted friendship, both global switches and both per-friend permissions. */
export const canView = (s: SocialState, viewer: string, owner: string, kind: PermissionKind) =>
  viewer === owner ||
  Boolean(
    areFriends(s, viewer, owner) &&
      s.global[viewer]?.[kind] &&
      s.global[owner]?.[kind] &&
      s.permissions[`${owner}:${viewer}:${kind}`] &&
      s.permissions[`${viewer}:${owner}:${kind}`],
  );

export const canViewSchedule = (s: SocialState, viewer: string, owner: string) => canView(s, viewer, owner, 'schedule');

export const isPresenceFresh = (presence: Presence | undefined, now: number): presence is Presence =>
  Boolean(presence) && now - presence!.updatedAt < PRESENCE_TTL_MS;

/** Returns the owner's zone only if the viewer may see it and the report is current. */
export function getVisibleZone(s: SocialState, viewer: string, owner: string, now: number): string | null {
  if (!s.onCampus[owner]) return null;
  const presence = s.presence[owner];
  if (viewer !== owner && !canView(s, viewer, owner, 'location')) return null;
  return isPresenceFresh(presence, now) ? presence.zone : null;
}

export const canViewLocation = (s: SocialState, viewer: string, owner: string, now: number) =>
  getVisibleZone(s, viewer, owner, now) !== null;

/** Strips private fields according to the owner's disclosure mode. Never mutates the source entry. */
export function getVisibleEntry(s: SocialState, viewer: string, entry: Entry): VisibleEntry {
  const base = { id: entry.id, user: entry.user, day: entry.day, start: entry.start, end: entry.end };
  if (viewer === entry.user) {
    return { ...base, title: entry.title, code: entry.code, building: entry.building, room: entry.room, busyOnly: false };
  }
  // Friends never receive code or room; with BUSY_ONLY they get neither title nor building.
  if ((s.disclosure[entry.user] ?? 'DETAILS') === 'DETAILS') {
    return { ...base, title: entry.title, building: entry.building, busyOnly: false };
  }
  return { ...base, busyOnly: true };
}

export function getVisibleSchedule(s: SocialState, viewer: string, owner: string): VisibleEntry[] {
  if (!canViewSchedule(s, viewer, owner)) return [];
  return s.entries.filter(e => e.user === owner).map(e => getVisibleEntry(s, viewer, e));
}

export const hasClassAt = (entries: Entry[], user: string, day: number, minute: number) =>
  entries.some(e => e.user === user && e.day === day && overlaps(toMinutes(e.start), toMinutes(e.end), minute, minute + 1));
