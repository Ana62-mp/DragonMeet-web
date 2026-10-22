import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  Home,
  CalendarDays,
  HeartHandshake,
  MapPinned,
  UserRound,
  Users,
  LogOut,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  Trash2,
  Search,
  ShieldCheck,
  Bell,
  Check,
  X,
  ArrowRight,
  GraduationCap,
  Menu,
  Settings2,
  RotateCcw,
  Send,
  CalendarPlus,
  LockKeyhole,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import {
  useApp,
  users,
  days,
  zones,
  fmt,
  calculate,
  canView,
  isFriend,
  type Entry,
  type Invite,
} from "./store";
import "./style.css";
const person = (id: string) => users.find((u) => u.id === id)!;
const dayNow = () => {
  const d = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guayaquil",
    weekday: "short",
  }).format(new Date());
  return { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 }[d as "Mon"] ?? -1;
};
const nowHour = () => {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Guayaquil",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .split(":")
    .map(Number);
  return p[0] + p[1] / 60;
};
function Avatar({ id, size = 42 }: { id: string; size?: number }) {
  const u = person(id);
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: u.color + "18",
        color: u.color,
        borderColor: u.color + "28",
        fontSize: size * 0.31,
      }}
    >
      {u.initials}
    </span>
  );
}
function Brand() {
  return (
    <div className="brand">
      <div className="brand-icon">✦</div>
      <span>
        DRAGON<span className="brand-light">MATCH</span>
        <small>USFQ · WEB DEMO</small>
      </span>
    </div>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={"btn " + (secondary ? "secondary" : "")}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
const links = [
  { to: "/", label: "Inicio", Icon: Home },
  { to: "/horarios", label: "Horarios", Icon: CalendarDays },
  { to: "/match", label: "Match", Icon: HeartHandshake },
  { to: "/mapa", label: "Mapa", Icon: MapPinned },
  { to: "/perfil", label: "Perfil", Icon: UserRound },
];
function Layout({ children }: { children: React.ReactNode }) {
  const s = useApp();
  const nav = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div className="layout">
      <aside className={"sidebar " + (showMenu ? "open" : "")}>
        <Brand />
        <div className="side-label">TU ESPACIO</div>
        <nav>
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setShowMenu(false)}
              className={({ isActive }) =>
                "navlink " + (isActive ? "active" : "")
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/amigos"
            className={({ isActive }) =>
              "navlink " + (isActive ? "active" : "")
            }
            onClick={() => setShowMenu(false)}
          >
            <Users size={19} />
            Amigos
            {s.requests.filter((r) => r.to === s.current).length > 0 && (
              <i>{s.requests.filter((r) => r.to === s.current).length}</i>
            )}
          </NavLink>
        </nav>
        <div className="side-bottom">
          <div className="demo-label">
            <span className="pulse-dot" /> Modo demostración
          </div>
          <button className="profile-shortcut" onClick={() => nav("/perfil")}>
            <Avatar id={s.current} />
            <span>
              <b>{person(s.current).name}</b>
              <small>Ver perfil</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="workarea">
        <header className="topbar">
          <button
            className="iconbutton menubtn"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <div className="topbar-left">
            <span className="crumb">Dragon Match</span>
            <ChevronRight size={14} />
            <span className="topbar-sub">Campus Cumbayá</span>
          </div>
          <div className="topbar-actions">
            <Badge tone="rose">● Demo interactiva</Badge>
            <button
              className="iconbutton"
              onClick={() => nav("/amigos")}
              aria-label="Solicitudes"
            >
              <Bell size={20} />
              {s.requests.some((r) => r.to === s.current) && (
                <span className="notif" />
              )}
            </button>
            <button className="avatar-button" onClick={() => nav("/perfil")}>
              <Avatar id={s.current} size={35} />
            </button>
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
      <nav className="mobile-nav">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            to={to}
            end={to === "/"}
            key={to}
            className={({ isActive }) => (isActive ? "selected" : "")}
          >
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
function Login() {
  const login = useApp((s) => s.login);
  return (
    <div className="login">
      <div className="login-left">
        <Brand />
        <div className="login-copy">
          <Badge tone="light">🐉 HECHO PARA DRAGONES</Badge>
          <h1>
            Haz match con
            <br />
            <em>tu tiempo.</em>
          </h1>
          <p>
            Las mejores conexiones nacen cuando encuentras un momento en común.
            Descubre cuándo coincides con tus amigos de la U.
          </p>
          <div className="feature">
            <span>01</span>Compara horarios sin complicaciones
          </div>
          <div className="feature">
            <span>02</span>Encuentra tiempo libre juntos
          </div>
          <div className="feature">
            <span>03</span>Conecta en el campus, con privacidad
          </div>
        </div>
        <small className="login-footer">
          Match your time. Find your people.
        </small>
      </div>
      <div className="login-right">
        <div className="login-card">
          <div className="welcome-icon">✦</div>
          <h2>
            ¡Bienvenido a<br />
            Dragon Match!
          </h2>
          <p>Tu vida universitaria, mejor conectada.</p>
          <button
            className="microsoft"
            disabled
            title="Requiere autorización y configuración institucional"
          >
            <span className="ms-grid">▦</span> Continuar con Microsoft 365{" "}
            <LockKeyhole size={15} />
          </button>
          <div className="separator">O EXPLORA EL PROTOTIPO</div>
          <Button onClick={login}>
            Entrar al modo demo <ArrowRight size={18} />
          </Button>
          <p className="muted small center">
            Acceso con Ana · Datos ficticios · Sin credenciales
          </p>
          <div className="secure">
            <ShieldCheck size={19} /> Tu privacidad siempre está bajo tu
            control.
          </div>
        </div>
      </div>
    </div>
  );
}
function Heading({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      {action}
    </div>
  );
}
function Dashboard() {
  const s = useApp();
  const nav = useNavigate();
  const today = dayNow();
  const hour = nowHour();
  const todayClasses = s.entries
    .filter((e) => e.user === s.current && e.day === today)
    .sort((a, b) => a.start - b.start);
  const next = todayClasses.find((e) => e.end > hour);
  const free =
    today < 0
      ? 0
      : Math.max(
          0,
          20 -
            Math.max(7, Math.min(20, hour)) -
            todayClasses.reduce(
              (n, e) => n + Math.max(0, e.end - Math.max(7, hour, e.start)),
              0,
            ),
        );
  const peers = users.filter(
    (u) =>
      isFriend(s, s.current, u.id) && canView(s, s.current, u.id, "schedule"),
  );
  const upcoming = calculate(s.entries, [
    s.current,
    ...peers.slice(0, 2).map((p) => p.id),
  ]).find(
    (m) =>
      m.status === "all" &&
      m.end - m.start >= 0.5 &&
      (m.day > today || (m.day === today && m.start >= hour)),
  );
  return (
    <>
      <div className="hero">
        <div>
          <div className="hero-kicker">✦ TU CAMPUS, TUS CONEXIONES</div>
          <h1>
            ¡Hola, {person(s.current).name}! <span>👋</span>
          </h1>
          <p>
            Hoy puede ser un gran día para conectar.
            <br />
            ¿Con quién hacemos match?
          </p>
          <button onClick={() => nav("/match")} className="hero-button">
            Encontrar un Match <ArrowRight size={18} />
          </button>
        </div>
        <div className="hero-art">
          <div className="orbit orbit-one">
            <Avatar id="vale" size={54} />
          </div>
          <div className="orbit orbit-two">
            <Avatar id="paulo" size={54} />
          </div>
          <div className="orbit orbit-three">
            <Avatar id="sofia" size={48} />
          </div>
          <div className="hero-circle">✦</div>
          <div className="hero-mini">✳ Conectados en campus</div>
        </div>
      </div>
      <div className="stats">
        <div className="stat">
          <span className="stat-icon pink">
            <CalendarDays size={21} />
          </span>
          <div>
            <small>Clases hoy</small>
            <b>{todayClasses.length}</b>
            <span>En tu horario</span>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon mint">
            <Clock3 size={21} />
          </span>
          <div>
            <small>Tiempo libre restante</small>
            <b>{free.toFixed(1)} h</b>
            <span>Entre 07:00 y 20:00</span>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon purple">
            <Users size={21} />
          </span>
          <div>
            <small>Amigos conectados</small>
            <b>{users.filter((u) => isFriend(s, s.current, u.id)).length}</b>
            <span>En tu red</span>
          </div>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-top">
            <div>
              <span className="eyebrow">TU DÍA</span>
              <h2>Próxima clase</h2>
            </div>
            <button className="textlink" onClick={() => nav("/horarios")}>
              Ver horario <ArrowRight size={15} />
            </button>
          </div>
          {next ? (
            <div className="next-class">
              <div className="class-hour">
                {fmt(next.start)} <span>— {fmt(next.end)}</span>
              </div>
              <h3>{next.title}</h3>
              <p>{next.code}</p>
              <div className="class-location">
                <MapPin size={17} />
                {next.building} · Aula {next.room}
              </div>
            </div>
          ) : (
            <div className="empty">
              <BookOpen size={32} />
              <b>Sin más clases por hoy</b>
              <p>¡Aprovecha tu tiempo libre!</p>
            </div>
          )}
        </section>
        <section className="panel match-panel">
          <div className="panel-top">
            <div>
              <span className="eyebrow">CONEXIONES</span>
              <h2>Match recomendado</h2>
            </div>
            <Badge tone="green">✦ En común</Badge>
          </div>
          {upcoming ? (
            <>
              <div className="match-avatars">
                {[s.current, ...peers.slice(0, 2).map((p) => p.id)].map(
                  (id) => (
                    <Avatar key={id} id={id} size={46} />
                  ),
                )}
              </div>
              <h3>¡Tienen tiempo libre juntos!</h3>
              <p>
                {days[upcoming.day]} · {fmt(upcoming.start)} –{" "}
                {fmt(upcoming.end)}
              </p>
              <div className="match-duration">
                <Clock3 size={15} />
                {Math.round((upcoming.end - upcoming.start) * 60)} minutos para
                compartir
              </div>
              <Button onClick={() => nav("/match")}>
                Explorar coincidencias <ArrowRight size={16} />
              </Button>
            </>
          ) : (
            <div className="empty">
              <HeartHandshake size={34} />
              <b>Encuentra tu próximo Match</b>
              <p>Compara tus horarios con tus amigos.</p>
              <Button onClick={() => nav("/match")}>Comparar horarios</Button>
            </div>
          )}
        </section>
      </div>
      <h2 className="section-title">Explora Dragon Match</h2>
      <div className="quick-grid">
        {[
          {
            Icon: CalendarDays,
            title: "Mi horario",
            subtitle: "Organiza tu semana",
            to: "/horarios",
            color: "pink",
          },
          {
            Icon: Users,
            title: "Mis amigos",
            subtitle: "Conecta con tu gente",
            to: "/amigos",
            color: "purple",
          },
          {
            Icon: MapPinned,
            title: "Dragon Map",
            subtitle: "Explora el campus",
            to: "/mapa",
            color: "mint",
          },
        ].map((q) => (
          <button className="quick" key={q.title} onClick={() => nav(q.to)}>
            <span className={"stat-icon " + q.color}>
              <q.Icon size={21} />
            </span>
            <b>{q.title}</b>
            <small>{q.subtitle}</small>
            <ArrowRight className="quick-arrow" size={16} />
          </button>
        ))}
      </div>
      {s.invites.some((i) => i.participants.includes(s.current)) && (
        <section className="panel invitations-home">
          <div className="panel-top">
            <h2>Tus encuentros</h2>
            <Badge>Invitaciones demo</Badge>
          </div>
          {s.invites
            .filter((i) => i.participants.includes(s.current))
            .slice(-3)
            .map((i) => (
              <div key={i.id} className="invitation-row">
                <CalendarDays size={19} />
                <div>
                  <b>{i.title}</b>
                  <small>
                    {i.date} · {fmt(i.start)} · {i.zone}
                  </small>
                </div>
                <Badge tone={i.cancelled ? "rose" : "green"}>
                  {i.cancelled
                    ? "Cancelado"
                    : (i.responses[s.current] ?? "Organizador")}
                </Badge>
              </div>
            ))}
        </section>
      )}
    </>
  );
}
function Schedule() {
  const s = useApp();
  const [day, setDay] = useState(Math.max(dayNow(), 0));
  const [edit, setEdit] = useState<Entry | null>(null);
  const [open, setOpen] = useState(false);
  const currentEntries = s.entries.filter((e) => e.user === s.current);
  const [error, setError] = useState("");
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const start = Number(f.get("start"));
    const end = Number(f.get("end"));
    const d = Number(f.get("day"));
    if (start < 7 || end > 20 || end <= start) {
      setError("Utiliza horas válidas entre 07:00 y 20:00.");
      return;
    }
    if (
      currentEntries.some(
        (x) =>
          x.id !== edit?.id && x.day === d && x.start < end && x.end > start,
      )
    ) {
      setError("Este bloque se superpone con otra clase.");
      return;
    }
    const entry: Entry = {
      id: edit?.id ?? crypto.randomUUID(),
      user: s.current,
      title: String(f.get("title")),
      code: String(f.get("code")),
      day: d,
      start,
      end,
      building: String(f.get("building")),
      room: String(f.get("room")),
    };
    s.addEntry(entry);
    setOpen(false);
    setEdit(null);
    setError("");
  }
  return (
    <>
      <Heading
        eyebrow="VIDA ACADÉMICA"
        title="Mi horario"
        desc="Todo tu semestre, en un solo lugar."
        action={
          <Button
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            <Plus size={17} /> Agregar clase
          </Button>
        }
      />
      <div className="schedule-toolbar">
        <Badge tone="rose">Semestre demo · 2026-2027</Badge>
        <span>
          <span className="legend-dot busy" /> Clases{" "}
          <span className="legend-dot available" /> Tiempo libre
        </span>
      </div>
      <div className="day-chips">
        {days.map((d, i) => (
          <button
            className={day === i ? "active" : ""}
            key={d}
            onClick={() => setDay(i)}
          >
            {d.slice(0, 3)}
          </button>
        ))}
      </div>
      <div className="schedule-card">
        <div className="schedule-grid">
          <div className="time-head" />
          {days.map((d, i) => (
            <div key={d} className={"day-head " + (day === i ? "today" : "")}>
              {d}
            </div>
          ))}
          <div className="time-rail" style={{ height: 780 }}>
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} style={{ top: i * 60 - 7 }}>
                {fmt(i + 7)}
              </span>
            ))}
          </div>
          {days.map((d, i) => (
            <div
              key={d}
              className={"schedule-column " + (day === i ? "highlight" : "")}
              style={{ height: 780 }}
            >
              {Array.from({ length: 13 }, (_, j) => (
                <div className="hour-line" key={j} style={{ top: j * 60 }} />
              ))}
              {currentEntries
                .filter((e) => e.day === i)
                .map((e) => (
                  <button
                    key={e.id}
                    className="course-block"
                    style={{
                      top: (e.start - 7) * 60,
                      height: (e.end - e.start) * 60 - 3,
                      background: [
                        "#FBE8E9",
                        "#EDE9FE",
                        "#DBEAFE",
                        "#FEF3C7",
                        "#DCFCE7",
                      ][currentEntries.findIndex((x) => x.id === e.id) % 5],
                    }}
                    onClick={() => {
                      setDay(i);
                      setEdit(e);
                      setOpen(true);
                    }}
                  >
                    <b>{e.title}</b>
                    <span>
                      {fmt(e.start)}–{fmt(e.end)}
                    </span>
                    <small>
                      {e.building} · {e.room}
                    </small>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>
      <p className="subtle-note">
        <ShieldCheck size={16} /> Horario ficticio editable. Los cambios
        actualizan Dragon Match automáticamente.
      </p>
      {open && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-top">
              <h2>{edit ? "Editar clase" : "Agregar clase"}</h2>
              <button className="iconbutton" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={save} className="form">
              <label>
                Nombre de materia
                <input
                  name="title"
                  required
                  defaultValue={edit?.title}
                  placeholder="Programación I"
                />
              </label>
              <label>
                Código
                <input
                  name="code"
                  required
                  defaultValue={edit?.code}
                  placeholder="CMP-101"
                />
              </label>
              <label>
                Día
                <select name="day" defaultValue={edit?.day ?? day}>
                  {days.map((d, i) => (
                    <option value={i} key={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-two">
                <label>
                  Inicio (hora decimal)
                  <input
                    name="start"
                    type="number"
                    min="7"
                    max="20"
                    step="0.25"
                    required
                    defaultValue={edit?.start ?? 9}
                  />
                </label>
                <label>
                  Fin (hora decimal)
                  <input
                    name="end"
                    type="number"
                    min="7"
                    max="20"
                    step="0.25"
                    required
                    defaultValue={edit?.end ?? 10.5}
                  />
                </label>
              </div>
              <div className="form-two">
                <label>
                  Edificio
                  <select
                    name="building"
                    defaultValue={edit?.building ?? "Da Vinci"}
                  >
                    {zones.map((z) => (
                      <option key={z}>{z}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Aula
                  <input
                    name="room"
                    required
                    defaultValue={edit?.room}
                    placeholder="DV-101"
                  />
                </label>
              </div>
              {error && <p className="error">{error}</p>}
              <div className="modal-actions">
                {edit && (
                  <button
                    type="button"
                    className="delete-link"
                    onClick={() => {
                      if (confirm("¿Eliminar esta clase?")) {
                        s.removeEntry(edit.id);
                        setOpen(false);
                      }
                    }}
                  >
                    <Trash2 size={15} /> Eliminar
                  </button>
                )}
                <Button>
                  Guardar clase <Check size={16} />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
function Friends() {
  const s = useApp();
  const [term, setTerm] = useState("");
  const peers = users.filter((u) => u.id !== s.current);
  const friends = peers.filter((u) => isFriend(s, s.current, u.id));
  const results = peers.filter(
    (u) =>
      !isFriend(s, s.current, u.id) &&
      `${u.name} ${u.email} ${u.major}`
        .toLowerCase()
        .includes(term.toLowerCase()),
  );
  const received = s.requests.filter((r) => r.to === s.current);
  return (
    <>
      <Heading
        eyebrow="TU COMUNIDAD"
        title="Mis amigos"
        desc="Los mejores momentos empiezan con una conexión."
        action={
          <Badge tone="purple">
            <Users size={14} /> {friends.length} amigos
          </Badge>
        }
      />
      <div className="friends-grid">
        <div>
          <div className="panel">
            <div className="panel-top">
              <h2>Mis conexiones</h2>
              <Badge>{friends.length} amigos</Badge>
            </div>
            <div className="person-list">
              {friends.length ? (
                friends.map((u) => (
                  <div className="person-row" key={u.id}>
                    <Avatar id={u.id} size={48} />
                    <div className="person-info">
                      <b>{u.name}</b>
                      <small>{u.major}</small>
                      <div className="permission-pills">
                        <Badge
                          tone={
                            canView(s, s.current, u.id, "schedule")
                              ? "green"
                              : "neutral"
                          }
                        >
                          {canView(s, s.current, u.id, "schedule")
                            ? "Horario visible"
                            : "Horario privado"}
                        </Badge>
                        <Badge
                          tone={
                            canView(s, s.current, u.id, "location")
                              ? "green"
                              : "neutral"
                          }
                        >
                          {canView(s, s.current, u.id, "location")
                            ? "Zona visible"
                            : "Zona privada"}
                        </Badge>
                      </div>
                    </div>
                    <button
                      className="iconbutton danger"
                      title="Eliminar amigo"
                      onClick={() => {
                        if (
                          confirm(
                            `¿Eliminar amistad con ${u.name}? Se revocarán los permisos.`,
                          )
                        )
                          s.removeFriend(u.id);
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty">Todavía no tienes amigos agregados.</div>
              )}
            </div>
          </div>
          <div className="panel">
            <div className="panel-top">
              <h2>Buscar estudiantes</h2>
              <Search size={19} />
            </div>
            <div className="searchbox">
              <Search size={19} />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Nombre o correo institucional"
              />
            </div>
            <div className="person-list">
              {results.map((u) => {
                const outgoing = s.requests.some(
                  (r) => r.from === s.current && r.to === u.id,
                );
                const incoming = s.requests.some(
                  (r) => r.from === u.id && r.to === s.current,
                );
                return (
                  <div className="person-row" key={u.id}>
                    <Avatar id={u.id} />
                    <div className="person-info">
                      <b>{u.name}</b>
                      <small>{u.email}</small>
                    </div>
                    {outgoing ? (
                      <button
                        className="smallbutton"
                        onClick={() => s.cancelRequest(s.current, u.id)}
                      >
                        Cancelar
                      </button>
                    ) : incoming ? (
                      <Badge tone="gold">Recibida</Badge>
                    ) : (
                      <button
                        className="smallbutton primary"
                        onClick={() => s.request(u.id)}
                      >
                        <Plus size={15} /> Agregar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div>
          <div className="panel">
            <div className="panel-top">
              <h2>Solicitudes recibidas</h2>
              <Badge tone="rose">
                {received.length} pendiente{received.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            {received.length ? (
              received.map((r) => (
                <div className="request-card" key={r.from}>
                  <Avatar id={r.from} size={52} />
                  <h3>{person(r.from).name}</h3>
                  <p>{person(r.from).major}</p>
                  <p>Quiere conectar contigo</p>
                  <div className="request-actions">
                    <Button onClick={() => s.respondRequest(r.from, true)}>
                      <Check size={16} /> Aceptar
                    </Button>
                    <Button
                      secondary
                      onClick={() => s.respondRequest(r.from, false)}
                    >
                      <X size={16} /> Rechazar
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">
                <CheckCircle2 size={27} />
                <b>¡Todo al día!</b>
                <p>No tienes solicitudes pendientes.</p>
              </div>
            )}
          </div>
          <div className="tip">
            <ShieldCheck size={23} />
            <div>
              <b>Conexiones seguras</b>
              <p>
                Agregar un amigo no activa automáticamente el acceso a tu
                horario ni a tu ubicación. Tú decides.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
function Match() {
  const s = useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const valid = selected.filter((id) => canView(s, s.current, id, "schedule"));
  const members = [s.current, ...valid];
  const blocks = useMemo(
    () => calculate(s.entries, members),
    [s.entries, members.join(":")],
  );
  const [filter, setFilter] = useState("all");
  const [day, setDay] = useState(-1);
  const [chosen, setChosen] = useState<(typeof blocks)[number] | null>(null);
  const [invite, setInvite] = useState<(typeof blocks)[number] | null>(null);
  const [sort, setSort] = useState("day");
  const qualifying = blocks
    .filter(
      (b) =>
        b.status !== "none" &&
        b.end - b.start >= 0.5 &&
        (filter === "all" ||
          b.status === (filter === "all-match" ? "all" : filter)) &&
        (day < 0 || day === b.day),
    )
    .sort((a, b) =>
      sort === "duration"
        ? b.end - b.start - (a.end - a.start)
        : sort === "people"
          ? b.free.length - a.free.length
          : a.day - b.day || a.start - b.start,
    )
    .slice(0, 18);
  function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!invite) return;
    const f = new FormData(e.currentTarget);
    const date = String(f.get("date"));
    if (new Date(date + "T00:00:00").getDay() !== invite.day + 1) {
      alert("La fecha debe corresponder al día de la coincidencia.");
      return;
    }
    if (!invite.free.includes(s.current)) {
      alert("Debes estar libre en este horario para organizar un encuentro.");
      return;
    }
    const participants = invite.free;
    const responses = Object.fromEntries(
      participants
        .filter((x) => x !== s.current)
        .map((id) => [id, "pending" as const]),
    );
    const item: Invite = {
      id: crypto.randomUUID(),
      owner: s.current,
      participants,
      day: invite.day,
      date,
      start: invite.start,
      end: invite.end,
      title: String(f.get("title")),
      zone: String(f.get("zone")),
      responses,
      cancelled: false,
    };
    s.createInvite(item);
    setInvite(null);
    s.notify("Invitación creada");
  }
  function nextDate(day: number) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const offset = (day + 1 - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + offset);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  }
  return (
    <>
      <Heading
        eyebrow="EL CORAZÓN DE DRAGON MATCH"
        title="Encuentra tu Match ✦"
        desc="Superpone horarios y descubre cuándo coincides con tus amigos."
      />
      <div className="match-layout">
        <div className="panel">
          <div className="panel-top">
            <h2>1. Elige a tus amigos</h2>
            <Badge tone="purple">{members.length}/5 participantes</Badge>
          </div>
          <p className="muted">
            Selecciona hasta 4 amigos. Tú estás incluido automáticamente.
          </p>
          <div className="participant">
            <Avatar id={s.current} />
            <div>
              <b>{person(s.current).name} (tú)</b>
              <small>Siempre incluido</small>
            </div>
            <Badge tone="green">✓ Listo</Badge>
          </div>
          {users
            .filter((u) => u.id !== s.current && isFriend(s, s.current, u.id))
            .map((u) => {
              const allowed = canView(s, s.current, u.id, "schedule");
              const active = valid.includes(u.id);
              return (
                <button
                  key={u.id}
                  className={
                    "participant selectable " + (active ? "picked" : "")
                  }
                  disabled={!allowed}
                  onClick={() =>
                    setSelected((prev) =>
                      active
                        ? prev.filter((x) => x !== u.id)
                        : prev.length < 4
                          ? [...prev, u.id]
                          : prev,
                    )
                  }
                >
                  <Avatar id={u.id} />
                  <div>
                    <b>{u.name}</b>
                    <small>
                      {allowed
                        ? "Horario autorizado"
                        : "Horario privado · Activa consentimiento"}
                    </small>
                  </div>
                  <span className={"checkcircle " + (active ? "checked" : "")}>
                    {active ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          <div className="tip slim">
            <ShieldCheck size={19} />
            <div>
              <b>Privacidad primero</b>
              <p>Solo se comparan horarios con consentimiento mutuo.</p>
            </div>
          </div>
        </div>
        <div className="panel match-results">
          <div className="panel-top">
            <div>
              <span className="eyebrow">2. COINCIDENCIAS</span>
              <h2>Matriz de disponibilidad</h2>
            </div>
            <Badge tone="green">Cálculo en tiempo real</Badge>
          </div>
          {valid.length === 0 ? (
            <div className="empty large">
              <HeartHandshake size={47} />
              <h3>La magia empieza aquí</h3>
              <p>
                Selecciona al menos un amigo para descubrir cuándo tienen tiempo
                libre juntos.
              </p>
            </div>
          ) : (
            <>
              <div className="legend">
                <span>
                  <i className="legend-dot green" /> Todos libres
                </span>
                <span>
                  <i className="legend-dot yellow" /> Match parcial
                </span>
                <span>
                  <i className="legend-dot red" /> Sin Match
                </span>
              </div>
              <div className="matrix-scroll">
                <div className="matrix">
                  <div className="matrix-head">Hora</div>
                  {days.map((d) => (
                    <div className="matrix-head" key={d}>
                      {d.slice(0, 3)}
                    </div>
                  ))}
                  {Array.from({ length: 52 }, (_, i) => (
                    <React.Fragment key={i}>
                      <div className="matrix-time">
                        {i % 4 === 0 ? fmt(7 + i / 4) : ""}
                      </div>
                      {days.map((_, d) => {
                        const t = 7 + i / 4;
                        const b = blocks.find(
                          (x) => x.day === d && x.start <= t && x.end > t,
                        )!;
                        return (
                          <button
                            title={`${days[d]} ${fmt(t)}: ${b.free.length} de ${members.length} libres`}
                            onClick={() => setChosen(b)}
                            className={"matrix-cell " + b.status}
                            key={d}
                            aria-label={`${days[d]} ${fmt(t)}: ${b.free.length} libres`}
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              {chosen && (
                <div className="selection-detail">
                  <button
                    className="iconbutton"
                    onClick={() => setChosen(null)}
                  >
                    <X size={16} />
                  </button>
                  <b>
                    {days[chosen.day]} · {fmt(chosen.start)}–{fmt(chosen.end)}
                  </b>
                  <p>
                    {chosen.free.length} de {members.length} participantes
                    libres · {Math.round((chosen.end - chosen.start) * 60)} min
                  </p>
                  <div className="person-chips">
                    {members.map((id) => (
                      <Badge
                        key={id}
                        tone={chosen.free.includes(id) ? "green" : "rose"}
                      >
                        {person(id).name}:{" "}
                        {chosen.free.includes(id) ? "Libre" : "En clase"}
                      </Badge>
                    ))}
                  </div>
                  {chosen.status !== "none" &&
                    chosen.free.includes(s.current) && (
                      <button
                        className="textlink"
                        onClick={() => setInvite(chosen)}
                      >
                        Crear encuentro <ArrowRight size={16} />
                      </button>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {valid.length > 0 && (
        <section className="panel results-panel">
          <div className="panel-top">
            <div>
              <span className="eyebrow">OPORTUNIDADES PARA CONECTAR</span>
              <h2>Coincidencias encontradas</h2>
            </div>
            <Badge tone="green">{qualifying.length} resultados</Badge>
          </div>
          <div className="filters">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Todas las coincidencias</option>
              <option value="all-match">Coincidencias completas</option>
              <option value="partial">Coincidencias parciales</option>
            </select>
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
            >
              <option value={-1}>Toda la semana</option>
              {days.map((d, i) => (
                <option value={i} key={d}>
                  {d}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="day">Ordenar por día</option>
              <option value="duration">Mayor duración</option>
              <option value="people">Más participantes</option>
            </select>
          </div>
          <div className="result-grid">
            {qualifying.map((b, i) => (
              <div className="result-card" key={`${b.day}-${b.start}-${i}`}>
                <Badge tone={b.status === "all" ? "green" : "gold"}>
                  {b.status === "all" ? "✦ Match perfecto" : "◐ Match parcial"}
                </Badge>
                <h3>{days[b.day]}</h3>
                <p>
                  {fmt(b.start)} – {fmt(b.end)}
                </p>
                <div className="duration">
                  <Clock3 size={16} />
                  {Math.round((b.end - b.start) * 60)} minutos libres
                </div>
                <div className="mini-avatars">
                  {b.free.map((id) => (
                    <Avatar key={id} id={id} size={32} />
                  ))}
                </div>
                {b.free.includes(s.current) ? (
                  <button
                    className="outline-action"
                    onClick={() => setInvite(b)}
                  >
                    Crear encuentro <ArrowRight size={15} />
                  </button>
                ) : (
                  <p className="muted small">
                    Tú estás en clase en esta franja.
                  </p>
                )}
              </div>
            ))}
          </div>
          {qualifying.length === 0 && (
            <div className="empty">
              No hay coincidencias con estos filtros. Prueba otros.
            </div>
          )}
        </section>
      )}
      {invite && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setInvite(null);
          }}
        >
          <div className="modal">
            <div className="modal-top">
              <h2>✨ Crear encuentro</h2>
              <button className="iconbutton" onClick={() => setInvite(null)}>
                <X size={20} />
              </button>
            </div>
            <p className="muted">
              {days[invite.day]} · {fmt(invite.start)}–{fmt(invite.end)} ·{" "}
              {invite.free.length} participantes libres
            </p>
            <form className="form" onSubmit={create}>
              <label>
                Nombre del encuentro
                <input
                  name="title"
                  required
                  placeholder="Almuerzo con amigos"
                />
              </label>
              <label>
                Fecha
                <input
                  type="date"
                  name="date"
                  min={new Date().toISOString().slice(0, 10)}
                  defaultValue={nextDate(invite.day)}
                  required
                />
              </label>
              <label>
                Lugar
                <select name="zone">
                  {zones.map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
              </label>
              <div className="modal-actions">
                <Button>
                  <Send size={16} /> Enviar invitación
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
const coords: [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
  [number, number],
  [number, number],
  [number, number],
  [number, number],
  [number, number],
] = [
  [115, 90],
  [325, 80],
  [530, 90],
  [135, 235],
  [325, 240],
  [530, 235],
  [105, 385],
  [325, 395],
  [530, 390],
];
function CampusMap() {
  const s = useApp();
  const [active, setActive] = useState("Biblioteca");
  const visible = users.filter(
    (u) => u.id !== s.current && canView(s, s.current, u.id, "location"),
  );
  return (
    <>
      <Heading
        eyebrow="EXPLORA TU CAMPUS"
        title="Dragon Map"
        desc="Encuentra a tus amigos en las zonas del campus, siempre con su permiso."
      />
      <div className="map-layout">
        <div className="panel map-panel">
          <div className="panel-top">
            <h2>Campus Cumbayá</h2>
            <Badge tone="purple">Mapa conceptual</Badge>
          </div>
          <div className="map-graphic">
            <svg
              viewBox="0 0 650 510"
              role="img"
              aria-label="Mapa conceptual de nueve zonas del campus"
            >
              <defs>
                <pattern
                  id="dots"
                  width="22"
                  height="22"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r="1" fill="#d6dce5" />
                </pattern>
              </defs>
              <rect width="650" height="510" rx="24" fill="#f6f8fa" />
              <rect width="650" height="510" fill="url(#dots)" />
              <path
                d="M115 90 H530 M115 235 H530 M105 385 H530 M115 90 V385 M325 80 V395 M530 90 V390"
                stroke="#e0e5e9"
                strokeWidth="24"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M115 90 H530 M115 235 H530 M105 385 H530 M115 90 V385 M325 80 V395 M530 90 V390"
                stroke="white"
                strokeWidth="13"
                fill="none"
                strokeLinecap="round"
              />
              {zones.map((z, i) => {
                const [x, y] = coords[i];
                const selected = z === active;
                const isHere = s.presence[s.current] === z;
                const here = visible.filter((u) => s.presence[u.id] === z);
                return (
                  <g
                    key={z}
                    onClick={() => setActive(z)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActive(z);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                    role="button"
                    aria-label={`Seleccionar ${z}`}
                    tabIndex={0}
                  >
                    <rect
                      x={x - 87}
                      y={y - 37}
                      width="174"
                      height="74"
                      rx="15"
                      fill={selected ? "#ffe8e9" : "#fff"}
                      stroke={selected ? "#E11B22" : "#dce2e8"}
                      strokeWidth={selected ? 3 : 1.5}
                    />
                    <circle
                      cx={x}
                      cy={y - 13}
                      r="9"
                      fill={selected ? "#E11B22" : "#e3e8ed"}
                    />
                    <text
                      x={x}
                      y={y + 12}
                      textAnchor="middle"
                      fill="#23252c"
                      fontSize="13"
                      fontWeight="700"
                    >
                      {z}
                    </text>
                    {(here.length > 0 || isHere) && (
                      <circle
                        cx={x + 79}
                        cy={y - 32}
                        r="11"
                        fill="#E11B22"
                        stroke="white"
                        strokeWidth="3"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="subtle-note">
            <MapPin size={16} /> Representación ilustrativa; no es un plano
            geográfico oficial ni un localizador GPS.
          </p>
        </div>
        <div className="map-side">
          <section className="panel">
            <span className="eyebrow">TU PRESENCIA</span>
            <h2>¿Dónde estás?</h2>
            <p className="muted">Actualiza manualmente tu zona general.</p>
            <div className="form">
              <label>
                Mi zona
                <select
                  value={s.presence[s.current]}
                  onChange={(e) => s.setZone(e.target.value)}
                >
                  {zones.map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="location-current">
              <MapPin size={18} />
              {s.presence[s.current]}
            </div>
            <p className="muted small">
              Solo los contactos con consentimiento mutuo pueden ver tu zona.
            </p>
          </section>
          <section className="panel">
            <span className="eyebrow">ZONA SELECCIONADA</span>
            <h2>{active}</h2>
            <p className="muted">Zona de encuentro dentro del campus.</p>
            <div className="divider" />
            <h3>Amigos visibles aquí</h3>
            {visible.filter((u) => s.presence[u.id] === active).length ? (
              visible
                .filter((u) => s.presence[u.id] === active)
                .map((u) => (
                  <div className="person-row" key={u.id}>
                    <Avatar id={u.id} />
                    <b>{u.name}</b>
                    <Badge tone="green">Compartiendo zona</Badge>
                  </div>
                ))
            ) : (
              <p className="muted small">
                Ningún amigo ha compartido presencia en esta zona.
              </p>
            )}
          </section>
          <div className="tip">
            <LockKeyhole size={21} />
            <div>
              <b>Ubicación privada</b>
              <p>
                No se recopilan coordenadas, rutas ni historial de movimientos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
function Toggle({
  value,
  onChange,
  label,
  desc,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <div className="toggle-row">
      <div>
        <b>{label}</b>
        {desc && <small>{desc}</small>}
      </div>
      <button
        className={"toggle " + (value ? "on" : "")}
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        aria-label={label}
      >
        <span />
      </button>
    </div>
  );
}
function Profile() {
  const s = useApp();
  const u = person(s.current);
  const [confirmReset, setConfirmReset] = useState(false);
  const friends = users.filter((x) => isFriend(s, s.current, x.id));
  return (
    <>
      <Heading
        eyebrow="TU ESPACIO PERSONAL"
        title="Mi perfil"
        desc="Tu información, tus conexiones y tu privacidad."
      />
      <div className="profile-layout">
        <div>
          <section className="panel profile-card">
            <div className="profile-backdrop" />
            <div className="profile-overlap">
              <Avatar id={u.id} size={90} />
              <h2>{u.name}</h2>
              <p>{u.major}</p>
              <Badge tone="rose">Estudiante USFQ · Demo</Badge>
            </div>
            <div className="profile-info">
              <div>
                <GraduationCap size={18} />
                <span>{u.major}</span>
              </div>
              <div>
                <UserRound size={18} />
                <span>{u.email}</span>
              </div>
              <div>
                <CalendarDays size={18} />
                <span>Período 2026-2027 (demo)</span>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-top">
              <h2>Herramientas demo</h2>
              <Badge>Solo prototipo</Badge>
            </div>
            <p className="muted">
              Cambia de perspectiva para probar consentimientos, solicitudes e
              invitaciones.
            </p>
            <div className="form">
              <label>
                Simular sesión de
                <select
                  value={s.current}
                  onChange={(e) => s.switchUser(e.target.value)}
                >
                  {users.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="profile-buttons">
              <button
                onClick={() => setConfirmReset(true)}
                className="outline-action"
              >
                <RotateCcw size={17} /> Reiniciar datos demo
              </button>
              <button onClick={s.logout} className="outline-action">
                <LogOut size={17} /> Cerrar sesión
              </button>
            </div>
          </section>
        </div>
        <div>
          <section className="panel">
            <div className="panel-top">
              <div>
                <span className="eyebrow">CONTROL TOTAL</span>
                <h2>Privacidad global</h2>
              </div>
              <ShieldCheck color="#16a36b" size={23} />
            </div>
            <p className="muted">
              El acceso requiere permisos mutuos. Puedes revocarlo cuando
              quieras.
            </p>
            <Toggle
              value={s.global[s.current]?.schedule ?? false}
              onChange={(v) => s.setGlobal("schedule", v)}
              label="Compartir mi horario"
              desc="Autorizar consultas con consentimiento mutuo"
            />
            <Toggle
              value={s.global[s.current]?.location ?? false}
              onChange={(v) => s.setGlobal("location", v)}
              label="Compartir mi zona de campus"
              desc="Nunca compartimos coordenadas exactas"
            />
          </section>
          <section className="panel">
            <div className="panel-top">
              <div>
                <span className="eyebrow">PERMISOS INDIVIDUALES</span>
                <h2>Visibilidad por amigo</h2>
              </div>
              <Settings2 size={21} />
            </div>
            {friends.map((f) => (
              <div className="friend-permissions" key={f.id}>
                <div className="friend-permissions-title">
                  <Avatar id={f.id} size={38} />
                  <div>
                    <b>{f.name}</b>
                    <small>{f.major}</small>
                  </div>
                </div>
                <Toggle
                  label="Compartir horario"
                  value={!!s.permissions[`${s.current}:${f.id}:schedule`]}
                  onChange={(v) => s.setPermission(f.id, "schedule", v)}
                />
                <Toggle
                  label="Compartir zona"
                  value={!!s.permissions[`${s.current}:${f.id}:location`]}
                  onChange={(v) => s.setPermission(f.id, "location", v)}
                />
              </div>
            ))}
            {!friends.length && (
              <div className="empty">
                Agrega amigos para configurar permisos.
              </div>
            )}
          </section>
          <section className="panel">
            <h2>Invitaciones recibidas</h2>
            {s.invites.filter((i) => i.participants.includes(s.current))
              .length ? (
              s.invites
                .filter((i) => i.participants.includes(s.current))
                .map((i) => (
                  <div className="invitation-row" key={i.id}>
                    <CalendarPlus size={20} />
                    <div>
                      <b>{i.title}</b>
                      <small>
                        {i.date} · {fmt(i.start)} · {i.zone}
                      </small>
                      <small>
                        {i.cancelled
                          ? "Cancelada"
                          : i.owner === s.current
                            ? "Organizas este encuentro"
                            : i.responses[s.current]}
                      </small>
                    </div>
                    {!i.cancelled &&
                      i.owner !== s.current &&
                      i.responses[s.current] === "pending" && (
                        <div className="inline-actions">
                          <button onClick={() => s.respondInvite(i.id, true)}>
                            <Check size={17} />
                          </button>
                          <button onClick={() => s.respondInvite(i.id, false)}>
                            <X size={17} />
                          </button>
                        </div>
                      )}
                    {i.owner === s.current && !i.cancelled && (
                      <button
                        className="smallbutton"
                        onClick={() => s.cancelInvite(i.id)}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                ))
            ) : (
              <div className="empty">Todavía no hay invitaciones.</div>
            )}
          </section>
        </div>
      </div>
      {confirmReset && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>¿Reiniciar demostración?</h2>
            <p>
              Se restaurarán todos los horarios, permisos, amigos e invitaciones
              iniciales.
            </p>
            <div className="modal-actions">
              <Button secondary onClick={() => setConfirmReset(false)}>
                Volver
              </Button>
              <Button
                onClick={() => {
                  s.reset();
                  setConfirmReset(false);
                }}
              >
                Sí, reiniciar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function App() {
  const logged = useApp((s) => s.logged);
  return (
    <BrowserRouter>
      {!logged ? (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      ) : (
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/horarios" element={<Schedule />} />
            <Route path="/match" element={<Match />} />
            <Route path="/mapa" element={<CampusMap />} />
            <Route path="/amigos" element={<Friends />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </BrowserRouter>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
