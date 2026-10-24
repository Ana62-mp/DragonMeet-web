import React, { useState } from 'react';
import { ArrowRight, Clock3, HeartHandshake, Send, ShieldCheck, X } from 'lucide-react';
import { Avatar, nameOf } from '../components/Avatar';
import { Badge, Button, EmptyState, Heading } from '../components/ui';
import { CAMPUS_ZONES } from '../data/campus.ts';
import { fmt } from '../domain/time.ts';
import { useFriends } from '../hooks/useFriends';
import { useSchedule } from '../hooks/useSchedule';
import { toast } from '../lib/toast';
import { calculate, days, useApp } from '../store';

type Block = ReturnType<typeof calculate>[number];

const MAX_FRIENDS = 4;
const MIN_BLOCK_HOURS = 0.5;

/** Next calendar date (ISO) that falls on the given weekday (0 = Monday). */
function nextDate(day: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + ((day + 1 - d.getDay() + 7) % 7));
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

const minutesOf = (hours: number) => Math.round(hours * 60);

export function Match() {
  const me = useApp(s => s.me)!;
  const people = useApp(s => s.people);
  const createInvite = useApp(s => s.createInvite);
  const { allBusy } = useSchedule();
  const { friends, accessOf } = useFriends();
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState('all');
  const [day, setDay] = useState(-1);
  const [sort, setSort] = useState('day');
  const [chosen, setChosen] = useState<Block | null>(null);
  const [invite, setInvite] = useState<Block | null>(null);

  const valid = selected.filter(id => accessOf(id).schedule);
  const members = [me.id, ...valid];
  const blocks = calculate(allBusy, members);

  const qualifying = blocks
    .filter(b => b.status !== 'none' && b.end - b.start >= MIN_BLOCK_HOURS
      && (filter === 'all' || b.status === (filter === 'all-match' ? 'all' : filter)) && (day < 0 || day === b.day))
    .sort((a, b) => sort === 'duration' ? b.end - b.start - (a.end - a.start) : sort === 'people' ? b.free.length - a.free.length : a.day - b.day || a.start - b.start)
    .slice(0, 18);

  async function submitInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!invite) return;
    const f = new FormData(e.currentTarget);
    const date = String(f.get('date'));
    if (new Date(`${date}T00:00:00`).getDay() !== invite.day + 1) return toast.error('La fecha debe corresponder al día de la coincidencia.');
    if (!invite.free.includes(me.id)) return toast.error('Debes estar libre en este horario para organizar un encuentro.');
    const ok = await createInvite(
      { title: String(f.get('title')), date, start: invite.start, end: invite.end, zone: String(f.get('zone')) },
      invite.free.filter(id => id !== me.id),
    );
    if (ok) setInvite(null);
  }

  return (
    <>
      <Heading eyebrow="EL CORAZÓN DE DRAGONMEET" title="Encuentra tu Match ✦" desc="Superpone horarios y descubre cuándo coincides con tus amigos." />
      <div className="match-layout">
        <div className="panel">
          <div className="panel-top">
            <h2>1. Elige a tus amigos</h2>
            <Badge tone="purple">{members.length}/5</Badge>
          </div>
          <p className="muted">Selecciona hasta {MAX_FRIENDS} amigos. Tú estás incluido.</p>
          <div className="participant">
            <Avatar id={me.id} />
            <div><b>{me.firstName} (tú)</b><small>Siempre incluido</small></div>
            <Badge tone="green">✓ Listo</Badge>
          </div>
          {friends.map(p => {
            const allowed = accessOf(p.id).schedule;
            const active = valid.includes(p.id);
            return (
              <button
                key={p.id}
                className={'participant selectable ' + (active ? 'picked' : '')}
                disabled={!allowed}
                onClick={() => setSelected(prev => active ? prev.filter(x => x !== p.id) : prev.length < MAX_FRIENDS ? [...prev, p.id] : prev)}
              >
                <Avatar id={p.id} />
                <div>
                  <b className="truncate">{p.firstName}</b>
                  <small>{allowed ? 'Horario autorizado' : 'Horario privado · aún no comparte'}</small>
                </div>
                <span className={'checkcircle ' + (active ? 'checked' : '')}>{active ? '✓' : ''}</span>
              </button>
            );
          })}
          {!friends.length && <EmptyState title="Aún no tienes amigos" text="Agrégalos en la sección Amigos." />}
          <div className="tip slim">
            <ShieldCheck size={19} />
            <div><b>Privacidad primero</b><p>Solo se comparan horarios con consentimiento mutuo.</p></div>
          </div>
        </div>

        <div className="panel match-results">
          <div className="panel-top">
            <div><span className="eyebrow">2. COINCIDENCIAS</span><h2>Matriz de disponibilidad</h2></div>
            <Badge tone="green">Tiempo real</Badge>
          </div>
          {valid.length === 0 ? (
            <div className="empty large">
              <HeartHandshake size={47} />
              <h3>La magia empieza aquí</h3>
              <p>Selecciona al menos un amigo para descubrir cuándo tienen tiempo libre juntos.</p>
            </div>
          ) : (
            <>
              <div className="legend">
                <span><i className="legend-dot green" /> Todos libres</span>
                <span><i className="legend-dot yellow" /> Match parcial</span>
                <span><i className="legend-dot red" /> Sin Match</span>
              </div>
              <div className="matrix-scroll">
                <div className="matrix">
                  <div className="matrix-head">Hora</div>
                  {days.map(d => <div className="matrix-head" key={d}>{d.slice(0, 3)}</div>)}
                  {Array.from({ length: 52 }, (_, i) => (
                    <React.Fragment key={i}>
                      <div className="matrix-time">{i % 4 === 0 ? fmt(7 + i / 4) : ''}</div>
                      {days.map((_, d) => {
                        const t = 7 + i / 4;
                        const b = blocks.find(x => x.day === d && x.start <= t && x.end > t)!;
                        return (
                          <button
                            title={`${days[d]} ${fmt(t)}: ${b.free.length} de ${members.length} libres`}
                            onClick={() => setChosen(b)}
                            className={'matrix-cell ' + b.status}
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
                  <button className="iconbutton" onClick={() => setChosen(null)} aria-label="Cerrar detalle"><X size={16} /></button>
                  <b>{days[chosen.day]} · {fmt(chosen.start)}–{fmt(chosen.end)}</b>
                  <p>{chosen.free.length} de {members.length} libres · {minutesOf(chosen.end - chosen.start)} min</p>
                  <div className="person-chips">
                    {members.map(id => (
                      <Badge key={id} tone={chosen.free.includes(id) ? 'green' : 'rose'}>
                        {nameOf(people[id])}: {chosen.free.includes(id) ? 'Libre' : 'En clase'}
                      </Badge>
                    ))}
                  </div>
                  {chosen.status !== 'none' && chosen.free.includes(me.id) && (
                    <button className="textlink" onClick={() => setInvite(chosen)}>Crear encuentro <ArrowRight size={16} /></button>
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
            <div><span className="eyebrow">OPORTUNIDADES PARA CONECTAR</span><h2>Coincidencias encontradas</h2></div>
            <Badge tone="green">{qualifying.length} resultados</Badge>
          </div>
          <div className="filters">
            <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="Tipo de coincidencia">
              <option value="all">Todas las coincidencias</option>
              <option value="all-match">Coincidencias completas</option>
              <option value="partial">Coincidencias parciales</option>
            </select>
            <select value={day} onChange={e => setDay(Number(e.target.value))} aria-label="Día">
              <option value={-1}>Toda la semana</option>
              {days.map((d, i) => <option value={i} key={d}>{d}</option>)}
            </select>
            <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Orden">
              <option value="day">Ordenar por día</option>
              <option value="duration">Mayor duración</option>
              <option value="people">Más participantes</option>
            </select>
          </div>
          <div className="result-grid">
            {qualifying.map((b, i) => (
              <div className="result-card" key={`${b.day}-${b.start}-${i}`}>
                <Badge tone={b.status === 'all' ? 'green' : 'gold'}>{b.status === 'all' ? '✦ Match perfecto' : '◐ Match parcial'}</Badge>
                <h3>{days[b.day]}</h3>
                <p>{fmt(b.start)} – {fmt(b.end)}</p>
                <div className="duration"><Clock3 size={16} />{minutesOf(b.end - b.start)} min libres</div>
                <div className="mini-avatars">{b.free.map(id => <Avatar key={id} id={id} size={32} />)}</div>
                {b.free.includes(me.id)
                  ? <button className="outline-action" onClick={() => setInvite(b)}>Crear encuentro <ArrowRight size={15} /></button>
                  : <p className="muted small">Tú estás en clase en esta franja.</p>}
              </div>
            ))}
          </div>
          {qualifying.length === 0 && <div className="empty">No hay coincidencias con estos filtros. Prueba otros.</div>}
        </section>
      )}

      {invite && (
        <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setInvite(null)}>
          <div className="modal">
            <div className="modal-top">
              <h2>✨ Crear encuentro</h2>
              <button className="iconbutton" onClick={() => setInvite(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <p className="muted">{days[invite.day]} · {fmt(invite.start)}–{fmt(invite.end)} · {invite.free.length} participantes libres</p>
            <form className="form" onSubmit={submitInvite}>
              <label>Nombre del encuentro<input name="title" required placeholder="Almuerzo con amigos" /></label>
              <label>Fecha<input type="date" name="date" min={new Date().toISOString().slice(0, 10)} defaultValue={nextDate(invite.day)} required /></label>
              <label>Lugar
                <select name="zone">
                  {CAMPUS_ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
                </select>
              </label>
              <div className="modal-actions"><Button type="submit"><Send size={16} /> Enviar invitación</Button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
