/** Hours are stored as decimals (9.5 = 09:30); minutes are the exact unit used for logic. */
export const DAY_START_MIN = 7 * 60;
export const DAY_END_MIN = 20 * 60;

export const toMinutes = (decimalHours: number) => Math.round(decimalHours * 60);
export const fromMinutes = (totalMinutes: number) => totalMinutes / 60;

const pad = (n: number) => String(n).padStart(2, '0');

export const formatMinutes = (totalMinutes: number) => `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
export const fmt = (decimalHours: number) => formatMinutes(toMinutes(decimalHours));

/** Valid class range: 07:00 <= start < end <= 20:00 (minutes). */
export const isValidRange = (startMin: number, endMin: number) =>
  startMin >= DAY_START_MIN && endMin <= DAY_END_MIN && startMin < endMin;

export const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && aEnd > bStart;

const WEEKDAYS: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };

/** Current day (0 = Monday ... 4 = Friday, -1 on weekends) and minute of day in Ecuador. */
export function ecuadorNow(date = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Guayaquil', weekday: 'short' }).format(date);
  const [hours, minutes] = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(date)
    .split(':')
    .map(Number);
  return { day: WEEKDAYS[weekday] ?? -1, minutes: hours * 60 + minutes };
}

/** Today's calendar date in Ecuador as ISO "YYYY-MM-DD" (never shifted by UTC). */
export const ecuadorDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

/** True while a meet (ISO date + decimal end hour) has not finished yet, in Ecuador time. */
export function isUpcoming(isoDate: string, endHours: number, now = new Date()) {
  const today = ecuadorDate(now);
  return isoDate > today || (isoDate === today && toMinutes(endHours) > ecuadorNow(now).minutes);
}

/** Next ISO date (Ecuador) on the given weekday (0 = Monday) whose start time has not passed yet. */
export function nextDateFor(day: number, startHours: number, now = new Date()) {
  const d = new Date(`${ecuadorDate(now)}T12:00:00Z`);
  let add = (day - (d.getUTCDay() + 6) % 7 + 7) % 7;
  if (add === 0 && ecuadorNow(now).minutes >= toMinutes(startHours)) add = 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

/** Parses "HH:MM" (24 h) into minutes, or null when the text is not a valid time. */
export function parseTime(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const [hours, minutes] = [Number(match[1]), Number(match[2])];
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

/** Postgres `time` ("09:30:00") ⇄ decimal hours (9.5). */
export const fromPgTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return fromMinutes(hours * 60 + minutes);
};
export const toPgTime = (decimalHours: number) => `${formatMinutes(toMinutes(decimalHours))}:00`;
