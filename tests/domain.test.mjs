import test from 'node:test';
import assert from 'node:assert/strict';
import { toMinutes, fromMinutes, fmt, parseTime, isValidRange, ecuadorNow, fromPgTime, toPgTime } from '../src/domain/time.ts';
import { validateSlot, validateSlots } from '../src/domain/schedule.ts';
import { CLASS_BUILDINGS, CAMPUS_ZONES, normalizeBuilding } from '../src/data/campus.ts';
import { getFriendsOnCampusNow, groupFriendsByZone } from '../src/domain/availability.ts';
import { people, schedules, friendships, permissions, profileState } from '../scripts/seed-data.ts';

const NOW = 1_000_000;
const entry = (user, day, start, end, extra = {}) => ({ id: `${user}${day}${start}`, user, title: 'Secreta', code: 'SEC-1', day, start, end, building: 'Newton', room: 'N-1', ...extra });

test('time helpers convert decimals and minutes without drifting', () => {
  assert.equal(toMinutes(9.5), 570);
  assert.equal(fromMinutes(570), 9.5);
  assert.equal(toMinutes(10 + 10 / 60), 610);
  assert.equal(fmt(10 + 10 / 60), '10:10');
  assert.equal(fmt(7), '07:00');
  assert.equal(parseTime('09:05'), 545);
  assert.equal(parseTime('25:00'), null);
  assert.equal(parseTime('nope'), null);
});

test('Postgres time round-trips through decimal hours', () => {
  assert.equal(fromPgTime('09:30:00'), 9.5);
  assert.equal(toPgTime(10 + 10 / 60), '10:10:00');
  assert.equal(toPgTime(fromPgTime('13:45:00')), '13:45:00');
});

test('class range: 20:00 can end a class but never start one', () => {
  assert.equal(isValidRange(420, 1200), true);
  assert.equal(isValidRange(1200, 1260), false);
  assert.equal(isValidRange(419, 500), false);
  assert.equal(isValidRange(600, 600), false);
});

test('ecuadorNow returns a weekday index and minutes within the day', () => {
  assert.deepEqual(ecuadorNow(new Date('2026-10-26T15:30:00Z')), { day: 0, minutes: 10 * 60 + 30 }); // UTC-5
  assert.equal(ecuadorNow(new Date('2026-10-25T15:00:00Z')).day, -1);
});

test('slot validation rejects overlaps, bad ranges and non-academic buildings', () => {
  const others = [entry('ana', 1, 9, 10)];
  const ok = { day: 1, startMin: 600, endMin: 660, building: 'Newton' };
  assert.equal(validateSlot(ok, others), null);
  assert.match(validateSlot({ ...ok, startMin: 570 }, others), /superpone/);
  assert.match(validateSlot({ ...ok, startMin: 700, endMin: 650 }, others), /horas válidas/);
  assert.match(validateSlot({ ...ok, building: 'Cuadrángulos' }, others), /edificio/i);
  assert.deepEqual(validateSlots([ok, { ...ok, startMin: 630, endMin: 700 }], []).map(Boolean), [false, true]);
});

test('catalogs: classes use academic buildings only; open spaces are valid locations', () => {
  assert.ok(CLASS_BUILDINGS.includes('Complejo Hayek'));
  for (const bad of ['Student Union', 'Hall', 'Cuadrángulo', 'Plaza Maxwell', 'Biblioteca']) assert.equal(CLASS_BUILDINGS.includes(bad), false);
  assert.ok(CAMPUS_ZONES.some(z => z.id === 'cuadrangulos' && z.kind === 'OPEN'));
  assert.equal(normalizeBuilding('Hall'), 'Da Vinci');
});

const base = (over = {}) => ({
  friendIds: ['vale', 'paulo'],
  access: { vale: { schedule: true, location: true }, paulo: { schedule: true, location: true } },
  zones: { vale: { zone: 'biblioteca', updatedAt: NOW }, paulo: { zone: 'da-vinci', updatedAt: NOW } },
  entries: [entry('vale', 0, 8, 9.5), entry('paulo', 0, 10, 12)],
  clock: { day: 0, minutes: 10 * 60 + 30 },
  nowTs: NOW,
  ...over,
});

