import { useEffect, useMemo, useState } from 'react';
import { Check, ImagePlus, Trash2, X } from 'lucide-react';
import { CLASS_BUILDINGS } from '../data/campus.ts';
import { DEMO_IMPORT_ROWS, type ImportRow } from '../data/demoImport.ts';
import { validateSlots } from '../domain/schedule.ts';
import { formatMinutes, fromMinutes, parseTime } from '../domain/time.ts';
import { days, type Entry } from '../store';

type Step = 'pick' | 'simulating' | 'review';
type Props = { userId: string; existing: Entry[]; onConfirm: (entries: Entry[]) => void; onClose: () => void };

const SIMULATION_MS = 1400;

/** Demo of a schedule-photo import. The image is previewed locally and never read, uploaded or kept. */
export function SchedulePhotoDemo({ userId, existing, onConfirm, onClose }: Props) {
  const [step, setStep] = useState<Step>('pick');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (step !== 'simulating') return;
    const timer = setTimeout(() => {
      setRows(DEMO_IMPORT_ROWS.map(row => ({ ...row })));
      setStep('review');
    }, SIMULATION_MS);
    return () => clearTimeout(timer);
  }, [step]);

  const errors = useMemo(() => validateSlots(rows, existing), [rows, existing]);
  const canConfirm = rows.length > 0 && errors.every(e => e === null);

  const update = (index: number, patch: Partial<ImportRow>) =>
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  function pickFile(file: File | undefined) {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setStep('simulating');
  }

  function confirm() {
    onConfirm(
      rows.map(r => ({
        id: crypto.randomUUID(),
        user: userId,
        title: r.title,
        code: r.code,
        day: r.day,
        start: fromMinutes(r.startMin),
        end: fromMinutes(r.endMin),
        building: r.building,
        room: r.room,
      })),
    );
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal wide">
        <div className="modal-top">
          <h2>Importar foto (demo IA)</h2>
          <button className="iconbutton" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <p className="tip slim demo-disclaimer">Simulación de IA: esta versión no analiza realmente el contenido de la imagen.</p>

        {step === 'pick' && (
          <label className="dropzone">
            <ImagePlus size={30} />
            <b>Selecciona una foto de tu horario</b>
            <small>PNG o JPG · se queda en tu dispositivo</small>
            <input type="file" accept="image/png,image/jpeg" onChange={e => pickFile(e.target.files?.[0])} />
          </label>
        )}

        {step !== 'pick' && previewUrl && <img className="photo-preview" src={previewUrl} alt="Vista previa local de la foto elegida" />}

        {step === 'simulating' && <p className="simulating" role="status">Simulando reconocimiento de horario...</p>}

        {step === 'review' && (
          <>
            <p className="muted small">Clases de prueba propuestas. Revisa, edita o elimina filas antes de agregarlas.</p>
            <div className="import-rows">
              {rows.map((row, i) => (
                <div className="import-row" key={i}>
                  <input aria-label="Materia" value={row.title} onChange={e => update(i, { title: e.target.value })} />
                  <select aria-label="Día" value={row.day} onChange={e => update(i, { day: Number(e.target.value) })}>
                    {days.map((d, index) => (
                      <option value={index} key={d}>{d}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    aria-label="Inicio"
                    value={formatMinutes(row.startMin)}
                    onChange={e => update(i, { startMin: parseTime(e.target.value) ?? row.startMin })}
                  />
                  <input
                    type="time"
                    aria-label="Fin"
                    value={formatMinutes(row.endMin)}
                    onChange={e => update(i, { endMin: parseTime(e.target.value) ?? row.endMin })}
                  />
                  <select aria-label="Edificio" value={row.building} onChange={e => update(i, { building: e.target.value })}>
                    {CLASS_BUILDINGS.map(b => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                  <input aria-label="Aula (opcional)" placeholder="Aula" value={row.room} onChange={e => update(i, { room: e.target.value })} />
                  <button className="iconbutton danger" aria-label="Eliminar fila" onClick={() => setRows(prev => prev.filter((_, k) => k !== i))}>
                    <Trash2 size={16} />
                  </button>
                  {errors[i] && <p className="error import-error">{errors[i]}</p>}
                </div>
              ))}
              {!rows.length && <div className="empty">No quedan filas por importar.</div>}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>Cancelar</button>
          {step === 'review' && (
            <button className="btn" disabled={!canConfirm} onClick={confirm}>
              Agregar a mi horario <Check size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
