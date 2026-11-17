import test from 'node:test';
import assert from 'node:assert/strict';
import { RESPONSE_LABEL, formatMeetDate, meetToIcs } from '../src/domain/meet.ts';

test('meet dates read in Spanish and never shift with the time zone', () => {
  assert.equal(formatMeetDate('2026-11-23'), 'lun 23 nov');
  assert.equal(formatMeetDate('2026-01-02'), 'vie 2 ene');
  assert.deepEqual(Object.values(RESPONSE_LABEL), ['Pendiente', 'Aceptado', 'Rechazado']);
});

test('.ics export: Ecuador hours as UTC (UTC-5), escaped text, CRLF lines', () => {
  const ics = meetToIcs({ id: 'abc', title: 'Almuerzo, con; amigos', date: '2026-11-23', start: 12.5, end: 13.75 }, 'Da Vinci', new Date('2026-11-16T23:00:00Z'));
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /\r\nDTSTART:20261123T173000Z\r\n/);
  assert.match(ics, /\r\nDTEND:20261123T184500Z\r\n/);
  assert.ok(ics.includes(String.raw`SUMMARY:Almuerzo\, con\; amigos` + '\r\n'));
  assert.match(ics, /\r\nUID:abc@dragonmeet\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  // late evening in Ecuador is already the next day in UTC
  assert.match(meetToIcs({ id: 'x', title: 't', date: '2026-11-23', start: 19.5, end: 20 }, 'z'), /DTSTART:20261124T003000Z/);
});

test('a new meet cannot overlap one I organize or accepted; cancelled or rejected ones do not count', async () => {
  const { clashingMeet } = await import('../src/domain/meet.ts');
  const base = { id: '1', owner: 'ana', title: 'Café', date: '2026-11-23', day: 0, start: 9.5, end: 10, zone: 'z', cancelled: false, responses: { vale: 'accepted', paulo: 'rejected' } };
  assert.equal(clashingMeet([base], 'ana', '2026-11-23', 9.5, 10)?.id, '1');
  assert.equal(clashingMeet([base], 'vale', '2026-11-23', 9, 9.75)?.id, '1');
  assert.equal(clashingMeet([base], 'paulo', '2026-11-23', 9.5, 10), undefined);
  assert.equal(clashingMeet([base], 'ana', '2026-11-23', 10, 11), undefined, 'touching slots do not clash');
  assert.equal(clashingMeet([base], 'ana', '2026-11-30', 9.5, 10), undefined);
  assert.equal(clashingMeet([{ ...base, cancelled: true }], 'ana', '2026-11-23', 9.5, 10), undefined);
});