test('available-now: needs access, a fresh zone and no class at this minute', () => {
  assert.deepEqual(getFriendsOnCampusNow(base()), [{ id: 'vale', zone: 'biblioteca' }], 'Paulo is in class at 10:30');
  assert.equal(getFriendsOnCampusNow(base({ clock: { day: 0, minutes: 9 * 60 } })).length, 1, 'only Paulo is free at 09:00');
  assert.equal(getFriendsOnCampusNow(base({ clock: { day: 0, minutes: 9 * 60 + 30 } })).length, 2, 'class end is exclusive');
  assert.deepEqual(getFriendsOnCampusNow(base({ clock: { day: -1, minutes: 600 } })), [], 'weekend');
  assert.deepEqual(getFriendsOnCampusNow(base({ access: { vale: { schedule: true, location: false }, paulo: { schedule: false, location: true } } })), []);
  assert.deepEqual(getFriendsOnCampusNow(base({ access: {} })), [], 'no access data means nobody');
  assert.deepEqual(getFriendsOnCampusNow(base({ zones: {} })), [], 'missing zone is never inferred');
  assert.deepEqual(getFriendsOnCampusNow(base({ nowTs: NOW + 5 * 3600 * 1000 })), [], 'stale report expires');
});

test('map grouping only includes friends with location access and a fresh zone', () => {
  const access = { vale: { schedule: true, location: true }, paulo: { schedule: true, location: false } };
  const zones = { vale: { zone: 'biblioteca', updatedAt: NOW }, paulo: { zone: 'biblioteca', updatedAt: NOW } };
  assert.deepEqual(groupFriendsByZone(['vale', 'paulo'], access, zones, NOW), { biblioteca: ['vale'] });
  assert.deepEqual(groupFriendsByZone(['vale'], access, zones, NOW + 5 * 3600 * 1000), {});
});

test('seed data is coherent: unique banner codes, valid buildings, no overlaps, known people', () => {
  const keys = new Set(people.map(p => p.key));
  assert.equal(new Set(people.map(p => p.banner)).size, people.length);
  assert.equal(new Set(people.map(p => p.email)).size, people.length);
  assert.ok(people.every(p => /^00\d{6}$/.test(p.banner) && p.email.endsWith('@estud.usfq.edu.ec')));
  assert.ok(people.length >= 15 && people.length <= 18, 'three main accounts plus 12-15 fillers');
  assert.ok(schedules.every(s => keys.has(s.key) && CLASS_BUILDINGS.includes(s.building) && s.start < s.end && s.start >= '07:00' && s.end <= '20:00'));
  for (const p of people) {
    const mine = schedules.filter(s => s.key === p.key);
    assert.ok(mine.length >= 4, `${p.key} has a schedule`);
    for (const a of mine) for (const b of mine) if (a !== b && a.day === b.day) assert.ok(a.end <= b.start || b.end <= a.start, `${p.key} overlaps`);
  }
  assert.ok(friendships.flat().filter(x => x !== 'accepted' && x !== 'pending').every(k => keys.has(k)));
  assert.ok(permissions.every(([o, f]) => keys.has(o) && keys.has(f)));
  assert.ok(Object.keys(profileState).every(k => keys.has(k)));
});

test('seed relationships match the demo story', () => {
  const has = (a, b, status) => friendships.some(([x, y, s]) => [x, y].sort().join() === [a, b].sort().join() && s === status);
  assert.ok(has('ana', 'vale', 'accepted') && has('ana', 'paulo', 'accepted'));
  assert.ok(has('vale', 'paulo', 'pending'), 'pending request to accept from Paulo');
  assert.ok(friendships.filter(([, to, s]) => to === 'ana' && s === 'pending').length >= 2, 'pending requests towards Ana');
  const perm = (o, f) => permissions.find(([x, y]) => x === o && y === f);
  for (const [a, b] of [['ana', 'vale'], ['vale', 'ana'], ['ana', 'paulo'], ['paulo', 'ana']]) assert.deepEqual(perm(a, b).slice(2), [true, true]);
  assert.equal(people.find(p => p.key === 'ana').firstName, 'Ana');
  assert.equal(people.find(p => p.key === 'vale').firstName, 'Valentina');
});

test('dayLoad sums class and free time in the 07:00-20:00 window without double counting', async () => {
  const { dayLoad, formatDuration } = await import('../src/domain/schedule.ts');
  const classes = [entry('a', 0, 8, 9.5), entry('a', 0, 9, 10), entry('a', 0, 19, 21), entry('a', 1, 8, 9)];
  assert.deepEqual(dayLoad(classes, 0), { classMin: 120 + 60, freeMin: 780 - 180 });
  assert.deepEqual(dayLoad(classes, 0, 9 * 60 + 30), { classMin: 30 + 60, freeMin: 630 - 90 });
  assert.deepEqual(dayLoad(classes, 3), { classMin: 0, freeMin: 780 });
  assert.deepEqual(dayLoad(classes, 0, 22 * 60), { classMin: 0, freeMin: 0 });
  assert.equal(formatDuration(210), '3 h 30 min');
  assert.equal(formatDuration(120), '2 h');
  assert.equal(formatDuration(45), '45 min');
});
