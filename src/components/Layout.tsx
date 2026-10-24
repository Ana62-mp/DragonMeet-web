import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, ChevronRight, HeartHandshake, Home, MapPinned, Menu, UserRound, Users } from 'lucide-react';
import { useApp } from '../store';
import { Avatar } from './Avatar';
import { Badge, PageSkeleton, Toaster } from './ui';

const links = [
  { to: '/', label: 'Inicio', Icon: Home },
  { to: '/horarios', label: 'Horario', Icon: CalendarDays },
  { to: '/match', label: 'Match', Icon: HeartHandshake },
  { to: '/mapa', label: 'Mapa', Icon: MapPinned },
  { to: '/perfil', label: 'Perfil', Icon: UserRound },
];

export function Brand() {
  return (
    <div className="brand">
      <div className="brand-icon">✦</div>
      <span>
        DRAGON<span className="brand-light">MEET</span>
        <small>USFQ · PROTOTIPO</small>
      </span>
    </div>
  );
}

const REFRESH_MS = 60_000;

/** Keeps data fresh without a manual reload: on tab focus and once a minute while visible. */
function useAutoRefresh() {
  const refresh = useApp(s => s.refresh);
  useEffect(() => {
    const run = () => document.visibilityState === 'visible' && refresh().catch(() => undefined);
    const id = setInterval(run, REFRESH_MS);
    document.addEventListener('visibilitychange', run);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', run);
    };
  }, [refresh]);
}

export function Layout({ children }: { children: ReactNode }) {
  const me = useApp(s => s.me);
  const loaded = useApp(s => s.loaded);
  const loadError = useApp(s => s.loadError);
  const refresh = useApp(s => s.refresh);
  const incoming = useApp(s => s.friendships.filter(f => f.status === 'pending' && f.addressee === s.me?.id).length);
  const nav = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  useAutoRefresh();

  return (
    <div className="layout">
      <aside className={'sidebar ' + (showMenu ? 'open' : '')}>
        <Brand />
        <div className="side-label">TU ESPACIO</div>
        <nav>
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setShowMenu(false)} className={({ isActive }) => 'navlink ' + (isActive ? 'active' : '')}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
          <NavLink to="/amigos" className={({ isActive }) => 'navlink ' + (isActive ? 'active' : '')} onClick={() => setShowMenu(false)}>
            <Users size={19} />
            Amigos
            {incoming > 0 && <i>{incoming}</i>}
          </NavLink>
        </nav>
        <div className="side-bottom">
          <button className="profile-shortcut" onClick={() => nav('/perfil')}>
            {me && <Avatar id={me.id} />}
            <span>
              <b>{me?.firstName}</b>
              <small>Ver perfil</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="workarea">
        <header className="topbar">
          <button className="iconbutton menubtn" onClick={() => setShowMenu(!showMenu)} aria-label="Abrir menú">
            <Menu size={22} />
          </button>
          <div className="topbar-left">
            <span className="crumb">DragonMeet</span>
            <ChevronRight size={14} />
            <span className="topbar-sub">Campus Cumbayá</span>
          </div>
          <div className="topbar-actions">
            <Badge tone="rose">Prototipo académico</Badge>
            <button className="iconbutton" onClick={() => nav('/amigos')} aria-label="Solicitudes">
              <Bell size={20} />
              {incoming > 0 && <span className="notif" />}
            </button>
            <button className="avatar-button" onClick={() => nav('/perfil')} aria-label="Perfil">
              {me && <Avatar id={me.id} size={35} />}
            </button>
          </div>
        </header>
        <main className="main">
          {loadError && !loaded ? (
            <div className="empty large">
              <b>No pudimos cargar tus datos</b>
              <p>{loadError}</p>
              <button className="btn" onClick={() => refresh()}>Reintentar</button>
            </div>
          ) : loaded ? children : <PageSkeleton />}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Navegación principal">
        {links.map(({ to, label, Icon }) => (
          <NavLink to={to} end={to === '/'} key={to} className={({ isActive }) => (isActive ? 'selected' : '')}>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <Toaster />
    </div>
  );
}
