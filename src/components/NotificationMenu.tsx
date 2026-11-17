import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarPlus, Check, UserPlus, X } from 'lucide-react';
import { formatMeetDate } from '../domain/meet.ts';
import { fmt } from '../domain/time.ts';
import { zoneLabel } from '../data/campus.ts';
import { useEscape } from '../lib/useEscape';
import { useApp } from '../store';
import { Avatar, nameOf } from './Avatar';

/** The topbar bell: everything waiting for my answer (friend requests and meet invites), answerable right here. */
export function NotificationMenu() {
  const me = useApp(s => s.me);
  const people = useApp(s => s.people);
  const friendships = useApp(s => s.friendships);
  const invites = useApp(s => s.invites);
  const respondRequest = useApp(s => s.respondRequest);
  const respondInvite = useApp(s => s.respondInvite);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const requests = friendships.filter(f => f.status === 'pending' && f.addressee === me?.id);
  const meets = invites.filter(i => !i.cancelled && i.owner !== me?.id && me && i.responses[me.id] === 'pending');
  const count = requests.length + meets.length;

  useEscape(() => setOpen(false), open);
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  const go = (path: string) => { setOpen(false); nav(path); };

  return (
    <div className="notif-menu" ref={box}>
      <button
        className="iconbutton"
        onClick={() => setOpen(o => !o)}
        aria-label={count ? `Notificaciones: ${count} pendientes` : 'Notificaciones'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={20} />
        {count > 0 && <span className="notif" />}
      </button>
      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notificaciones">
          <div className="notif-head"><b>Notificaciones</b>{count > 0 && <span>{count} pendientes</span>}</div>
          {count === 0 && <p className="notif-empty">Estás al día. No tienes nada pendiente.</p>}
          {requests.map(f => (
            <div className="notif-item" key={f.id}>
              <Avatar id={f.requester} size={34} />
              <div>
                <b>{nameOf(people[f.requester])}</b>
                <small><UserPlus size={12} /> Quiere ser tu amigo</small>
              </div>
              <div className="inline-actions">
                <button onClick={() => respondRequest(f.id, true)} aria-label={`Aceptar a ${nameOf(people[f.requester])}`}><Check size={16} /></button>
                <button onClick={() => respondRequest(f.id, false)} aria-label={`Rechazar a ${nameOf(people[f.requester])}`}><X size={16} /></button>
              </div>
            </div>
          ))}
          {meets.map(i => (
            <div className="notif-item" key={i.id}>
              <span className="notif-icon"><CalendarPlus size={17} /></span>
              <div>
                <b>{i.title}</b>
                <small>{nameOf(people[i.owner])} te invita · {formatMeetDate(i.date)} · {fmt(i.start)} · {zoneLabel(i.zone)}</small>
              </div>
              <div className="inline-actions">
                <button onClick={() => respondInvite(i.id, true)} aria-label={`Aceptar «${i.title}»`}><Check size={16} /></button>
                <button onClick={() => respondInvite(i.id, false)} aria-label={`Rechazar «${i.title}»`}><X size={16} /></button>
              </div>
            </div>
          ))}
          <div className="notif-links">
            <button className="textlink" onClick={() => go('/amigos')}>Ver amigos</button>
            <button className="textlink" onClick={() => go('/perfil?tab=meets')}>Ver encuentros</button>
          </div>
        </div>
      )}
    </div>
  );
}
