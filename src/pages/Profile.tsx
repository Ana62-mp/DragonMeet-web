import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarArrowDown as CalendarDown, CalendarPlus, Check, GraduationCap, Hash, LogOut, Mail, Settings2, ShieldCheck, X } from 'lucide-react';
import { Avatar, PersonAvatar, nameOf } from '../components/Avatar';
import { Badge, Button, EmptyState, Segmented, Toggle } from '../components/ui';
import { CAREERS } from '../data/campus.ts';
import { ecuadorNow, formatMinutes, fmt, isUpcoming, parseTime } from '../domain/time.ts';
import { RESPONSE_LABEL, formatMeetDate, meetToIcs } from '../domain/meet.ts';
import { downloadText } from '../lib/download';
import { useFriends } from '../hooks/useFriends';
import { useSimulatedClock } from '../lib/useClock';
import { zoneLabel } from '../data/campus.ts';
import { days, useApp } from '../store';
import type { Invite, Me, ScheduleDisclosure } from '../types';

type Tab = 'privacy' | 'friends' | 'meets' | 'prefs';
const TABS: Tab[] = ['privacy', 'friends', 'meets', 'prefs'];

const COLORS = ['#E11B22', '#8B5CF6', '#3B82F6', '#EC4899', '#F97316', '#10B981', '#0EA5E9', '#EAB308'];

function PrivacyTab({ me }: { me: Me }) {
  const updateProfile = useApp(s => s.updateProfile);
  const setOnCampus = useApp(s => s.setOnCampus);
  return (
    <section className="panel">
      <p className="muted">Todo empieza en privado. El acceso requiere permiso mutuo y puedes revocarlo cuando quieras.</p>
      <Toggle value={me.shareSchedule} onChange={v => updateProfile({ shareSchedule: v })} label="Compartir mi horario" desc="Autorizar consultas con consentimiento mutuo" />
      <div className="toggle-row">
        <div>
          <b>Qué ven mis amigos de mis clases</b>
          <small>Tú siempre ves tus clases completas</small>
        </div>
        <select
          className="disclosure-select"
          aria-label="Qué ven mis amigos de mis clases"
          value={me.disclosure}
          disabled={!me.shareSchedule}
          onChange={e => updateProfile({ disclosure: e.target.value as ScheduleDisclosure })}
        >
          <option value="DETAILS">Materia y horario</option>
          <option value="BUSY_ONLY">Solo bloques ocupados</option>
        </select>
      </div>
      <Toggle value={me.shareLocation} onChange={v => updateProfile({ shareLocation: v })} label="Compartir mi zona de campus" desc="Nunca compartimos coordenadas exactas" />
      <Toggle value={me.onCampus} onChange={setOnCampus} label="Estoy en campus" desc={me.zone ? `Zona actual: ${zoneLabel(me.zone)}` : 'Elige tu zona en Dragon Map'} />
    </section>
  );
}

function FriendsTab() {
  const { friends, grantedTo, setPermission } = useFriends();
  if (!friends.length) return <section className="panel"><EmptyState title="Agrega amigos" text="Aquí configurarás qué comparte contigo cada persona." /></section>;
  return (
    <section className="panel">
      <p className="muted">Lo que compartes con cada amigo. Se aplica de inmediato.</p>
      {friends.map(f => {
        const granted = grantedTo(f.id);
        return (
          <div className="friend-permissions" key={f.id}>
            <div className="friend-permissions-title">
              <PersonAvatar person={f} size={36} />
              <div className="person-info">
                <b className="truncate">{f.fullName}</b>
                <small className="truncate">{f.career}</small>
              </div>
            </div>
            <div className="perm-grid">
              <PermSwitch label="Horario" value={granted.schedule} onChange={v => setPermission(f.id, { schedule: v })} />
              <PermSwitch label="Zona" value={granted.location} onChange={v => setPermission(f.id, { location: v })} />
            </div>
          </div>
        );
      })}
    </section>
  );
}

