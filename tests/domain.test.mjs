import test from 'node:test';
import assert from 'node:assert/strict';
import { toMinutes, fromMinutes, fmt, parseTime, isValidRange, ecuadorNow } from '../src/domain/time.ts';
import { validateSlot, validateSlots } from '../src/domain/schedule.ts';
import { CLASS_BUILDINGS, CAMPUS_ZONES, normalizeBuilding } from '../src/data/campus.ts';
import { getVisibleEntry, getVisibleSchedule, getVisibleZone, canView } from '../src/domain/permissions.ts';
import { getFriendsOnCampusNow } from '../src/domain/availability.ts';
import { entryToRow, rowToEntry } from '../src/services/scheduleMapping.ts';
import { describeDataMode } from '../src/lib/dataMode.ts';

const NOW = 1_000_000;
const entry = (user, day, start, end, extra = {}) => ({ id: `${user}${day}${start}`, user, title: 'Secreta', code: 'SEC-1', day, start, end, building: 'Newton', room: 'N-1', ...extra });
const state = (over = {}) => ({
  entries: [entry('ana', 0, 8, 9), entry('vale', 0, 8, 9), entry('vale', 0, 14, 15)],
  friends: ['ana:vale'],
  permissions: { 'ana:vale:schedule': true, 'vale:ana:schedule': true, 'ana:vale:location': true, 'vale:ana:location': true },
  global: { ana: { schedule: true, location: true }, vale: { schedule: true, location: true } },
  disclosure: { ana: 'DETAILS', vale: 'DETAILS' },
  onCampus: { ana: true, vale: true },
  presence: { ana: { zone: 'cuadrangulos', updatedAt: NOW }, vale: { zone: 'biblioteca', updatedAt: NOW } },
  ...over,
});
const at = (day, hour, minute = 0) => ({ day, minutes: hour * 60 + minute });
const ids = ['ana', 'vale'];

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

test('class range: 20:00 can end a class but never start one', () => {
  assert.equal(isValidRange(420, 1200), true);
  assert.equal(isValidRange(1200, 1260), false);
  assert.equal(isValidRange(419, 500), false);
  assert.equal(isValidRange(600, 600), false);
});

test('ecuadorNow returns a weekday index and minutes within the day', () => {
  const monday = ecuadorNow(new Date('2026-10-26T15:30:00Z')); // 10:30 in Guayaquil (UTC-5)
  assert.deepEqual(monday, { day: 0, minutes: 10 * 60 + 30 });
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
  assert.equal(CAMPUS_ZONES.some(z => /student union/i.test(z.label)), false);
  assert.equal(normalizeBuilding('Hall'), 'Da Vinci');
  assert.equal(normalizeBuilding('Newton'), 'Newton');
});

test('owner sees full classes; friends get no code/room, and BUSY_ONLY hides title and building', () => {
  const s = state({ disclosure: { ana: 'DETAILS', vale: 'BUSY_ONLY' } });
  const own = getVisibleEntry(s, 'vale', s.entries[1]);
  assert.equal(own.title, 'Secreta');
  assert.equal(own.room, 'N-1');
  const seen = getVisibleSchedule(s, 'ana', 'vale');
  assert.equal(seen.length, 2);
  for (const b of seen) {
    assert.equal(b.busyOnly, true);
    assert.deepEqual(Object.keys(b).sort(), ['busyOnly', 'day', 'end', 'id', 'start', 'user']);
  }
  const details = getVisibleEntry(state(), 'ana', state().entries[1]);
  assert.equal(details.title, 'Secreta');
  assert.equal(details.building, 'Newton');
  assert.equal('code' in details || 'room' in details, false);
});

test('unauthorized viewers get nothing: pending, one-sided and revoked access', () => {
  assert.deepEqual(getVisibleSchedule(state({ friends: [] }), 'ana', 'vale'), []);
  assert.deepEqual(getVisibleSchedule(state({ permissions: { 'ana:vale:schedule': true } }), 'ana', 'vale'), []);
  assert.equal(canView(state({ global: { ana: { schedule: false, location: true }, vale: { schedule: true, location: true } } }), 'ana', 'vale', 'schedule'), false);
});

test('zones are hidden when off campus, revoked or expired', () => {
  assert.equal(getVisibleZone(state(), 'ana', 'vale', NOW), 'biblioteca');
  assert.equal(getVisibleZone(state({ onCampus: { ana: true, vale: false } }), 'ana', 'vale', NOW), null);
  assert.equal(getVisibleZone(state({ permissions: { 'ana:vale:location': true } }), 'ana', 'vale', NOW), null);
  assert.equal(getVisibleZone(state(), 'ana', 'vale', NOW + 5 * 60 * 60 * 1000), null);
  assert.equal(getVisibleZone(state({ presence: {} }), 'ana', 'vale', NOW), null);
});

test('available-now: needs authorization, campus presence and no class at this minute', () => {
  assert.deepEqual(getFriendsOnCampusNow(state(), 'ana', ids, at(0, 10), NOW), [{ id: 'vale', zone: 'biblioteca' }]);
  assert.deepEqual(getFriendsOnCampusNow(state(), 'ana', ids, at(0, 8, 30), NOW), [], 'in class');
  assert.equal(getFriendsOnCampusNow(state(), 'ana', ids, at(0, 9), NOW).length, 1, 'class end is exclusive');
  assert.deepEqual(getFriendsOnCampusNow(state(), 'ana', ids, at(-1, 10), NOW), [], 'weekend');
  assert.deepEqual(getFriendsOnCampusNow(state({ onCampus: { ana: true, vale: false } }), 'ana', ids, at(0, 10), NOW), []);
  assert.deepEqual(getFriendsOnCampusNow(state({ friends: [] }), 'ana', ids, at(0, 10), NOW), []);
  assert.deepEqual(getFriendsOnCampusNow(state({ permissions: { ...state().permissions, 'vale:ana:location': false } }), 'ana', ids, at(0, 10), NOW), []);
});

test('supabase row mapping round-trips decimal hours through minutes', () => {
  const e = entry('ana', 2, 10 + 10 / 60, 11.5);
  const row = entryToRow(e);
  assert.equal(row.start_min, 610);
  assert.equal(row.end_min, 690);
  assert.equal(Math.round(rowToEntry(row).start * 60), 610);
});

test('data mode: demo by default; cloud request falls back to demo with a clear notice', () => {
  assert.equal(describeDataMode({}).notice, null);
  assert.match(describeDataMode({ VITE_DATA_MODE: 'supabase' }).notice, /Faltan/);
  assert.equal(describeDataMode({ VITE_DATA_MODE: 'supabase', VITE_SUPABASE_URL: 'u', VITE_SUPABASE_PUBLISHABLE_KEY: 'k' }).active, 'demo');
});
