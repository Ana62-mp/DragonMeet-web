import type { ReactNode } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useToasts } from '../lib/toast';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={'badge ' + tone}>{children}</span>;
}

export function Button({ children, onClick, secondary = false, disabled = false, type }: {
  children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean; type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={'btn ' + (secondary ? 'secondary' : '')} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Heading({ eyebrow, title, desc, action }: { eyebrow: string; title: string; desc: string; action?: ReactNode }) {
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

export function Toggle({ value, onChange, label, desc, disabled = false }: {
  value: boolean; onChange: (value: boolean) => void; label: string; desc?: string; disabled?: boolean;
}) {
  return (
    <div className="toggle-row">
      <div>
        <b>{label}</b>
        {desc && <small>{desc}</small>}
      </div>
      <button className={'toggle ' + (value ? 'on' : '')} onClick={() => onChange(!value)} role="switch" aria-checked={value} aria-label={label} disabled={disabled}>
        <span />
      </button>
    </div>
  );
}

/** Tab-like control that keeps long screens short on phones. */
export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { id: T; label: string; badge?: number }[]; onChange: (id: T) => void;
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map(o => (
        <button key={o.id} role="tab" aria-selected={value === o.id} className={value === o.id ? 'active' : ''} onClick={() => onChange(o.id)}>
          {o.label}
          {o.badge ? <i>{o.badge}</i> : null}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ height = 80, width = '100%' }: { height?: number; width?: number | string }) {
  return <div className="skeleton" style={{ height, width }} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Cargando">
      <Skeleton height={150} />
      <div className="skeleton-row">
        <Skeleton height={74} />
        <Skeleton height={74} />
        <Skeleton height={74} />
      </div>
      <Skeleton height={190} />
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon ?? <CheckCircle2 size={28} />}
      <b>{title}</b>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Toaster() {
  const { items, dismiss } = useToasts();
  return (
    <div className="toaster" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className={'toast ' + t.kind} role={t.kind === 'error' ? 'alert' : 'status'}>
          <span>{t.text}</span>
          <button aria-label="Cerrar aviso" onClick={() => dismiss(t.id)}>
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
