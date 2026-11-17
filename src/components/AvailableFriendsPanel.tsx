import { useEffect, useRef, useState } from 'react';
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
        <button className="smallbutton" onClick={() => nav('/match', { state: { friends: [id] } })}>Match</button>
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
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  // Dots follow the scroll position, so it is obvious there are more cards to swipe.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const card = el.firstElementChild as HTMLElement | null;
      const step = card ? card.offsetWidth + 10 : el.clientWidth;
      const max = el.scrollWidth - el.clientWidth;
      const count = Math.max(1, Math.ceil(max / step) + 1);
      setPages(count);
      // The last cards cannot scroll to the left edge, so reaching the end selects the last dot.
      setPage(el.scrollLeft >= max - 2 ? count - 1 : Math.round(el.scrollLeft / step));
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    addEventListener('resize', measure);
    return () => { el.removeEventListener('scroll', measure); removeEventListener('resize', measure); };
  }, [available.length]);

  const goTo = (i: number) => {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  };

  return (
    <section className="panel now-panel">
      <div className="panel-top">
        <div>
          <span className="eyebrow">AHORA EN CAMPUS</span>
          <h2>Amigos sin clases y en campus</h2>
        </div>
        {clock.simulated
          ? <span className="badge gold">Simulación · {days[clock.day]} {formatMinutes(clock.minutes)}</span>
          : available.length > 0 && <span className="badge green">{available.length} {available.length === 1 ? 'amigo' : 'amigos'}</span>}
      </div>
      {available.length ? (
        <>
          <div className="now-carousel" ref={track}>
            {available.map(f => <FriendCard key={f.id} {...f} />)}
          </div>
          {pages > 1 && (
            <div className="now-dots" role="tablist" aria-label="Tarjetas de amigos en campus">
              {Array.from({ length: pages }, (_, i) => (
                <button key={i} role="tab" aria-selected={i === page} aria-label={`Ir a la tarjeta ${i + 1}`} className={i === page ? 'on' : ''} onClick={() => goTo(i)} />
              ))}
            </div>
          )}
        </>
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
