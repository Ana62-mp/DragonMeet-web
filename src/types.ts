export type ScheduleDisclosure = 'DETAILS' | 'BUSY_ONLY';

/** Public fields of a student: what any connection (or search result) may see. */
export type Person = {
  id: string;
  fullName: string;
  firstName: string;
  career: string;
  semester: number;
  color: string;
  bannerCode: string;
};

/** The signed-in student's full profile. */
export type Me = Person & {
  email: string;
  shareSchedule: boolean;
  shareLocation: boolean;
  disclosure: ScheduleDisclosure;
  onCampus: boolean;
  zone: string | null;
  zoneUpdatedAt: number | null;
};

/** One of the signed-in student's own classes (hours as decimals: 9.5 = 09:30; day 0 = Monday). */
export type Entry = {
  id: string;
  user: string;
  title: string;
  code: string;
  day: number;
  start: number;
  end: number;
  building: string;
  room: string;
};

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';
export type Friendship = { id: string; requester: string; addressee: string; status: FriendshipStatus };

export type Access = { schedule: boolean; location: boolean };
export type Presence = { zone: string; updatedAt: number };

export type InviteResponse = 'pending' | 'accepted' | 'rejected';
export type Invite = {
  id: string;
  owner: string;
  title: string;
  date: string;
  day: number;
  start: number;
  end: number;
  zone: string;
  cancelled: boolean;
  /** Invitees only (the owner is implicit). */
  responses: Record<string, InviteResponse>;
};
