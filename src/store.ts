import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export type User = {
    id: string;
    name: string;
    email: string;
    major: string;
    color: string;
    initials: string;
};
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
export type Invite = {
    id: string;
    owner: string;
    participants: string[];
    day: number;
    date: string;
    start: number;
    end: number;
    title: string;
    zone: string;
    responses: Record<string, 'pending' | 'accepted' | 'rejected'>;
    cancelled: boolean;
};
export const users: User[] = [
    { id: 'ana', name: 'Ana', email: 'ana@estud.usfq.edu.ec', major: 'Ciencias de la Computación', color: '#E11B22', initials: 'AN' },
    { id: 'vale', name: 'Vale', email: 'vale@estud.usfq.edu.ec', major: 'Ciencias de la Computación', color: '#8B5CF6', initials: 'VA' },
    { id: 'paulo', name: 'Paulo', email: 'paulo@estud.usfq.edu.ec', major: 'Ciencias de la Computación', color: '#3B82F6', initials: 'PA' },
    { id: 'sofia', name: 'Sofía', email: 'sofia@estud.usfq.edu.ec', major: 'Arquitectura', color: '#EC4899', initials: 'SO' },
    { id: 'diego', name: 'Diego', email: 'diego@estud.usfq.edu.ec', major: 'Administración', color: '#F97316', initials: 'DI' }
];
export const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
export const zones = ['Student Union', 'Da Vinci', 'Newton', 'Einstein', 'Galileo', 'Hall', 'Biblioteca', 'Cuadrángulo', 'Plaza Maxwell'];
const seeds: [
    string,
    string,
    string,
    number,
    number,
    number,
    string,
    string
][] = [
    ['ana', 'Cálculo Diferencial', 'MAT-1201', 0, 8, 9.5, 'Newton', 'N-201'], ['ana', 'Programación I', 'CMP-101', 0, 10, 11.5, 'Da Vinci', 'DV-105'], ['ana', 'Álgebra Lineal', 'MAT-2101', 1, 9, 10.5, 'Einstein', 'E-203'], ['ana', 'Microeconomía', 'ECO-101', 2, 8, 9.5, 'Galileo', 'G-102'], ['ana', 'Escritura Académica', 'ESP-100', 2, 14, 15.5, 'Hall', 'H-104'], ['ana', 'Cálculo Diferencial', 'MAT-1201', 3, 8, 9.5, 'Newton', 'N-201'], ['ana', 'Programación I', 'CMP-101', 4, 10, 11.5, 'Da Vinci', 'DV-105'],
    ['vale', 'Programación I', 'CMP-101', 0, 8, 9.5, 'Da Vinci', 'DV-105'], ['vale', 'Álgebra Lineal', 'MAT-2101', 0, 13.5, 15, 'Einstein', 'E-203'], ['vale', 'Física I', 'FIS-100', 1, 10, 12, 'Newton', 'N-103'], ['vale', 'Bases de Datos', 'CMP-230', 2, 9, 11, 'Da Vinci', 'DV-205'], ['vale', 'Física I', 'FIS-100', 3, 13, 15, 'Newton', 'N-103'], ['vale', 'Programación I', 'CMP-101', 4, 8, 9.5, 'Da Vinci', 'DV-105'],
    ['paulo', 'Cálculo Diferencial', 'MAT-1201', 0, 8, 10, 'Newton', 'N-201'], ['paulo', 'Bases de Datos', 'CMP-230', 0, 14, 16, 'Da Vinci', 'DV-205'], ['paulo', 'Programación I', 'CMP-101', 1, 8, 10, 'Da Vinci', 'DV-105'], ['paulo', 'Física I', 'FIS-100', 2, 11, 13, 'Newton', 'N-103'], ['paulo', 'Álgebra Lineal', 'MAT-2101', 3, 10, 12, 'Einstein', 'E-203'], ['paulo', 'Física I', 'FIS-100', 4, 13, 15, 'Newton', 'N-103'],
    ['sofia', 'Taller de Diseño', 'ARQ-110', 0, 9, 12, 'Galileo', 'G-201'], ['sofia', 'Historia del Arte', 'ARQ-130', 1, 8, 10, 'Hall', 'H-202'], ['sofia', 'Dibujo', 'ARQ-120', 2, 10, 12, 'Galileo', 'G-103'], ['sofia', 'Taller de Diseño', 'ARQ-110', 3, 8, 11, 'Galileo', 'G-201'], ['sofia', 'Dibujo', 'ARQ-120', 4, 13, 16, 'Galileo', 'G-103'],
    ['diego', 'Contabilidad', 'ADM-100', 0, 10, 12, 'Einstein', 'E-101'], ['diego', 'Marketing', 'ADM-201', 1, 11, 13, 'Hall', 'H-101'], ['diego', 'Economía', 'ECO-101', 2, 8, 10, 'Galileo', 'G-101'], ['diego', 'Marketing', 'ADM-201', 3, 14, 16, 'Hall', 'H-101'], ['diego', 'Contabilidad', 'ADM-100', 4, 9, 11, 'Einstein', 'E-101']
];
export const initialEntries: Entry[] = seeds.map(([user, title, code, day, start, end, building, room], i) => ({ id: `e${i}`, user, title, code, day, start, end, building, room }));
const pairs = ['ana:vale', 'ana:paulo', 'ana:sofia'];
const initialPermissions: Record<string, boolean> = {};
for (const a of users)
    for (const b of users)
        if (a.id !== b.id) {
            const related = pairs.includes([a.id, b.id].sort().join(':'));
            initialPermissions[`${a.id}:${b.id}:schedule`] = related;
            initialPermissions[`${a.id}:${b.id}:location`] = related && a.id !== 'sofia' && b.id !== 'sofia';
        }
