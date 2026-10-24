import { CAMPUS_ZONES, zoneLabel } from '../data/campus.ts';
import type { Person } from '../types';
import { initialsOf } from './Avatar';

/** Illustrative, hand-drawn layout inspired by the campus plan. Not georeferenced and not official. */
type Shape = { d: string; cx: number; cy: number; kind: 'building' | 'open' | 'green' };

/** Rotated rectangle as an SVG path (corners are softened by a round line join). */
function box(cx: number, cy: number, w: number, h: number, deg = 0): string {
  const rad = (deg * Math.PI) / 180;
  const [cos, sin] = [Math.cos(rad), Math.sin(rad)];
  const corners = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => `${(cx + (x / 2) * cos - (y / 2) * sin).toFixed(1)} ${(cy + (x / 2) * sin + (y / 2) * cos).toFixed(1)}`);
  return `M${corners.join(' L')} Z`;
}
const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`;

const ZONE_SHAPES: Record<string, Shape> = {
  epicuro: { d: box(95, 95, 92, 62, -6), cx: 95, cy: 95, kind: 'building' },
  biblioteca: { d: box(100, 205, 112, 72, 4), cx: 100, cy: 205, kind: 'building' },
  'hall-espejo': { d: box(215, 305, 104, 64, -4), cx: 215, cy: 305, kind: 'building' },
  'da-vinci': { d: box(272, 95, 122, 64, -5), cx: 272, cy: 95, kind: 'building' },
  newton: { d: box(412, 105, 102, 68, 3), cx: 412, cy: 105, kind: 'building' },
  einstein: { d: box(392, 207, 106, 64, -4), cx: 392, cy: 207, kind: 'building' },
  galileo: { d: box(522, 217, 98, 72, 5), cx: 522, cy: 217, kind: 'building' },
  darwin: { d: box(545, 312, 94, 62, -6), cx: 545, cy: 312, kind: 'building' },
  maxwell: { d: box(402, 332, 94, 66, 4), cx: 402, cy: 332, kind: 'building' },
  hayek: { d: 'M706 150 H850 V250 H872 V344 H706 Z', cx: 786, cy: 248, kind: 'building' },
  cuadrangulos: { d: 'M50 395 C120 372 250 380 330 392 L345 505 C240 535 120 530 55 510 Z', cx: 195, cy: 455, kind: 'green' },
  'plaza-maxwell': { d: ellipse(440, 442, 72, 40), cx: 440, cy: 442, kind: 'open' },
  'plaza-academica': { d: ellipse(275, 215, 56, 34), cx: 275, cy: 215, kind: 'open' },
};

/** Context-only buildings: drawn for realism, not selectable. */
const SILHOUETTES = [
  { label: 'Lao Tse', d: box(176, 80, 44, 40, 4), cx: 176, cy: 80 },
  { label: 'Aristóteles', d: box(200, 152, 52, 40, -3), cx: 200, cy: 152 },
  { label: 'Sócrates', d: box(312, 152, 52, 36, 3), cx: 312, cy: 152 },
  { label: 'Mozart', d: box(572, 110, 56, 44, -4), cx: 572, cy: 110 },
  { label: 'M. de Santiago', d: box(95, 305, 62, 44, 2), cx: 95, cy: 305 },
];

const GARDENS = [ellipse(172, 244, 22, 14), ellipse(470, 150, 32, 14), ellipse(592, 385, 42, 24)];
const PATHS =
  'M140 130 C200 160 300 150 410 140 M272 126 L275 181 M275 249 C270 270 240 290 215 272 M130 240 C160 300 120 340 130 385 M440 207 L472 217 M568 217 C600 230 600 235 600 235 M275 249 C330 290 360 300 400 330 M402 365 C402 380 410 395 430 402 M545 343 C520 370 500 390 480 405 M586 312 C600 290 600 260 600 235 M600 235 L706 235';

type Props = {
  active: string;
  /** Zone the signed-in student has confirmed as their own, if any. */
  selfZone: string | null;
  /** Only friends already authorized to be seen. */
  friendsByZone: Record<string, Person[]>;
  onSelect: (zoneId: string) => void;
};

const MAX_MARKERS = 3;

function Label({ text, x, y }: { text: string; x: number; y: number }) {
  const words = text.length > 9 && text.includes(' ') ? [text.slice(0, text.indexOf(' ')), text.slice(text.indexOf(' ') + 1)] : [text];
  return (
    <text className="zone-label" x={x} y={y - (words.length - 1) * 8} textAnchor="middle">
      {words.map((w, i) => (
        <tspan key={w} x={x} dy={i === 0 ? 0 : 16}>{w}</tspan>
      ))}
    </text>
  );
}

export function CampusSvgMap({ active, selfZone, friendsByZone, onSelect }: Props) {
  return (
    <svg viewBox="0 0 900 560" role="group" aria-label="Mapa ilustrativo del campus Cumbayá" className="campus-map">
      <rect width="900" height="560" rx="24" fill="#f4f6f4" />
      {/* ravine crossed by the bridge towards Complejo Hayek */}
      <path d="M612 0 C640 120 600 200 640 280 C676 350 640 460 668 560 H700 C676 460 710 350 676 280 C640 200 676 110 644 0 Z" fill="#dbe8f1" />
      {GARDENS.map(d => <path key={d} d={d} fill="#dcebd2" />)}
      <path d={PATHS} stroke="#e1e6ea" strokeWidth="15" fill="none" strokeLinecap="round" />
      <path d={PATHS} stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" />
      {SILHOUETTES.map(b => (
        <g key={b.label} aria-hidden="true">
          <path d={b.d} fill="#eceff2" stroke="#d5dbe1" strokeWidth="1.5" strokeLinejoin="round" />
          <text className="silhouette-label" x={b.cx} y={b.cy + 4} textAnchor="middle">{b.label}</text>
        </g>
      ))}
      {CAMPUS_ZONES.map(zone => {
        const shape = ZONE_SHAPES[zone.id];
        const here = friendsByZone[zone.id] ?? [];
        const selected = zone.id === active;
        return (
          <g
            key={zone.id}
            className={`zone zone-${shape.kind}${selected ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={`${zoneLabel(zone.id)}${here.length ? `, ${here.length} amigo${here.length > 1 ? 's' : ''} visible${here.length > 1 ? 's' : ''}` : ''}`}
            onClick={() => onSelect(zone.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(zone.id);
              }
            }}
          >
            <path className="zone-shape" d={shape.d} strokeLinejoin="round" />
            <Label text={zone.label} x={shape.cx} y={shape.cy - 4} />
            {here.slice(0, MAX_MARKERS).map((person, i, shown) => (
              <g key={person.id} transform={`translate(${shape.cx + (i - (shown.length - 1) / 2) * 24} ${shape.cy + 20})`}>
                <circle r="10" fill={person.color} stroke="#fff" strokeWidth="2" />
                <text className="marker-text" textAnchor="middle" dy="3.5">{initialsOf(person)}</text>
              </g>
            ))}
            {selfZone === zone.id && (
              <circle className="self-pin" cx={shape.cx + (shape.kind === 'green' ? 120 : 40)} cy={shape.cy - (shape.kind === 'green' ? 48 : 30)} r="8">
                <title>Tú</title>
              </circle>
            )}
          </g>
        );
      })}
      {/* bridge between the main campus and Complejo Hayek */}
      <g aria-hidden="true">
        <rect x="592" y="224" width="120" height="24" rx="4" fill="#fff" stroke="#c9d1d8" strokeWidth="1.5" />
        <path d="M592 228 H712 M592 244 H712" stroke="#c9d1d8" strokeWidth="1.5" />
        <text className="silhouette-label" x="652" y="268" textAnchor="middle">Puente</text>
      </g>
    </svg>
  );
}
