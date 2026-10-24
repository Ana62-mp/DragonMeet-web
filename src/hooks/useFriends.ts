import { useMemo } from 'react';
import { useApp } from '../store';
import type { Access, Friendship, Person } from '../types';

const NONE: Access = { schedule: false, location: false };

export type RequestRow = { friendship: Friendship; person: Person | undefined };

/** Friends, requests and permissions of the signed-in student, plus the social actions. */
export function useFriends() {
  const s = useApp();
  const meId = s.me?.id;

  return useMemo(() => {
    const other = (f: Friendship) => (f.requester === meId ? f.addressee : f.requester);
    const accepted = s.friendships.filter(f => f.status === 'accepted');
    const pending = s.friendships.filter(f => f.status === 'pending');
    return {
      friendIds: accepted.map(other),
      friends: accepted.map(other).map(id => s.people[id]).filter((p): p is Person => Boolean(p)),
      received: pending.filter(f => f.addressee === meId).map<RequestRow>(f => ({ friendship: f, person: s.people[f.requester] })),
      sent: pending.filter(f => f.requester === meId).map<RequestRow>(f => ({ friendship: f, person: s.people[f.addressee] })),
      /** What I may see of this friend (decided by the database). */
      accessOf: (id: string): Access => s.access[id] ?? NONE,
      /** What I have granted to this friend. */
      grantedTo: (id: string): Access => s.granted[id] ?? NONE,
      relationTo: (id: string): 'friend' | 'sent' | 'received' | 'none' => {
        const f = s.friendships.find(x => x.requester === id || x.addressee === id);
        if (!f || f.status === 'rejected') return 'none';
        return f.status === 'accepted' ? 'friend' : f.requester === meId ? 'sent' : 'received';
      },
      findFriendship: (id: string) => s.friendships.find(x => x.requester === id || x.addressee === id),
      sendRequest: s.sendRequest,
      respondRequest: s.respondRequest,
      removeFriend: s.removeFriend,
      setPermission: s.setPermission,
    };
  }, [s.friendships, s.people, s.access, s.granted, s.sendRequest, s.respondRequest, s.removeFriend, s.setPermission, meId]);
}
