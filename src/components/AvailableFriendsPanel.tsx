import { MapPin, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { zoneLabel } from '../data/campus.ts';
import { getFriendsOnCampusNow } from '../domain/availability.ts';
import { formatMinutes } from '../domain/time.ts';
import { useClock } from '../lib/useClock.ts';
import { days, useApp, users } from '../store';
import { Avatar, person } from './Avatar.tsx';

const ids = users.map(u => u.id);

export function AvailableFriendsPanel() {
  const s = useApp();
  const nav = useNavigate();
  const clock = useClock();
  const available = getFriendsOnCampusNow(s, s.current, ids, clock, clock.ts);

  return (
    <section className="panel">
      <div className="panel-top">
        <div>
          <span className="eyebrow">AHORA EN CAMPUS</span>
          <h2>Amigos sin clases y en campus ahora</h2>
        </div>
        {clock.simulated && <span className="badge gold">Simulación · {days[clock.day]} {formatMinutes(clock.minutes)}</span>}
      </div>
      {available.length ? (
        available.map(({ id, zone }) => (
          <div className="person-row" key={id}>
            <Avatar id={id} size={44} />
            <div className="person-info">
              <b>{person(id).name}</b>
              <small>
                <MapPin size={11} /> {zoneLabel(zone)} · zona general reportada
              </small>
            </div>
            <span className="badge green">Sin clases ahora</span>
            <button className="smallbutton primary" onClick={() => nav('/mapa')}>
              Ver mapa
            </button>
            <button className="smallbutton" onClick={() => nav('/match')}>
              Hacer Match
            </button>
          </div>
        ))
      ) : (
        <div className="empty">
          <UserCheck size={30} />
          <b>Ningún amigo comparte una coincidencia en campus ahora</b>
          <p>Aparecen quienes autorizaron horario y zona, están en campus y no tienen clase.</p>
        </div>
      )}
      <p className="muted small">Datos ficticios. «Sin clases» no significa tiempo libre personal.</p>
    </section>
  );
}
