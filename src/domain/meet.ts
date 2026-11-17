/** Pure helpers for meets (encuentros): labels, readable dates and calendar export. */
import type { Invite, InviteResponse } from '../types';
import { toMinutes } from './time.ts';

export const RESPONSE_LABEL: Record<InviteResponse, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
};

const WEEKDAY = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTH = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-11-23" -> "lun 23 nov" (the date string is a calendar date; it never shifts with time zones). */
export function formatMeetDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAY[weekday]} ${d} ${MONTH[m - 1]}`;
}

/** Ecuador is UTC-5 all year (no daylight saving), so a local hour converts to UTC by adding 5 hours. */
const ECUADOR_OFFSET_MIN = 5 * 60;

function utcStamp(isoDate: string, decimalHours: number) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, 0, toMinutes(decimalHours) + ECUADOR_OFFSET_MIN));
  return t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

const escapeText = (text: string) => text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

/** An iCalendar (.ics) file for one meet, accepted by Google Calendar, Outlook and Apple Calendar. */
export function meetToIcs(invite: Pick<Invite, 'id' | 'title' | 'date' | 'start' | 'end'>, place: string, now = new Date()) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DragonMeet USFQ//Encuentros//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${invite.id}@dragonmeet`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${utcStamp(invite.date, invite.start)}`,
    `DTEND:${utcStamp(invite.date, invite.end)}`,
    `SUMMARY:${escapeText(invite.title)}`,
    `LOCATION:${escapeText(`${place} · USFQ Cumbayá`)}`,
    'DESCRIPTION:Encuentro creado en DragonMeet USFQ (prototipo académico).',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n';
}

/** A meet I already organize or accepted that overlaps the given slot (so the same plan is not created twice). */
export function clashingMeet(invites: Invite[], me: string, date: string, start: number, end: number) {
  return invites.find(i => !i.cancelled && i.date === date && (i.owner === me || i.responses[me] === 'accepted')
    && toMinutes(i.start) < toMinutes(end) && toMinutes(i.end) > toMinutes(start));
}
