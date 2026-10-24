import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { VisibleEntry } from './domain/visibility.ts';
import { supabase } from './lib/supabase';
import { toast } from './lib/toast';
import * as friendsApi from './services/friends';
import * as invitesApi from './services/invites';
import * as profilesApi from './services/profiles';
import * as scheduleApi from './services/schedule';
import type { Access, Entry, Friendship, Invite, Me, Person, Presence } from './types';

export const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

/** Everything the signed-in student may see. Filled from Supabase; there is no local mock data. */
type Snapshot = {
  me: Me | null;
  people: Record<string, Person>;
  friendships: Friendship[];
  entries: Entry[];
  friendEntries: VisibleEntry[];
  access: Record<string, Access>;
  granted: Record<string, Access>;
  zones: Record<string, Presence>;
  invites: Invite[];
};

const EMPTY: Snapshot = {
  me: null, people: {}, friendships: [], entries: [], friendEntries: [], access: {}, granted: {}, zones: {}, invites: [],
};

type AppState = Snapshot & {
  auth: AuthStatus;
  loaded: boolean;
  loadError: string | null;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  saveEntry: (entry: Entry, existing: boolean) => Promise<boolean>;
  importEntries: (entries: Entry[]) => Promise<boolean>;
  removeEntry: (id: string) => Promise<boolean>;
  sendRequest: (to: string) => Promise<void>;
  respondRequest: (friendshipId: string, accept: boolean) => Promise<void>;
  removeFriend: (id: string) => Promise<void>;
  setPermission: (friend: string, patch: Partial<Access>) => Promise<void>;
  updateProfile: (patch: profilesApi.ProfilePatch, success?: string) => Promise<boolean>;
  setOnCampus: (value: boolean) => Promise<void>;
  setZone: (zone: string) => Promise<void>;
  createInvite: (invite: invitesApi.NewInvite, invitees: string[]) => Promise<boolean>;
  respondInvite: (id: string, accept: boolean) => Promise<void>;
  cancelInvite: (id: string) => Promise<void>;
};

const messageOf = (error: unknown) => (error instanceof Error ? error.message : 'Ocurrió un error inesperado.');

const friendlyAuthError = (message: string) =>
  /invalid login/i.test(message) ? 'Correo o contraseña incorrectos.' : /network|fetch/i.test(message) ? 'No hay conexión con el servidor.' : message;

export const useApp = create<AppState>((set, get) => {
  let latest = 0;

  async function load(userId: string) {
    const ticket = ++latest;
    const [me, connections, friendships, entries, friendEntries, access, granted, zones, invites] = await Promise.all([
      profilesApi.fetchMe(userId), profilesApi.fetchConnections(), friendsApi.fetchFriendships(),
      scheduleApi.fetchOwnSchedule(userId), scheduleApi.fetchVisibleSchedules(), friendsApi.fetchAccess(),
      friendsApi.fetchGrantedPermissions(userId), friendsApi.fetchVisibleZones(), invitesApi.fetchInvites(),
    ]);
    if (ticket !== latest) return;                       // a newer refresh already won
    set({
      me, people: Object.fromEntries([me, ...connections].map(p => [p.id, p])), friendships, entries, friendEntries,
      access, granted, zones, invites, loaded: true, loadError: null,
    });
  }

  /** Runs a write, then refreshes. Shows a toast on failure (and on success when a message is given). */
  async function attempt(write: () => Promise<unknown>, success?: string): Promise<boolean> {
    try {
      await write();
      await get().refresh();
      if (success) toast.success(success);
      return true;
    } catch (error) {
      toast.error(messageOf(error));
      return false;
    }
  }

  const userId = () => get().me!.id;

  function applySession(session: Session | null) {
    if (!session) {
      latest++;
      set({ ...EMPTY, auth: 'signed-out', loaded: false, loadError: null });
      return;
    }
    if (get().auth === 'signed-in' && get().me?.id === session.user.id) return;
    set({ auth: 'signed-in', loaded: false, loadError: null });
    load(session.user.id).catch(error => set({ loadError: messageOf(error) }));
  }

  return {
    ...EMPTY,
    auth: 'loading',
    loaded: false,
    loadError: null,

    init: () => {
      supabase.auth.getSession().then(({ data }) => applySession(data.session));
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setTimeout(() => applySession(session), 0);     // never call Supabase inside this callback
      });
      return () => data.subscription.unsubscribe();
    },

    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? friendlyAuthError(error.message) : null;
    },
    signOut: async () => {
      await supabase.auth.signOut();
      applySession(null);
    },

    refresh: async () => {
      const id = get().me?.id;
      if (!id) return;
      try {
        await load(id);
      } catch (error) {
        if (!get().loaded) set({ loadError: messageOf(error) });
        else throw error;
      }
    },

    saveEntry: (entry, existing) => attempt(() => scheduleApi.saveBlock(entry, existing), existing ? 'Clase actualizada' : 'Clase agregada'),
    importEntries: entries => attempt(() => scheduleApi.saveBlocks(entries), `${entries.length} clases importadas`),
    removeEntry: id => attempt(() => scheduleApi.deleteBlock(id), 'Clase eliminada'),

    sendRequest: async to => {
      await attempt(async () => {
        const result = await friendsApi.sendRequest(to);
        toast.success(result === 'accepted' ? '¡Ya son amigos!' : 'Solicitud enviada');
      });
    },
    respondRequest: async (id, accept) => { await attempt(() => friendsApi.respondRequest(id, accept), accept ? 'Solicitud aceptada' : 'Solicitud rechazada'); },
    removeFriend: async id => { await attempt(() => friendsApi.removeFriendship(id), 'Listo, se revocaron los permisos'); },
    setPermission: async (friend, patch) => {
      const current = get().granted[friend] ?? { schedule: false, location: false };
      await attempt(() => friendsApi.setPermission(userId(), friend, current, patch));
    },

    updateProfile: (patch, success) => attempt(() => profilesApi.updateProfile(userId(), patch), success),
    setOnCampus: async value => { await get().updateProfile({ onCampus: value }); },
    // The database stamps the report time; the app never sends GPS data, only a general zone.
    setZone: async zone => { await get().updateProfile({ onCampus: true, zone, zoneUpdatedAt: new Date().toISOString() }, 'Ubicación actualizada'); },

    createInvite: (invite, invitees) => attempt(() => invitesApi.createInvite(userId(), invite, invitees), 'Invitación enviada'),
    respondInvite: async (id, accept) => { await attempt(() => invitesApi.respondInvite(id, userId(), accept), accept ? 'Invitación aceptada' : 'Invitación rechazada'); },
    cancelInvite: async id => { await attempt(() => invitesApi.cancelInvite(id), 'Encuentro cancelado'); },
  };
});

export const friendIdsOf = (s: Pick<AppState, 'friendships' | 'me'>) =>
  s.friendships.filter(f => f.status === 'accepted').map(f => (f.requester === s.me?.id ? f.addressee : f.requester));

export { calculate } from './engine';
export { fmt } from './domain/time.ts';
