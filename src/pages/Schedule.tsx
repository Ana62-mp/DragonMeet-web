import { useState } from 'react';
import { ImagePlus, Plus, ShieldCheck } from 'lucide-react';
import { PersonAvatar, nameOf } from '../components/Avatar';
import { ClassFormModal } from '../components/ClassFormModal';
import { SchedulePhotoDemo } from '../components/SchedulePhotoDemo';
import { Badge, Button, Heading } from '../components/ui';
import { BUSY_LABEL } from '../domain/visibility.ts';
import { ecuadorNow, fmt } from '../domain/time.ts';
import { useFriends } from '../hooks/useFriends';
import { useSchedule } from '../hooks/useSchedule';
import { days, useApp } from '../store';
import type { Entry } from '../types';

const BLOCK_COLORS = ['#FBE8E9', '#EDE9FE', '#DBEAFE', '#FEF3C7', '#DCFCE7'];
const HOURS = 13;

/** One block of the weekly grid. `entry` is only set for the student's own (editable) classes. */
type Block = { id: string; day: number; start: number; end: number; title?: string; building?: string; room?: string; busyOnly: boolean };

export function Schedule() {
  const me = useApp(s => s.me)!;
  const people = useApp(s => s.people);
  const { entries, friendEntries, saveEntry, importEntries, removeEntry } = useSchedule();
  const { friends, accessOf } = useFriends();
  const [day, setDay] = useState(Math.max(ecuadorNow().day, 0));
  const [edit, setEdit] = useState<Entry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [viewing, setViewing] = useState(me.id);

  const sharers = friends.filter(f => accessOf(f.id).schedule);
  const owner = sharers.some(f => f.id === viewing) ? viewing : me.id;
  const isOwn = owner === me.id;
  const ownerPerson = people[owner];
  const blocks: Block[] = isOwn
    ? entries.map(e => ({ ...e, busyOnly: false }))
    : friendEntries.filter(e => e.user === owner);

  const closeForm = () => {
    setFormOpen(false);
    setEdit(null);
  };

  return (
    <>
      <Heading
        eyebrow="VIDA ACADÉMICA"
        title={isOwn ? 'Mi horario' : `Horario de ${nameOf(ownerPerson)}`}
        desc="Todo tu semestre, en un solo lugar."
        action={isOwn && (
          <div className="heading-actions">
            <button className="btn secondary" onClick={() => setImporting(true)}>
              <ImagePlus size={17} /> Importar foto (demo IA)
            </button>
            <Button onClick={() => { setEdit(null); setFormOpen(true); }}>
              <Plus size={17} /> Agregar clase
            </Button>
          </div>
        )}
      />
      <div className="schedule-toolbar">
        <Badge tone="rose">Semestre {me.semester}</Badge>
        {sharers.length > 0 && (
          <select className="viewer-select" aria-label="Horario que quieres ver" value={owner} onChange={e => setViewing(e.target.value)}>
            <option value={me.id}>Mi horario</option>
            {sharers.map(f => <option key={f.id} value={f.id}>Horario de {f.firstName}</option>)}
          </select>
        )}
        <span><span className="legend-dot busy" /> Clases <span className="legend-dot available" /> Tiempo libre</span>
      </div>
      <div className="day-chips">
        {days.map((d, i) => (
          <button className={day === i ? 'active' : ''} key={d} onClick={() => setDay(i)}>{d.slice(0, 3)}</button>
        ))}
      </div>
      <div className="schedule-card">
        <div className="schedule-grid">
          <div className="time-head" />
          {days.map((d, i) => (
            <div key={d} className={'day-head ' + (day === i ? 'today' : 'not-selected')}>{d}</div>
          ))}
          <div className="time-rail" style={{ height: `calc(var(--hour) * ${HOURS})` }}>
            {Array.from({ length: HOURS + 1 }, (_, i) => (
              <span key={i} style={{ top: `calc(var(--hour) * ${i} - 7px)` }}>{fmt(i + 7)}</span>
            ))}
          </div>
          {days.map((d, i) => (
            <div key={d} className={'schedule-column ' + (day === i ? 'highlight' : 'not-selected')} style={{ height: `calc(var(--hour) * ${HOURS})` }}>
              {Array.from({ length: HOURS }, (_, j) => (
                <div className="hour-line" key={j} style={{ top: `calc(var(--hour) * ${j})` }} />
              ))}
              {blocks.filter(b => b.day === i).map(b => {
                const editable = isOwn ? entries.find(x => x.id === b.id) : undefined;
                const tint = ownerPerson?.color ?? '#9CA3AF';
                return (
                  <button
                    key={b.id}
                    className={'course-block' + (editable ? '' : ' static')}
                    style={{
                      top: `calc(var(--hour) * ${b.start - 7})`,
                      height: `calc(var(--hour) * ${b.end - b.start} - 3px)`,
                      background: b.busyOnly ? tint + '22' : BLOCK_COLORS[blocks.findIndex(x => x.id === b.id) % BLOCK_COLORS.length],
                      borderLeftColor: b.busyOnly ? tint : undefined,
                    }}
                    onClick={editable ? () => { setEdit(editable); setFormOpen(true); } : undefined}
                  >
                    <b>{b.busyOnly ? BUSY_LABEL : b.title}</b>
                    <span>{fmt(b.start)}–{fmt(b.end)}</span>
                    {!b.busyOnly && <small>{b.building}{b.room ? ` · ${b.room}` : ''}</small>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {!isOwn && (
        <p className="subtle-note">
          <PersonAvatar person={ownerPerson} size={20} /> Solo ves lo que {nameOf(ownerPerson)} decidió compartir contigo.
        </p>
      )}
      {isOwn && (
        <p className="subtle-note"><ShieldCheck size={16} /> Tus amigos solo ven tus clases según lo que elijas en Perfil &gt; Privacidad.</p>
      )}
      {formOpen && (
        <ClassFormModal
          entry={edit}
          defaultDay={day}
          userId={me.id}
          siblings={entries}
          onSave={async entry => { if (await saveEntry(entry, edit !== null)) closeForm(); }}
          onDelete={async id => { if (await removeEntry(id)) closeForm(); }}
          onClose={closeForm}
        />
      )}
      {importing && (
        <SchedulePhotoDemo
          userId={me.id}
          existing={entries}
          onConfirm={async rows => { if (await importEntries(rows)) setImporting(false); }}
          onClose={() => setImporting(false)}
        />
      )}
    </>
  );
}
