import { ArrowRight, BookOpen, CalendarDays, Clock3, HeartHandshake, MapPin, MapPinned, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { AvailableFriendsPanel } from '../components/AvailableFriendsPanel';
import { Badge, Button } from '../components/ui';
import { zoneLabel } from '../data/campus.ts';
import { ecuadorNow, fmt } from '../domain/time.ts';
import { useFriends } from '../hooks/useFriends';
import { useSchedule } from '../hooks/useSchedule';
import { calculate, days, useApp } from '../store';

const QUICK_LINKS = [
  { Icon: CalendarDays, title: 'Mi horario', subtitle: 'Organiza tu semana', to: '/horarios', color: 'pink' },
  { Icon: Users, title: 'Mis amigos', subtitle: 'Conecta con tu gente', to: '/amigos', color: 'purple' },
  { Icon: MapPinned, title: 'Dragon Map', subtitle: 'Explora el campus', to: '/mapa', color: 'mint' },
];

export function Dashboard() {
  const me = useApp(s => s.me)!;
  const invites = useApp(s => s.invites);
  const { entries, allBusy } = useSchedule();
  const { friendIds, accessOf } = useFriends();
  const nav = useNavigate();

  const { day: today, minutes } = ecuadorNow();
  const hour = minutes / 60;
  const todayClasses = entries.filter(e => e.day === today).sort((a, b) => a.start - b.start);
  const next = todayClasses.find(e => e.end > hour);
  const freeToday = today < 0 ? 0 : Math.max(0, 20 - Math.max(7, Math.min(20, hour))
    - todayClasses.reduce((n, e) => n + Math.max(0, e.end - Math.max(7, hour, e.start)), 0));

  const peers = friendIds.filter(id => accessOf(id).schedule).slice(0, 2);
  const upcoming = calculate(allBusy, [me.id, ...peers]).find(
    m => m.status === 'all' && m.end - m.start >= 0.5 && (m.day > today || (m.day === today && m.start >= hour)),
  );
  const myInvites = invites.filter(i => i.owner === me.id || me.id in i.responses).slice(-3);

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
        <div className="stat">
          <span className="stat-icon pink"><CalendarDays size={21} /></span>
          <div><small>Clases hoy</small><b>{todayClasses.length}</b><span>En tu horario</span></div>
        </div>
        <div className="stat">
          <span className="stat-icon mint"><Clock3 size={21} /></span>
          <div><small>Tiempo libre</small><b>{freeToday.toFixed(1)} h</b><span>07:00–20:00</span></div>
        </div>
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
              <b>{today < 0 ? 'Hoy no hay clases' : 'Sin más clases por hoy'}</b>
              <p>¡Aprovecha tu tiempo libre!</p>
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
                {[me.id, ...peers].map(id => <Avatar key={id} id={id} size={46} />)}
              </div>
              <h3>¡Tienen tiempo libre juntos!</h3>
              <p>{days[upcoming.day]} · {fmt(upcoming.start)} – {fmt(upcoming.end)}</p>
              <div className="match-duration"><Clock3 size={15} />{Math.round((upcoming.end - upcoming.start) * 60)} minutos para compartir</div>
              <Button onClick={() => nav('/match')}>Explorar coincidencias <ArrowRight size={16} /></Button>
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
                <small>{i.date} · {fmt(i.start)} · {zoneLabel(i.zone)}</small>
              </div>
              <Badge tone={i.cancelled ? 'rose' : 'green'}>
                {i.cancelled ? 'Cancelado' : i.owner === me.id ? 'Organizador' : i.responses[me.id]}
              </Badge>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
