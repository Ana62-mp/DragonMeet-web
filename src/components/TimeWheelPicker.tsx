import { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DAY_END_MIN, DAY_START_MIN, formatMinutes, parseTime } from '../domain/time.ts';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const clamp = (value: number) => Math.min(DAY_END_MIN, Math.max(DAY_START_MIN, value));

type WheelProps = {
  label: string;
  items: number[];
  selected: number;
  disabledFrom?: number;
  onSelect: (item: number) => void;
};

function Wheel({ label, items, selected, disabledFrom = Infinity, onSelect }: WheelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const step = (delta: number) => {
    const next = items[items.indexOf(selected) + delta];
    if (next !== undefined && next < disabledFrom) onSelect(next);
  };

  useEffect(() => {
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (list && option) list.scrollTop = option.offsetTop - (list.clientHeight - option.clientHeight) / 2;
  }, [selected]);

  return (
    <div className="wheel">
      <button type="button" className="wheel-step" aria-label={`${label}: subir`} onClick={() => step(-1)}>
        <ChevronUp size={16} />
      </button>
      <div
        ref={listRef}
        className="wheel-list"
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
          e.preventDefault();
          step(e.key === 'ArrowUp' ? -1 : 1);
        }}
      >
        {items.map(item => (
          <button
            type="button"
            key={item}
            role="option"
            tabIndex={-1}
            aria-selected={item === selected}
            disabled={item >= disabledFrom}
            className={'wheel-option' + (item === selected ? ' selected' : '')}
            onClick={() => onSelect(item)}
          >
            {String(item).padStart(2, '0')}
          </button>
        ))}
      </div>
      <button type="button" className="wheel-step" aria-label={`${label}: bajar`} onClick={() => step(1)}>
        <ChevronDown size={16} />
      </button>
    </div>
  );
}

/** Two-column hour/minute wheel (24 h) with a typed-time fallback. Value is minutes since midnight. */
export function TimeWheelPicker({ label, value, onChange }: { label: string; value: number; onChange: (minutes: number) => void }) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  const setHour = (h: number) => onChange(clamp(h * 60 + (h === 20 ? 0 : minute)));
  const setMinute = (m: number) => onChange(clamp(hour * 60 + m));

  return (
    <fieldset className="time-picker">
      <legend>{label}</legend>
      <div className="wheel-pair">
        <Wheel label={`${label} · hora`} items={HOURS} selected={hour} onSelect={setHour} />
        <span className="wheel-colon">:</span>
        <Wheel label={`${label} · minutos`} items={MINUTES} selected={minute} disabledFrom={hour === 20 ? 1 : Infinity} onSelect={setMinute} />
      </div>
      <output className="wheel-preview">{formatMinutes(value)}</output>
      <input
        type="time"
        className="wheel-typed"
        aria-label={`${label} (escribir HH:MM)`}
        min="07:00"
        max="20:00"
        value={formatMinutes(value)}
        onChange={e => {
          const typed = parseTime(e.target.value);
          if (typed !== null) onChange(clamp(typed));
        }}
      />
    </fieldset>
  );
}
