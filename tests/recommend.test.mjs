import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendMatch } from '../src/domain/recommend.ts';

const cls = (user, day, start, end) => ({ user, day, start, end });
// Week: everyone busy all day except the gaps below (07:00-20:00 on weekdays).
const busyAllWeek = users => users.flatMap(u => [0, 1, 2, 3, 4].map(d => cls(u, d, 7, 20)));

test('no friends with shared schedule -> no recommendation', () => {
  assert.equal(recommendMatch([], 'me', [], { day: 0, minutes: 600 }), null);
});

test('picks the soonest shared slot from now, with every friend free in it', () => {
  const busy = [cls('me', 0, 7, 12), cls('vale', 0, 7, 12), cls('paulo', 0, 7, 13)];
  const r = recommendMatch(busy, 'me', ['vale', 'paulo'], { day: 0, minutes: 9 * 60 });
  assert.deepEqual([r.day, r.start, r.end, r.friends, r.now, r.nextWeek], [0, 12, 13, ['vale'], false, false]);
});

test('a slot already running counts only what is left of it (30 min minimum)', () => {
  const busy = [cls('me', 0, 7, 10), cls('vale', 0, 7, 10), cls('me', 0, 11, 20), cls('vale', 0, 11, 20)];
  const r = recommendMatch(busy, 'me', ['vale'], { day: 0, minutes: 10 * 60 + 15 });
  assert.deepEqual([r.start, r.end, r.now], [10.25, 11, true]);
  assert.equal(recommendMatch(busy, 'me', ['vale'], { day: 0, minutes: 10 * 60 + 40 })?.day, 1, 'only 20 min left -> next day');
});

test('after the last shared slot of the week it wraps to next week; weekends start on Monday', () => {
  const busy = [...busyAllWeek(['me', 'vale']).filter(c => c.day !== 0), cls('me', 0, 7, 9), cls('vale', 0, 7, 9), cls('me', 0, 10, 20), cls('vale', 0, 10, 20)];
  const friday = recommendMatch(busy, 'me', ['vale'], { day: 4, minutes: 8 * 60 });
  assert.deepEqual([friday.day, friday.start, friday.nextWeek], [0, 9, true]);
  const weekend = recommendMatch(busy, 'me', ['vale'], { day: -1, minutes: 12 * 60 });
  assert.deepEqual([weekend.day, weekend.start, weekend.nextWeek], [0, 9, false]);
});

test('I must be free: a slot where only friends are free is never recommended', () => {
  const busy = [cls('me', 0, 7, 20), cls('me', 1, 7, 20), cls('me', 2, 7, 20), cls('me', 3, 7, 20), cls('me', 4, 7, 20)];
  assert.equal(recommendMatch(busy, 'me', ['vale', 'paulo'], { day: 0, minutes: 420 }), null);
});
