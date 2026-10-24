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
  const [hours, minutes] = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Guayaquil', hour: '2-digit', minute: '2-digit', hour12: false })
    .format(date)
    .split(':')
    .map(Number);
  return { day: WEEKDAYS[weekday] ?? -1, minutes: hours * 60 + minutes };
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
