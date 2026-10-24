import { MapPin, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { zoneLabel } from '../data/campus.ts';
import { getFriendsOnCampusNow } from '../domain/availability.ts';
import { formatMinutes } from '../domain/time.ts';
import { useFriends } from '../hooks/useFriends';
import { useClock } from '../lib/useClock';
import { days, useApp } from '../store';
import { Avatar, nameOf, usePerson } from './Avatar';
import { EmptyState } from './ui';

function FriendCard({ id, zone }: { id: string; zone: string }) {
  const nav = useNavigate();
  const person = usePerson(id);
  return (
    <article className="now-card">
      <Avatar id={id} size={44} />
      <b className="truncate">{nameOf(person)}</b>
      <small className="truncate">
        <MapPin size={11} /> {zoneLabel(zone)}
      </small>
      <span className="badge green">Sin clases ahora</span>
      <div className="now-actions">
        <button className="smallbutton primary" onClick={() => nav('/mapa')}>Ver mapa</button>
        <button className="smallbutton" onClick={() => nav('/match')}>Match</button>
      </div>
    </article>
  );
}

/** "Ahora en campus": a horizontal carousel, so names and zones never get squeezed into a narrow column. */
export function AvailableFriendsPanel() {
  const { friendIds } = useFriends();
  const access = useApp(s => s.access);
  const zones = useApp(s => s.zones);
  const entries = useApp(s => s.friendEntries);
  const clock = useClock();
  const available = getFriendsOnCampusNow({ friendIds, access, zones, entries, clock, nowTs: clock.ts });

  return (
    <section className="panel now-panel">
      <div className="panel-top">
        <div>
          <span className="eyebrow">AHORA EN CAMPUS</span>
          <h2>Amigos sin clases y en campus</h2>
        </div>
        {clock.simulated && <span className="badge gold">Simulación · {days[clock.day]} {formatMinutes(clock.minutes)}</span>}
      </div>
      {available.length ? (
        <div className="now-carousel">
          {available.map(f => <FriendCard key={f.id} {...f} />)}
        </div>
      ) : (
        <EmptyState
          icon={<UserCheck size={28} />}
          title="Nadie coincide en campus ahora"
          text="Aparecen amigos que comparten horario y zona, están en campus y no tienen clase."
        />
      )}
      <p className="muted small">«Sin clases» no significa tiempo libre personal.</p>
    </section>
  );
}