export type AppState = {
    logged: boolean;
    current: string;
    entries: Entry[];
    friends: string[];
    requests: {
        from: string;
        to: string;
    }[];
    permissions: Record<string, boolean>;
    global: Record<string, {
        schedule: boolean;
        location: boolean;
    }>;
    presence: Record<string, string>;
    invites: Invite[];
    notifications: string[];
    login: () => void;
    logout: () => void;
    switchUser: (id: string) => void;
    reset: () => void;
    addEntry: (entry: Entry) => void;
    removeEntry: (id: string) => void;
    request: (to: string) => void;
    cancelRequest: (from: string, to: string) => void;
    respondRequest: (from: string, accept: boolean) => void;
    removeFriend: (id: string) => void;
    setPermission: (friend: string, kind: 'schedule' | 'location', value: boolean) => void;
    setGlobal: (kind: 'schedule' | 'location', value: boolean) => void;
    setZone: (zone: string) => void;
    createInvite: (invite: Invite) => void;
    respondInvite: (id: string, accept: boolean) => void;
    cancelInvite: (id: string) => void;
    notify: (text: string) => void;
};
const init = () => ({ logged: false, current: 'ana', entries: initialEntries, friends: pairs, requests: [{ from: 'diego', to: 'ana' }], permissions: initialPermissions, global: Object.fromEntries(users.map(u => [u.id, { schedule: true, location: u.id !== 'sofia' }])), presence: { ana: 'Cuadrángulo', vale: 'Biblioteca', paulo: 'Student Union', sofia: 'Galileo', diego: 'Da Vinci' }, invites: [] as Invite[], notifications: [] as string[] });
export const useApp = create<AppState>()(persist((set) => ({ ...init(), login: () => set({ logged: true }), logout: () => set({ logged: false, current: 'ana' }), switchUser: id => set({ current: id }), reset: () => set({ ...init(), logged: true }), addEntry: entry => set(s => ({ entries: [...s.entries.filter(e => e.id !== entry.id), entry] })), removeEntry: id => set(s => ({ entries: s.entries.filter(e => e.id !== id) })), request: to => set(s => ({ requests: to === s.current || isFriend(s, s.current, to) || s.requests.some(r => (r.from === s.current && r.to === to) || (r.from === to && r.to === s.current)) ? s.requests : [...s.requests, { from: s.current, to }] })), cancelRequest: (from, to) => set(s => ({ requests: s.requests.filter(r => r.from !== from || r.to !== to) })), respondRequest: (from, accept) => set(s => ({ requests: s.requests.filter(r => r.from !== from || r.to !== s.current), friends: accept ? [...new Set([...s.friends, [from, s.current].sort().join(':')])] : s.friends })), removeFriend: id => set(s => ({ friends: s.friends.filter(p => p !== [s.current, id].sort().join(':')), permissions: Object.fromEntries(Object.entries(s.permissions).filter(([k]) => !k.startsWith(`${s.current}:${id}:`) && !k.startsWith(`${id}:${s.current}:`))) })), setPermission: (friend, kind, value) => set(s => ({ permissions: { ...s.permissions, [`${s.current}:${friend}:${kind}`]: value } })), setGlobal: (kind, value) => set(s => ({ global: { ...s.global, [s.current]: { ...s.global[s.current], [kind]: value } } })), setZone: zone => set(s => ({ presence: { ...s.presence, [s.current]: zone } })), createInvite: invite => set(s => ({ invites: [...s.invites, invite] })), respondInvite: (id, accept) => set(s => ({ invites: s.invites.map(i => i.id === id ? { ...i, responses: { ...i.responses, [s.current]: accept ? 'accepted' : 'rejected' } } : i) })), cancelInvite: id => set(s => ({ invites: s.invites.map(i => i.id === id ? { ...i, cancelled: true } : i) })), notify: text => set(s => ({ notifications: [text, ...s.notifications].slice(0, 5) })) }), { name: 'dragon-match-demo-v1', version: 1 }));
export const isFriend = (s: AppState, a: string, b: string) => a !== b && s.friends.includes([a, b].sort().join(':'));
export const canView = (s: AppState, viewer: string, owner: string, kind: 'schedule' | 'location') => viewer === owner || Boolean(isFriend(s, viewer, owner) && s.global[viewer]?.[kind] && s.global[owner]?.[kind] && s.permissions[`${owner}:${viewer}:${kind}`] && s.permissions[`${viewer}:${owner}:${kind}`]);
export const fmt = (hour: number) => `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}`;
export { calculate } from './engine';