function PermSwitch({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="perm-switch">
      <span>{label}</span>
      <button className={'toggle ' + (value ? 'on' : '')} role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)}>
        <span />
      </button>
    </div>
  );
}

function MeetRow({ invite: i, me }: { invite: Invite; me: Me }) {
  const people = useApp(s => s.people);
  const respondInvite = useApp(s => s.respondInvite);
  const cancelInvite = useApp(s => s.cancelInvite);
  const owner = i.owner === me.id;
  const mine = i.responses[me.id];
  const going = !i.cancelled && (owner || mine === 'accepted');
  const upcoming = isUpcoming(i.date, i.end);
  const status = i.cancelled ? 'Cancelado' : owner ? 'Organizas este encuentro' : `Tu respuesta: ${RESPONSE_LABEL[mine]}`;
  const invitees = Object.entries(i.responses);

  return (
    <div className={'invitation-row meet-row' + (upcoming ? '' : ' past')}>
      <CalendarPlus size={20} />
      <div>
        <b>{i.title}</b>
        <small>{formatMeetDate(i.date)} · {fmt(i.start)}–{fmt(i.end)} · {zoneLabel(i.zone)}</small>
        <small>{status}{!owner && ` · organiza ${nameOf(people[i.owner])}`}</small>
        {owner && invitees.length > 0 && (
          <div className="person-chips meet-chips">
            {invitees.map(([id, response]) => (
              <Badge key={id} tone={response === 'accepted' ? 'green' : response === 'rejected' ? 'rose' : undefined}>
                {nameOf(people[id])}: {RESPONSE_LABEL[response]}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {upcoming && !i.cancelled && !owner && mine === 'pending' && (
        <div className="inline-actions">
          <button onClick={() => respondInvite(i.id, true)} aria-label="Aceptar"><Check size={17} /></button>
          <button onClick={() => respondInvite(i.id, false)} aria-label="Rechazar"><X size={17} /></button>
        </div>
      )}
      {upcoming && going && (
        <div className="meet-actions">
          <button
            className="smallbutton"
            onClick={() => downloadText(`encuentro-${i.date}.ics`, meetToIcs(i, zoneLabel(i.zone)), 'text/calendar')}
            aria-label={`Agregar «${i.title}» a mi calendario`}
          >
            <CalendarDown size={13} /> Calendario
          </button>
          {owner && <button className="smallbutton" onClick={() => cancelInvite(i.id)}>Cancelar</button>}
        </div>
      )}
    </div>
  );
}

function MeetsTab({ me }: { me: Me }) {
  const invites = useApp(s => s.invites);
  const mine = invites
    .filter(i => i.owner === me.id || me.id in i.responses)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  const upcoming = mine.filter(i => isUpcoming(i.date, i.end));
  const past = mine.filter(i => !isUpcoming(i.date, i.end)).reverse();
  if (!mine.length) return <section className="panel"><EmptyState icon={<CalendarPlus size={28} />} title="Sin encuentros todavía" text="Crea uno desde Match." /></section>;
  return (
    <section className="panel">
      <h3 className="meet-group">Próximos</h3>
      {upcoming.length ? upcoming.map(i => <MeetRow key={i.id} invite={i} me={me} />) : <p className="muted small">No tienes encuentros próximos. Crea uno desde Match.</p>}
      {past.length > 0 && (
        <details className="meet-past">
          <summary>Pasados ({past.length})</summary>
          {past.map(i => <MeetRow key={i.id} invite={i} me={me} />)}
        </details>
      )}
    </section>
  );
}

function ClockSimulator() {
  const clock = useSimulatedClock(s => s.clock);
  const setClock = useSimulatedClock(s => s.set);
  const [day, setDay] = useState(Math.max(ecuadorNow().day, 0));
  const [time, setTime] = useState('10:00');
  const minutes = parseTime(time);
  return (
    <div className="form">
      <label>
        Simular día y hora (Ecuador)
        <div className="form-two">
          <select value={day} onChange={e => setDay(Number(e.target.value))}>
            {days.map((d, i) => <option value={i} key={d}>{d}</option>)}
          </select>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
      </label>
      <div className="profile-buttons">
        <button className="outline-action" disabled={minutes === null} onClick={() => minutes !== null && setClock({ day, minutes })}>Aplicar simulación</button>
        {clock && <button className="outline-action" onClick={() => setClock(null)}>Usar hora real (activa: {days[clock.day]} {formatMinutes(clock.minutes)})</button>}
      </div>
      <p className="muted small">Solo afecta al panel «Ahora en campus». El reloj real no cambia.</p>
    </div>
  );
}

function PrefsTab({ me }: { me: Me }) {
  const updateProfile = useApp(s => s.updateProfile);
  const [color, setColor] = useState(me.color);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    await updateProfile({
      fullName: String(f.get('fullName')).trim(), firstName: String(f.get('firstName')).trim(),
      career: String(f.get('career')).trim(), semester: Number(f.get('semester')), color,
    }, 'Perfil actualizado');
    setBusy(false);
  }

  return (
    <>
      <section className="panel">
        <div className="panel-top"><h2>Mis datos</h2><Settings2 size={20} /></div>
        <form className="form" onSubmit={save}>
          <label>Nombre completo<input name="fullName" required minLength={3} defaultValue={me.fullName} /></label>
          <div className="form-two">
            <label>Nombre para el saludo<input name="firstName" required defaultValue={me.firstName} /></label>
            <label>Semestre<input name="semester" type="number" min={1} max={14} required defaultValue={me.semester} /></label>
          </div>
          <label>Carrera<input name="career" required list="careers" defaultValue={me.career} /></label>
          <datalist id="careers">{CAREERS.map(c => <option key={c} value={c} />)}</datalist>
          <div className="swatches" role="radiogroup" aria-label="Color de avatar">
            {COLORS.map(c => (
              <button type="button" key={c} role="radio" aria-checked={color === c} aria-label={c} className={color === c ? 'picked' : ''} style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
          <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</Button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-top"><h2>Herramientas de demo</h2><Badge>Solo prototipo</Badge></div>
        <ClockSimulator />
      </section>
    </>
  );
}

export function Profile() {
  const me = useApp(s => s.me)!;
  const signOut = useApp(s => s.signOut);
  const incoming = useApp(s => s.invites.filter(i => !i.cancelled && i.responses[s.me?.id ?? ''] === 'pending').length);
  // The tab lives in the URL (?tab=meets) so the notification bell can open it directly.
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'privacy';
  const setTab = (next: Tab) => setParams(next === 'privacy' ? {} : { tab: next }, { replace: true });

  return (
    <>
      <section className="panel profile-head">
        <Avatar id={me.id} size={64} />
        <div className="profile-head-info">
          <h2 className="truncate">{me.fullName}</h2>
          <p className="truncate"><GraduationCap size={14} /> {me.career} · {me.semester}.º semestre</p>
          <div className="profile-chips">
            <span className="truncate"><Mail size={13} /> {me.email}</span>
            <span><Hash size={13} /> Banner {me.bannerCode}</span>
          </div>
        </div>
      </section>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { id: 'privacy', label: 'Privacidad' },
          { id: 'friends', label: 'Amigos' },
          { id: 'meets', label: 'Encuentros', badge: incoming },
          { id: 'prefs', label: 'Preferencias' },
        ]}
      />
      {tab === 'privacy' && <PrivacyTab me={me} />}
      {tab === 'friends' && <FriendsTab />}
      {tab === 'meets' && <MeetsTab me={me} />}
      {tab === 'prefs' && <PrefsTab me={me} />}
      <button className="outline-action logout" onClick={signOut}>
        <LogOut size={17} /> Cerrar sesión
      </button>
      <p className="subtle-note"><ShieldCheck size={16} /> Prototipo académico: no es una app oficial de USFQ.</p>
    </>
  );
}
