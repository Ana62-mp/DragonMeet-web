/** "Match recomendado": the next free slot I share with the most friends, looking ahead a full week. */
import { calculate } from '../engine.ts';
import type { Entry } from '../types';
import { toMinutes } from './time.ts';

export type Recommendation = {
  day: number;
  start: number;
  end: number;
  /** Friends free with me (never includes me). */
  friends: string[];
  /** The slot is already running now. */
  now: boolean;
  /** The slot falls next week (today's chances already passed). */
  nextWeek: boolean;
};

const MIN_MINUTES = 30;
const MAX_PARTICIPANTS = 5;

/**
 * Considers every friend whose schedule I may see (the caller authorizes them), at most 4 at a time as in Match.
 * Picks the soonest slot from `now` where I and at least one friend are free for 30+ minutes (counting only what is
 * left of a slot already running); among equally soon slots, the one with more friends wins. Wraps to next week.
 * `now.day` is 0 = Monday ... 4 = Friday, or -1 on weekends (then the search starts on Monday).
 */
export function recommendMatch(busy: Pick<Entry, 'user' | 'day' | 'start' | 'end'>[], me: string, friends: string[], now: { day: number; minutes: number }) {
  const group = friends.slice(0, MAX_PARTICIPANTS - 1);
  if (!group.length) return null;
  const today = now.day < 0 ? -1 : now.day;
  let best: (Recommendation & { order: number }) | null = null;

  for (const block of calculate(busy, [me, ...group])) {
    if (!block.free.includes(me) || block.free.length < 2) continue;
    const startMin = toMinutes(block.start);
    const endMin = toMinutes(block.end);
    const running = block.day === today && startMin <= now.minutes && endMin > now.minutes;
    const passed = today >= 0 && (block.day < today || (block.day === today && startMin < now.minutes && !running));
    const from = running ? now.minutes : startMin;
    if (endMin - from < MIN_MINUTES) continue;
    const order = (passed ? 5 : 0) * 24 * 60 + block.day * 24 * 60 + from;
    const friendsFree = block.free.filter(id => id !== me);
    if (!best || order < best.order || (order === best.order && friendsFree.length > best.friends.length)) {
      best = { day: block.day, start: from / 60, end: block.end, friends: friendsFree, now: running, nextWeek: passed, order };
    }
  }
  if (!best) return null;
  const { day, start, end, friends: free, now: running, nextWeek } = best;
  return { day, start, end, friends: free, now: running, nextWeek } satisfies Recommendation;
}
