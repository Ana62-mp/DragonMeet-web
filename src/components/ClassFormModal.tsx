import { useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { CLASS_BUILDINGS, normalizeBuilding } from '../data/campus.ts';
import { validateSlot } from '../domain/schedule.ts';
import { fromMinutes, toMinutes } from '../domain/time.ts';
import { days } from '../store';
import type { Entry } from '../types';
import { TimeWheelPicker } from './TimeWheelPicker.tsx';

type Props = {
  entry: Entry | null;
  defaultDay: number;
  userId: string;
  siblings: Entry[];
  onSave: (entry: Entry) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

/** Add/edit class dialog. Times are edited in minutes and stored back as decimal hours. */
export function ClassFormModal({ entry, defaultDay, userId, siblings, onSave, onDelete, onClose }: Props) {
  const [startMin, setStartMin] = useState(entry ? toMinutes(entry.start) : 9 * 60);
  const [endMin, setEndMin] = useState(entry ? toMinutes(entry.end) : 10 * 60 + 30);
  const [error, setError] = useState('');

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const day = Number(f.get('day'));
    const building = String(f.get('building'));
    const problem = validateSlot({ day, startMin, endMin, building }, siblings.filter(x => x.id !== entry?.id));
    if (problem) return setError(problem);
    onSave({
      id: entry?.id ?? crypto.randomUUID(),
      user: userId,
      title: String(f.get('title')),
      code: String(f.get('code')),
      day,
      start: fromMinutes(startMin),
      end: fromMinutes(endMin),
      building,
      room: String(f.get('room')),
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-top">
          <h2>{entry ? 'Editar clase' : 'Agregar clase'}</h2>
          <button className="iconbutton" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="form">
          <label>
            Nombre de materia
            <input name="title" required defaultValue={entry?.title} placeholder="Programación I" />
          </label>
          <label>
            Código
            <input name="code" required defaultValue={entry?.code} placeholder="CMP-101" />
          </label>
          <label>
            Día
            <select name="day" defaultValue={entry?.day ?? defaultDay}>
              {days.map((d, i) => (
                <option value={i} key={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <div className="form-two">
            <TimeWheelPicker label="Inicio" value={startMin} onChange={setStartMin} />
            <TimeWheelPicker label="Fin" value={endMin} onChange={setEndMin} />
          </div>
          <div className="form-two">
            <label>
              Edificio
              <select name="building" defaultValue={normalizeBuilding(entry?.building ?? '')}>
                {CLASS_BUILDINGS.map(b => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
            <label>
              Aula
              <input name="room" required defaultValue={entry?.room} placeholder="DV-101" />
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            {entry && (
              <button
                type="button"
                className="delete-link"
                onClick={() => confirm('¿Eliminar esta clase?') && onDelete(entry.id)}
              >
                <Trash2 size={15} /> Eliminar
              </button>
            )}
            <button className="btn">
              Guardar clase <Check size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
