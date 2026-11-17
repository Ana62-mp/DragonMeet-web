import { ArrowRight, BookOpen, CalendarDays, Clock3, HeartHandshake, MapPin, MapPinned, Sun, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { AvailableFriendsPanel } from '../components/AvailableFriendsPanel';
import { Badge, Button } from '../components/ui';
import { zoneLabel } from '../data/campus.ts';
import { RESPONSE_LABEL, formatMeetDate } from '../domain/meet.ts';
import { dayLoad, formatDuration } from '../domain/schedule.ts';
import { DAY_END_MIN, DAY_START_MIN, fmt, isUpcoming } from '../domain/time.ts';
import { useFriends } from '../hooks/useFriends';
import { useSchedule } from '../hooks/useSchedule';
import { useClock } from '../lib/useClock';
import { days, useApp } from '../store';
import { recommendMatch } from '../domain/recommend.ts';

const QUICK_LINKS = [
  { Icon: CalendarDays, title: 'Mi horario', subtitle: 'Organiza tu semana', to: '/horarios', color: 'pink' },
  { Icon: Users, title: 'Mis amigos', subtitle: 'Conecta con tu gente', to: '/amigos', color: 'purple' },
  { Icon: MapPinned, title: 'Dragon Map', subtitle: 'Explora el campus', to: '/mapa', color: 'mint' },
];

export function Dashboard() {
  const me = useApp(s => s.me)!;
  const invites = useApp(s => s.invites);
  const people = useApp(s => s.people);
  const { entries, allBusy } = useSchedule();
  const { friendIds, accessOf } = useFriends();
  const nav = useNavigate();

  const { day: today, minutes } = useClock();   // honours Perfil > Simular día y hora
  const weekend = today < 0;
  const hour = minutes / 60;
  const todayClasses = entries.filter(e => e.day === today).sort((a, b) => a.start - b.start);
  const next = todayClasses.find(e => e.end > hour);
  const total = dayLoad(entries, today);
  const left = dayLoad(entries, today, minutes);
  const inWindow = !weekend && minutes >= DAY_START_MIN && minutes < DAY_END_MIN;
  const hoursLabel = (min: number) => `${+(min / 60).toFixed(1)} h`;

  const upcoming = recommendMatch(allBusy, me.id, friendIds.filter(id => accessOf(id).schedule), { day: today, minutes });
  const whenLabel = upcoming && (upcoming.now ? 'Ahora mismo'
    : upcoming.day === today && !upcoming.nextWeek ? 'Hoy'
    : upcoming.day === today + 1 && !upcoming.nextWeek ? 'Mañana'
    : `${days[upcoming.day]}${upcoming.nextWeek ? ' (próxima semana)' : ''}`);
  const together = upcoming ? upcoming.friends.map(id => people[id]?.firstName ?? 'Estudiante') : [];
  const togetherLabel = together.length > 1 ? `${together.slice(0, -1).join(', ')} y ${together[together.length - 1]}` : together[0];
  const myInvites = invites
    .filter(i => !i.cancelled && i.responses[me.id] !== 'rejected' && (i.owner === me.id || me.id in i.responses) && isUpcoming(i.date, i.end))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)
    .slice(0, 3);

  return (
    <>
      <div className="hero">
        <div>
          <div className="hero-kicker">✦ TU CAMPUS, TUS CONEXIONES</div>
          <h1>¡Hola, {me.firstName}! <span>👋</span></h1>
          <p>Hoy puede ser un gran día para conectar.<br />¿Con quién hacemos match?</p>
          <button onClick={() => nav('/match')} className="hero-button">
            Encontrar un Match <ArrowRight size={18} />
          </button>
        </div>
        <div className="hero-art">
          {friendIds.slice(0, 3).map((id, i) => (
            <div key={id} className={`orbit orbit-${['one', 'two', 'three'][i]}`}><Avatar id={id} size={i === 2 ? 48 : 54} /></div>
          ))}
          <div className="hero-circle">✦</div>
          <div className="hero-mini">✳ Conectados en campus</div>
        </div>
      </div>

      <div className="stats">
        {weekend ? (
          <div className="stat weekend">
            <span className="stat-icon mint"><Sun size={21} /></span>
            <div><small>Fin de semana</small><b>Sin clases</b><span>Disfruta tu descanso</span></div>
          </div>
        ) : (
          <>
            <div className="stat">
              <span className="stat-icon pink"><CalendarDays size={21} /></span>
              <div><small>Clases hoy</small><b>{todayClasses.length}</b><span>{total.classMin ? `${formatDuration(total.classMin)} de clase` : 'En tu horario'}</span></div>
            </div>
            <div className="stat">
              <span className="stat-icon mint"><Clock3 size={21} /></span>
              <div><small>Tiempo libre</small><b>{hoursLabel(total.freeMin)}</b><span>{inWindow ? `Quedan ${hoursLabel(left.freeMin)}` : '07:00–20:00'}</span></div>
            </div>
          </>
        )}
        <div className="stat">
          <span className="stat-icon purple"><Users size={21} /></span>
          <div><small>Amigos</small><b>{friendIds.length}</b><span>En tu red</span></div>
        </div>
      </div>

      <AvailableFriendsPanel />

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-top">
            <div><span className="eyebrow">TU DÍA</span><h2>Próxima clase</h2></div>
            <button className="textlink" onClick={() => nav('/horarios')}>Ver horario <ArrowRight size={15} /></button>
          </div>
          {next ? (
            <div className="next-class">
              <div className="class-hour">{fmt(next.start)} <span>— {fmt(next.end)}</span></div>
              <h3>{next.title}</h3>
              <p>{next.code}</p>
              <div className="class-location"><MapPin size={17} />{next.building} · Aula {next.room}</div>
            </div>
          ) : (
            <div className="empty">
              <BookOpen size={32} />
              <b>{weekend ? 'Es fin de semana' : 'Sin más clases por hoy'}</b>
              <p>{weekend ? 'No hay clases hasta el lunes. ¡A descansar!' : '¡Aprovecha tu tiempo libre!'}</p>
            </div>
          )}
        </section>
        <section className="panel match-panel">
          <div className="panel-top">
            <div><span className="eyebrow">CONEXIONES</span><h2>Match recomendado</h2></div>
            <Badge tone="green">✦ En común</Badge>
          </div>
          {upcoming ? (
            <>
              <div className="match-avatars">
                {[me.id, ...upcoming.friends].map(id => <Avatar key={id} id={id} size={46} />)}
              </div>
              <h3>Tú y {togetherLabel} están libres</h3>
              <p>{whenLabel} · {upcoming.now ? `hasta las ${fmt(upcoming.end)}` : `${fmt(upcoming.start)} – ${fmt(upcoming.end)}`}</p>
              <div className="match-duration"><Clock3 size={15} />{formatDuration(Math.round((upcoming.end - upcoming.start) * 60))} para compartir</div>
              <Button onClick={() => nav('/match', { state: { friends: upcoming.friends } })}>Ver en Match <ArrowRight size={16} /></Button>
            </>
          ) : (
            <div className="empty">
              <HeartHandshake size={34} />
              <b>Encuentra tu próximo Match</b>
              <p>Compara tus horarios con tus amigos.</p>
              <Button onClick={() => nav('/match')}>Comparar horarios</Button>
            </div>
          )}
        </section>
      </div>

      <div className="quick-grid">
        {QUICK_LINKS.map(q => (
          <button className="quick" key={q.title} onClick={() => nav(q.to)}>
            <span className={'stat-icon ' + q.color}><q.Icon size={21} /></span>
            <b>{q.title}</b>
            <small>{q.subtitle}</small>
            <ArrowRight className="quick-arrow" size={16} />
          </button>
        ))}
      </div>

      {myInvites.length > 0 && (
        <section className="panel invitations-home">
          <div className="panel-top"><h2>Tus encuentros</h2><Badge>Próximos</Badge></div>
          {myInvites.map(i => (
            <div key={i.id} className="invitation-row">
              <CalendarDays size={19} />
              <div>
                <b>{i.title}</b>
                <small>{formatMeetDate(i.date)} · {fmt(i.start)} · {zoneLabel(i.zone)}</small>
              </div>
              <Badge tone={i.owner === me.id || i.responses[me.id] === 'accepted' ? 'green' : 'gold'}>
                {i.owner === me.id ? 'Organizador' : RESPONSE_LABEL[i.responses[me.id]]}
              </Badge>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
