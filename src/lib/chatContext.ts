import { CAMPUS_ZONES, zoneLabel } from '../data/campus.ts';
import { getFriendsOnCampusNow, isPresenceFresh } from '../domain/availability.ts';
import { fmt } from '../domain/time.ts';
import { calculate } from '../engine';
import { days, friendIdsOf, useApp } from '../store';

type State = ReturnType<typeof useApp.getState>;
type Clock = { day: number; minutes: number };

const MAX_GAPS_PER_FRIEND = 8;

/** Resume en texto SOLO lo que el usuario ya puede ver en la app (Supabase ya filtra con RLS). */
export function buildChatContext(s: State, clock: Clock): string {
  const me = s.me;
  if (!me) return '';
  const name = (id: string) => s.people[id]?.firstName ?? 'Amigo';
  const friendIds = friendIdsOf(s);
  const nowTs = Date.now();
  const out: string[] = [];

  // Momento actual
  const now = clock.day < 0 ? 'fin de semana' : days[clock.day];
  out.push(`Ahora: ${now}, ${fmt(clock.minutes / 60)} (hora de Ecuador). Clases de lunes a viernes, 07:00–20:00.`);

  // Perfil
  out.push(`\nUSUARIO: ${me.firstName}, ${me.career}, semestre ${me.semester}.`);
  out.push(me.onCampus && me.zone ? `Reportó estar en: ${zoneLabel(me.zone)}.` : 'No ha reportado estar en el campus.');

  // Clases propias
  out.push('\nMIS CLASES:');
  const mine = [...s.entries].sort((a, b) => a.day - b.day || a.start - b.start);
  if (!mine.length) out.push('- (sin clases registradas)');
  days.forEach((d, i) => {
    const list = mine.filter(e => e.day === i);
    if (list.length) out.push(`- ${d}: ` + list.map(e => `${fmt(e.start)}–${fmt(e.end)} ${e.title} (${e.code}, ${e.building} aula ${e.room})`).join('; '));
  });

  // Amigos y permisos
  out.push(`\nAMIGOS (${friendIds.length}):`);
  if (!friendIds.length) out.push('- (aún no tiene amigos)');
  for (const id of friendIds) {
    const a = s.access[id];
    const p = s.zones[id];
    const where = a?.location && isPresenceFresh(p, nowTs)
      ? `en ${zoneLabel(p.zone)} (reportado hace ${Math.round((nowTs - p.updatedAt) / 60000)} min)`
      : a?.location ? 'sin ubicación reciente' : 'no comparte ubicación';
    out.push(`- ${name(id)}: ${a?.schedule ? 'comparte horario' : 'NO comparte horario'}; ${where}.`);
  }

  // Horarios visibles de amigos
  const sharers = friendIds.filter(id => s.access[id]?.schedule);
  if (sharers.length) {
    out.push('\nHORARIOS DE AMIGOS (lo que comparten):');
    for (const id of sharers) {
      const list = s.friendEntries.filter(e => e.user === id).sort((a, b) => a.day - b.day || a.start - b.start);
      const text = days
        .map((d, i) => {
          const dayList = list.filter(e => e.day === i);
          return dayList.length
            ? `${d.slice(0, 3)} ` + dayList.map(e => `${fmt(e.start)}–${fmt(e.end)} ${e.busyOnly ? 'ocupado' : e.title ?? 'clase'}${e.building ? ` en ${e.building}` : ''}`).join(', ')
            : '';
        })
        .filter(Boolean)
        .join(' | ');
      out.push(`- ${name(id)}: ${text || 'sin clases registradas'}`);
    }

    // Tiempo libre en común (mismo cálculo que la página Match)
    out.push('\nTIEMPO LIBRE EN COMÚN (≥30 min, ambos sin clase):');
    const all = [...s.entries, ...s.friendEntries];
    for (const id of sharers) {
      const gaps = calculate(all, [me.id, id])
        .filter(b => b.status === 'all' && b.end - b.start >= 0.5)
        .slice(0, MAX_GAPS_PER_FRIEND)
        .map(b => `${days[b.day].slice(0, 3)} ${fmt(b.start)}–${fmt(b.end)}`);
      out.push(`- Con ${name(id)}: ${gaps.join(', ') || 'ninguno'}`);
    }
  }

  // Disponibles ahora
  const available = getFriendsOnCampusNow({ friendIds, access: s.access, zones: s.zones, entries: s.friendEntries, clock, nowTs });
  out.push(`\nEN CAMPUS Y SIN CLASE AHORA: ${available.map(f => `${name(f.id)} (${zoneLabel(f.zone)})`).join(', ') || 'nadie visible'}.`);

  // Solicitudes y encuentros
  const incoming = s.friendships.filter(f => f.status === 'pending' && f.addressee === me.id).length;
  if (incoming) out.push(`Solicitudes de amistad pendientes: ${incoming}.`);
  const invites = s.invites.filter(i => !i.cancelled && (i.owner === me.id || me.id in i.responses));
  if (invites.length) {
    out.push('\nENCUENTROS:');
    for (const i of invites.slice(-6)) {
      const role = i.owner === me.id ? 'organiza' : `respuesta: ${i.responses[me.id]}`;
      out.push(`- "${i.title}" ${i.date} ${fmt(i.start)}–${fmt(i.end)} en ${zoneLabel(i.zone)} (${role})`);
    }
  }

  out.push(`\nLUGARES DEL CAMPUS: ${CAMPUS_ZONES.map(z => z.label).join(', ')}.`);
  return out.join('\n');
}
